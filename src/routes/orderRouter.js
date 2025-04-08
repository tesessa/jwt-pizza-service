const express = require('express');
const config = require('../config.js');
const { Role, DB } = require('../database/database.js');
const { authRouter } = require('./authRouter.js');
const { asyncHandler, StatusCodeError } = require('../endpointHelper.js');
//const logger2 = require('../logger.js');
const Logger = require('pizza-logger');
const logger = new Logger(config);
const metrics = require('../metrics.js');
const app = express();

//app.use(metrics.requestTracker);
app.use(express.json());
app.use(logger.httpLogger); 

const orderRouter = express.Router();
orderRouter.use(logger.httpLogger)

orderRouter.endpoints = [
  {
    method: 'GET',
    path: '/api/order/menu',
    description: 'Get the pizza menu',
    example: `curl localhost:3000/api/order/menu`,
    response: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }],
  },
  {
    method: 'PUT',
    path: '/api/order/menu',
    requiresAuth: true,
    description: 'Add an item to the menu',
    example: `curl -X PUT localhost:3000/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Student", "description": "No topping, no sauce, just carbs", "image":"pizza9.png", "price": 0.0001 }'  -H 'Authorization: Bearer tttttt'`,
    response: [{ id: 1, title: 'Student', description: 'No topping, no sauce, just carbs', image: 'pizza9.png', price: 0.0001 }],
  },
  {
    method: 'GET',
    path: '/api/order',
    requiresAuth: true,
    description: 'Get the orders for the authenticated user',
    example: `curl -X GET localhost:3000/api/order  -H 'Authorization: Bearer tttttt'`,
    response: { dinerId: 4, orders: [{ id: 1, franchiseId: 1, storeId: 1, date: '2024-06-05T05:14:40.000Z', items: [{ id: 1, menuId: 1, description: 'Veggie', price: 0.05 }] }], page: 1 },
  },
  {
    method: 'POST',
    path: '/api/order',
    requiresAuth: true,
    description: 'Create a order for the authenticated user',
    example: `curl -X POST localhost:3000/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'  -H 'Authorization: Bearer tttttt'`,
    response: { order: { franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }], id: 1 }, jwt: '1111111111' },
  },
];
//eyJpYXQiOjE3NDM0NDI5MTYsImV4cCI6MTc0MzUyOTMxNiwiaXNzIjoiY3MzMjkuY2xpY2siLCJhbGciOiJSUzI1NiIsImtpZCI6IjE0bk5YT21jaWt6emlWZWNIcWE1UmMzOENPM1BVSmJuT2MzazJJdEtDZlEifQ.eyJ2ZW5kb3IiOnsiaWQiOiJ0ZXNzYTM0MyIsIm5hbWUiOiJUZXNzYSBBbmRlcnNlbiJ9LCJkaW5lciI6eyJpZCI6MiwibmFtZSI6InBpenphIGRpbmVyIiwiZW1haWwiOiJkQGp3dC5jb20ifSwib3JkZXIiOnsiaXRlbXMiOlt7Im1lbnVJZCI6MSwiZGVzY3JpcHRpb24iOiJWZWdnaWUiLCJwcmljZSI6MC4wMDM4fV0sInN0b3JlSWQiOiIxIiwiZnJhbmNoaXNlSWQiOjEsImlkIjoxMTN9fQ.PE73BFuovm6fQ_B1pb9xaTcjfOOQV_it8Q5_JEFesGdaNSoVjykwrKrODQJgeNC6aoi8VroFWlIQmlzNABVe9uZ6lm3pZdKbcGQInW_AGFaktk6HTPRkMW5DqcfoksK3A5EWJtwqf-9itgVFqL-MuLelZLJ2Iog2-6KKcNSPWOa_zSuiqMBaDCnGR_eS5UndkD2AvqRKQXxXSpttIyybgK0ICHyBX06C4HOxoQIOCpB13qYZZCEWVxL0G2FG-yLVtmU6awrj1mrDs9sJPCG9KxNh2j2lRF5TlBuuFQMfP-OiwfnT3-a8OLGh7eopMFZtAylnDZ3xQNPEDUJp-_Ma7KSiWfSb3YG3qkd0yhvKAAjva6XdyYXI6kdpxRFEZBlS2M6m-E275dHQWp9_FWZnbvR0FimobsHxgbFM_BUveDZU9AvY05kl30aT_16vP7NZIYnmVWrCcUzjF5SZUGE9nrqGHDNGm7gxgff94Fp9ZtYthmYParid4N0kxXthteJ7kpzGXTHcLgGMVqWCfzqK2gYnMn_FgVjG5FyV-KK6G_jCuw3H7tH0oPEdl7Tkr-Ia_w4s2bBGnR8JMjAJ61l_GRCp_6tqwK1t-gfzmk6R5C6vkQVgbm6lIxVUiAGqBt3CAGNoDV8WEuATaEzMFjGSpHEAsrDjBUQM5PdViZpveBw
// getMenu
orderRouter.get(
  '/menu',
  asyncHandler(async (req, res) => {
    //console.log("MENU");
    metrics.incrementRequest("GET");
    const start = new Date();
    //Logger.httpLogger(req,res);
    res.send(await DB.getMenu());
    const end = new Date();
    const latency = end - start;
    metrics.addGeneralLatency(latency);
  })
);

// addMenuItem
orderRouter.put(
  '/menu',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    // console.log("ADD MENU");
    metrics.incrementRequest("PUT");
    const start = new Date();
    //Logger.httpLogger(req,res);
    if (!req.user.isRole(Role.Admin)) {
      metrics.trackAuthAttempts(false);
      throw new StatusCodeError('unable to add menu item', 403);
    }

    const addMenuItemReq = req.body;
    await DB.addMenuItem(addMenuItemReq);
    res.send(await DB.getMenu());
    const end = new Date();
    const latency = end - start;
    metrics.addGeneralLatency(latency);
    metrics.trackAuthAttempts(true);
  })
);

// getOrders
orderRouter.get(
  '/',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    // console.log("GET USER ORDERS");
    metrics.incrementRequest("GET");
    const start = new Date();
    //Logger.httpLogger(req,res);
    if (!req.user) {
      throw new StatusCodeError("User needed to get user orders", 403);
    }
    res.json(await DB.getOrders(req.user, req.query.page));
    const end = new Date();
    const latency = end - start;
    metrics.addGeneralLatency(latency);
    metrics.trackAuthAttempts(true);
  })
);

orderRouter.post('/', (req, res, next) => {
  if (enableChaos && Math.random() < 0.5) {
    const pizzasFailed = req.body.items.length;
    metrics.pizzaCreationFailures(pizzasFailed);
    throw new StatusCodeError('Chaos monkey', 500);
  }
  next();
});
// createOrder
//'{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'
orderRouter.post(
  '/',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    // if (enableChaos && Math.random() < 0.5) {
    //   metrics.pizzaCreationFailures(true);
    //   console.log("HERE");
    //   throw new StatusCodeError('Chaos monkey', 500);
    // }
    // next();
    metrics.incrementRequest("POST");
    const start = new Date();
    const orderReq = req.body;
    //console.log(req.body.items);
    const order = await DB.addDinerOrder(req.user, orderReq);
    //console.log(order);
    const r = await fetch(`${config.factory.url}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${config.factory.apiKey}` },
      body: JSON.stringify({ diner: { id: req.user.id, name: req.user.name, email: req.user.email }, order }),
    });
    const j = await r.json();
    if (r.ok) {
      const end = new Date();
      const latency = end - start;
      let revenue = 0;
      req.body.items.forEach(item => {
        revenue += item.price;
      });
     // const revenue = req.body.items[0].price;
      const pizzasSold = req.body.items.length;
      
      metrics.addGeneralLatency(latency);
      metrics.trackAuthAttempts(true);
      metrics.addRevenue(revenue);
      metrics.pizzasSold(pizzasSold);
      metrics.addPizzaCreationLatency(latency);
      logger.factoryLogger(r.body);
      res.send({ order, reportSlowPizzaToFactoryUrl: j.reportUrl, jwt: j.jwt });
    } else {
      //console.log("uh oh");
      metrics.trackAuthAttempts(false);
      const pizzasFailed = req.body.items.length;
      metrics.pizzaCreationFailures(pizzasFailed);
      logger.unhandledErrorLogger(new StatusCodeError(`Failed to fulfill order at factory ${config.factory.url}`, 500));
      res.status(500).send({ message: 'Failed to fulfill order at factory', reportPizzaCreationErrorToPizzaFactoryUrl: j.reportUrl });
    }
  })
);


let enableChaos = false;
orderRouter.put(
  '/chaos/:state',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user.isRole(Role.Admin)) {
      enableChaos = req.params.state === 'true';
    }

    res.json({ chaos: enableChaos });
  })
);

// orderRouter.post('/', (req, res, next) => {
//   if (enableChaos && Math.random() < 0.5) {
//     metrics.pizzaCreationFailures(true);
//     throw new StatusCodeError('Chaos monkey', 500);
//   }
//   next();
// });

module.exports = orderRouter;
