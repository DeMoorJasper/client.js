const Client = require("../lib/lc-client");
const fs = require('fs');

const entryPoints = {'entrypoints': ["http://belgium.linkedconnections.org/sncb/connections"]};
const planner = new Client(entryPoints);
const now = new Date();
const inAnHour = new Date(now.valueOf() + 60 * 60 * 1000);

logOutput = (path, content) => {
    fs.writeFile(path, content, function (err) {
        if (err) return console.log(err);

        console.log(path, ' Logged.');
    });
}

countChanges = (resultSet) => {
    let tripCount = 0;
    let lastTrip = resultSet[0]['http://vocab.gtfs.org/terms#trip'];
    for (let connection of resultSet) {
        let currTrip = connection['http://vocab.gtfs.org/terms#trip'];
        if (lastTrip !== currTrip) {
            tripCount++;
        }
        lastTrip = currTrip;
    }
    return tripCount;
};

timeBetweenChanges = (resultSet) => {
    let times = [];
    let lastConn = resultSet[0];
    for (let connection of resultSet) {
        if (lastConn['http://vocab.gtfs.org/terms#trip'] !== connection['http://vocab.gtfs.org/terms#trip']) {
            times.push((connection.departureTime - lastConn.arrivalTime) / 60000);
        }
        lastConn = connection;
    }
    return times;
};

runQuery = () => {
    planner.query({
        departureStop: "http://irail.be/stations/NMBS/008892007",
        arrivalStop: "http://irail.be/stations/NMBS/008812005",
        latestDepartTime: inAnHour,
        departureTime: now,
        minimumTransferTime: 5
    }, (resultStream, source) => {
        let dataCount = 0;
        let requestCount = 0;
        let responseCount = 0;

        source.on('request', () => {
            requestCount++;
        });

        source.on('response', () => {
            responseCount++;
        });

        resultStream.on('data', (data) => {
            dataCount++;
        });
        
        resultStream.once('result',  (path) => {
            logOutput("result.json", JSON.stringify(path));
            console.log("Total connections processed: ", dataCount);
            console.log("Total requests send: ", requestCount);
            console.log("Total responses gotten: ", responseCount);
            console.log("Total changes: ", countChanges(path));
            console.log("Times between changes: ", timeBetweenChanges(path), " minutes");
        });
    });
};

(() => {
    runQuery();
})()