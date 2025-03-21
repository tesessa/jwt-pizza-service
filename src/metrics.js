const config = require('./config');

let requests = 0;
let errors = 0;
let latency = 0;
let requestDurations = {};
let pizzas = 0;
let revenue = 0;
let pizzaFailures = 0;
let pizzaCreationLatency = 0;


const requestCounts = {
  POST: 0,
  PUT: 0,
  GET: 0,
  DELETE: 0,
}

//const requestCounts = {}

// let post = 0;
// let get = 0;
// let deleteReq = 0;
// let put = 0;

let authFalse = 0;
let authTrue = 0;
let activeUsers = 0;


function incrementRequest(requestType) {
  if (requestCounts[requestType] !== undefined) {
    requestCounts[requestType]++;
    requests++;
  }
}


function trackAuthAttempts(authAttempt) {
  if (authAttempt == true) {
    authTrue++;
  } else if (authAttempt == false) {
    authFalse++;
  }
}

function addGeneralLatency(latency_input) {
  latency = latency_input;
}

function addActiveUser() {
  activeUsers++;
}

function removeActiveUser() {
  activeUsers--;
}

function addRevenue(revenue_input) {
  revenue += revenue_input;
}

function pizzasSold(pizzas_input) {
  pizzas += pizzas_input;
  //console.log(`pizzas sold ${pizzas}`);
}

function addPizzaCreationLatency(pizzaLatency) {
  pizzaCreationLatency = pizzaLatency;
}

function pizzaCreationFailures(failures) {
  pizzaFailures += failures;
}

function requestTracker(req, res, next) {
    const start = process.hrtime();

    res.on('finish', () => {
        const duration = process.hrtime(start);
        const durationMs = duration[0] * 1000 + duration[1] / 1e6;

        requests += 1;
        if (!requestDurations[req.path]) {
            requestDurations[req.path] = [];
        }

        requestDurations[req.path].push(durationMs);
        sendMetricToGrafana('requests', requests, 'sum', '1');
        sendMetricToGrafana(`response_time_${req.path}`, durationMs, 'gauge', 'ms');

    });

    res.on('close', () => {
        if (res.statusCode >= 400) {
            errors += 1;
            sendMetricToGrafana('errors', errors, 'sum', '1');
        }
    });

    next();
}

// function track(endpoint) {
//     return (req, res, next) => {
//       requests[endpoint] = (requests[endpoint] || 0) + 1;
//       next();
//     };
//   }
  
  // This will periodically send metrics to Grafana
  // const timer = setInterval(() => {
  //   Object.keys(requests).forEach((endpoint) => {
  //     sendMetricToGrafana('requests', requests[endpoint], { endpoint });
  //   });
  // }, 10000);


const os = require('os');

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        // const buf = new MetricBuilder();
        Object.keys(requestCounts).forEach((requestType) => {
          sendMetricToGrafana(`${requestType.toLowerCase()}Requests`, requestCounts[requestType], 'sum', '1');
        });

        sendMetricToGrafana('totalRequests', requests, 'sum', '1');
        //console.log("latency2 ", latency);
        sendMetricToGrafana('latency', latency, 'sum', 'ms');
        sendMetricToGrafana('cpuUsage', getCpuUsagePercentage(), 'gauge', '%');
        sendMetricToGrafana('memoryUsage', getMemoryUsagePercentage(), 'gauge', '%');
        sendMetricToGrafana('authWorked', authTrue, 'sum', '1');
        sendMetricToGrafana('authFailed', authFalse, 'sum', '1');
        sendMetricToGrafana('activeUsers', activeUsers, 'sum', '1');
        sendMetricToGrafana('pizzasSold', pizzas, 'sum', '1');
        sendMetricToGrafana('revenue', revenue, 'sum', '1');
        sendMetricToGrafana('pizzaCreationLatency', pizzaCreationLatency, 'sum', 'ms');
        sendMetricToGrafana('pizzaCreationFailures', pizzaFailures, 'sum', '1');
        // httpMetrics(buf);
        // systemMetrics(buf);
        // userMetrics(buf);
        // purchaseMetrics(buf);
        // authMetrics(buf);
  
        // const metrics = buf.toString('\n');
        // this.sendMetricToGrafana(metrics);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }

  sendMetricsPeriodically(10000);


function sendMetricToGrafana(metricName, metricValue, type, unit) {
  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: unit,
                [type]: {
                  dataPoints: [
                    {
                      asDouble: metricValue,
                      timeUnixNano: Date.now() * 1000000,
                      source: config.metrics.source,
                     // attributes: [config.metrics.source],
                      attributes: [
                        {
                          source: config.metrics.source
                        }
                     ]
                    },
                  ],
                  aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                  isMontonic: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  // Object.keys(attributes).forEach((key) => {
  //   metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push({
  //     key: key,
  //     value: { stringValue: attributes[key] },
  //   });
  // });
  // if (type === 'sum') {
  //   metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
  //   metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
  // }

  const body = JSON.stringify(metric);

  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: body,
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        response.text().then((text) => {
          console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
        });
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = { incrementRequest,trackAuthAttempts, addActiveUser, removeActiveUser, addGeneralLatency, requestTracker, addRevenue, addPizzaCreationLatency, pizzaCreationFailures, pizzasSold };