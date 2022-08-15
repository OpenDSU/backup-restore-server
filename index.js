function requestBodyJSONMiddleware(request, response, next) {
    response.setHeader('Content-Type', 'application/json');

    const data = [];

    request.on('data', (chunk) => {
        data.push(chunk);
    });

    request.on('end', () => {
        let jsonBody = {};
        try {
            jsonBody = data.length ? JSON.parse(data) : {};
        } catch (err) {
            console.log(err);
        }
        request.body = jsonBody;
        next();
    });
}

function boot() {
    const config = require("./config.json");
    let port = config.port || 3000;
    const express = require('express');
    const child_process = require("child_process");
    let app = express();

    app.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        // Request methods allowed
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        // Request headers allowed
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Content-Length, X-Content-Length');
        next();
    });


    app.use("*", requestBodyJSONMiddleware);

    function restore(req, res) {
        console.log("restoring data");
        try {

            const res = child_process.execSync(`aws s3 sync ${config.s3BucketURI} ${config.pathToFolder}`)
            console.log(res.toString());
        } catch (e) {
            console.log(e);
            res.statusCode = 500;
            res.end(e.message);
            return;
        }

        res.statusCode = 200;
        res.end();
    }

    function backup(req, res) {
        console.log("backing up data");
        console.log()
        try {
            let cmd = `aws s3 sync ${config.pathToFolder} ${config.s3BucketURI}`;
            console.log(cmd)
            const res = child_process.execSync(cmd)
            console.log("Res", res);
        } catch (e) {
            console.log("Got error", e);
            res.statusCode = 500;
            res.end(e.message);
            return;
        }

        res.statusCode = 200;
        res.end();
    }

    app.post("/epi/restore", restore);

    app.post("/epi/backup", backup);

    app.get("/epi/check", function(req, res){
        res.statusCode = 200;
        res.end();
    });

    let server = app.listen(port);

    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing backup and restore server');
        server.close(() => {
            console.log('Backup and restore server stopped!');
        });
    });

    console.log('Backup and restore server is ready. Listening on port', port);
}

boot();