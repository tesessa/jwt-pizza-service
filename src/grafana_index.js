const express = require('express');
const metrics = require('./metrics');
const app = express();

//const metrics = require('./metrics');
// let greeting = 'hello';
app.use(metrics.requestTracker);
app.use(express.json());

// app.get('/hello/:name', metrics.track('getGreeting'), (req, res) => {
//   res.send({ [greeting]: req.params.name });
// });

// register
// authRouter.post(
//   '/',
//   asyncHandler(async (req, res) => {
//     metrics.incrementRequests("POST")
//     const start = new Date()
//     Logger.httpLogger(req, res)
//     const { name, email, password } = req.body;
//     if (!name || !email || !password) {
//       metrics.trackAuthAttempts(false)
//       return res.status(400).json({ message: 'name, email, and password are required' });
//     }
//     const user = await DB.addUser({ name, email, password, roles: [{ role: Role.Diner }] });
//     const auth = await setAuth(user);
//     const end = new Date()

//     const latency = end - start
//     metrics.addGeneralLatency(latency)

//     metrics.trackAuthAttempts(true)
//     metrics.addActiveUser(user.id)
//     res.json({ user: user, token: auth });
//   })
// );

//login
// authRouter.put(
//   '/',
//   asyncHandler(async (req, res) => {
//     metrics.incrementRequests("PUT");
//     const start = new Date();
//     Logger.httpLogger(req,res);
//     const {email, password} = req.body;
//     if (!email || !password) {
//       metrics.trackAuthAttempts(false);
//       return res.status(400).json({ message: 'email and password are required' });
//     }
//     const user = await DB.getUser({ email, password});
//     const auth = await setAuth(user);
//     const end = new Date();

//     const latency = end - start;
//     metrics.addGeneralLatency(latency);

//     metrics.trackAuthAttempts(true);
//     metrics.addActiveUser(user.id);
//     res.json({ user: user, token: auth});
//   })
// )

//logout
// authRouter.delete(
//   '/',
//   asyncHandler(async (req,res) => {
//     metrics.incrementRequests("DELETE");
//     const start = new Date();
//     Logger.httpLogger(req, res);
//     await clearAuth(req);


//     const user = req.user;

//     if (user && user.id) {
//       metrics.removeActiveUser(user.id);
//     }
//     const end = new Date();
//     const latency = end - start;
//     metrics.addGeneralLatency(latency);
//     metrics.trackAuthAttempts(true);
//     metrics.
//     res.json({ message: 'logout successful' });
//   })
// )


app.listen(3000, function () {
  console.log(`Listening on port 3000`);
});