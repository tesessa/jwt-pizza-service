const config = require('./config.js');
//Use this file for all the code necessary to interact with Grafana. This may be somewhat similar to what you created in the Grafana Logging instruction. For example, you will need to make HTTP fetch requests to provide logging information as demonstrated by the following:
//For example, consider modifying the DB.query function to handle all the database logging.
/*
1. HTTP requests
    HTTP method, path, status code *
    If the request has an authorization header * 
    Request body *
    Response body *
2. Database requests
    SQL queries
3. Factory service requests
4. Any unhandled exceptions
5. Sanitize all log entries so that they do not contain any confidential information
*/

class Logger {
    httpLogger = (req, res, next) => {
        let send = res.send;
        res.send = (resBody) => {
            const logData = {
                authorized: !!req.headers.authorization,
                path: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode,
                reqBody: JSON.stringify(req.body),
                resBody: JSON.stringify(resBody),
            };
            const level = this.statusToLogLevel(res.statusCode);
            this.log(level, 'http', logData);
            res.send = send;
            return res.send(resBody);
        };
        next();
    };

    log(level, type, logData) {
        const labels = { componenet: config.source, level: level, type: type };
        const values = [this.nowString(), this.sanitize(logData)];
        const logEvent = { streams: [{ stream: labels, values: [values] }] };

        this.sendLogToGrafana(logEvent);
    }

    statusToLogLevel(statusCode) {
        if (statusCode >= 500) return 'error';
        if (statusCode >= 400) return 'warn';
        return 'info';
    }

    nowString() {
        return (Math.floor(Date.now()) * 1000000).toString();
    }

    sanitize(logData) {
        logData = JSON.stringify(logData);
        return logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\": \\"*****\\"');
    }

    sendLogToGrafana(event) {
        const body = JSON.stringify(event);
        fetch(`${config.url}`, {
        method: 'post',
        body: body,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.userId}:${config.apiKey}`,
        },
        }).then((res) => {
        if (!res.ok) console.log('Failed to send log to Grafana');
        });
    } 
}

module.exports = new Logger();