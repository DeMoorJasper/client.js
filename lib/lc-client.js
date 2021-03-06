var Planner = require('csa').BasicCSA,
  TimespanPlanner = require('csa').TimespanCSA,
  LDFetch = require('ldfetch'),
  Fetcher = require('./Fetcher');

var Client = function (config) {
  // Validate config
  this._config = config;
  this._numberOfQueries = 0; //Number of queries being ran
  //Create an HTTP interface, which is the data interface
  this._http = new LDFetch();
}

Client.prototype.queryConstructor = function (q, cb, type) {
  // Create fetcher: will create streams for a specific query
  var fetcher = new Fetcher(this._config, this._http);
  //1. Validate query
  if (q.departureTime) {
    q.departureTime = new Date(q.departureTime);
  } else {
    throw "Date of departure not set";
  }
  if (!q.departureStop) {
    throw "Location of departure not set";
  }
  this._numberOfQueries++;
  var query = q, self = this;
  query.index = this._numberOfQueries - 1;

  //2. Use query to configure the data fetchers
  fetcher.buildConnectionsStream(q, connectionsStream => {
    // Create a transferTimeFetcher to handle vehicle switches
    let transferTimeFetcher = () => { };
    transferTimeFetcher.get = (previousConnection, connection) => {
      return new Promise(function (fulfill) {
        if (previousConnection && connection) {
          if (q.minimumTransferTime) {
            return fulfill(q.minimumTransferTime * 60);
          }
          return fulfill(360);
        }
        return fulfill(0);
      });
    };

    //3. fire results using CSA.js and return the stream
    var planner;

    // Adds timeout for server/network/data issues
    var timeout = null;
    if (q.searchTimeOut) {
      timeout = setTimeout(function () {
        fetcher.close();

        // TODO: add a proper way of closing the planner instance
        planner = null;
        delete planner;

        console.log("Connections search timed out");
      }, q.searchTimeOut);
    }

    if (type === "timespan") {
      planner = new TimespanPlanner(q, transferTimeFetcher);

      //When a result is found, stop the stream
      planner.once("end", function () {
        console.log("END THE STREAM");

        fetcher.close();
      });
    } else {
      planner = new Planner(q, transferTimeFetcher);

      //When a result is found, stop the stream
      planner.once("result", function () {
        fetcher.close();

        planner = null;
        delete planner;
      });
    }

    planner.on("data", function () {
      // console.log("data received")
      if (timeout) {
        clearTimeout(timeout);
      }
    });

    cb(connectionsStream.pipe(planner), this._http, connectionsStream);
  });
};

Client.prototype.query = function (q, cb) {
  this.queryConstructor(q, cb, "query");
};

Client.prototype.timespanQuery = function (q, cb) {
  this.queryConstructor(q, cb, "timespan");
};

if (typeof window !== "undefined") {
  window.lc = {
    Client: Client,
    Fetcher: Fetcher
  };
}

module.exports = Client;
module.exports.Fetcher = Fetcher;
