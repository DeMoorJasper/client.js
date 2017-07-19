const Client = require("../lib/lc-client");

const entryPoints = {'entrypoints': ["http://belgium.linkedconnections.org/sncb/connections"]};
const planner = new Client(entryPoints);
const now = new Date();
const inAnHour = new Date(now.valueOf() + 60 * 60 * 1000);

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
            console.log(path);
            console.log("Total connections processed: ", dataCount);
            console.log("Total requests send: ", requestCount);
            console.log("Total responses gotten: ", responseCount);
        });
    });
};

(() => {
    console.log("RUN IIFE");
    runQuery();
})()