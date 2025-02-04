const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('register', async() => {
  const user = createUser();
  const regRes = await request(app).post('/api/auth').send(user);
  expect(regRes.status).toBe(200);
  expectValidJwt(regRes.body.token);

  const expectedUser = { ...user, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(regRes.body.user).toMatchObject(expectedUser);
});

test('register without password', async() => {
  const user = createUser();
  user.email = "";
  const regRes = await request(app).post('/api/auth').send(user);
  expect(regRes.status).toBe(400);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('login multiple times', async () => {

});

test('logout valid', async () => {
  const logOutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logOutRes.body.message).toEqual('logout successful');
});


test('update user admin', async() => {
  let adminUser;
  adminUser = await createAdminUser();
  // console.log(adminUser);
  const loginRes = await request(app).put('/api/auth').send(adminUser);
  let adminAuthToken = loginRes.body.token;
  // console.log(adminAuthToken);
  const updateRes =  await request(app).put(`/api/auth/${loginRes.body.user.id}`).set('Authorization', `Bearer ${adminAuthToken}`).send({email: adminUser.email, password: adminUser.password});
  // console.log(loginRes.body.user);
  // console.log(updateRes.body);
  expect(updateRes.body).toEqual(loginRes.body.user);


});

test('udate user not admin', async() => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  // console.log(loginRes.body.user.id);
  const updateRes =  await request(app).put(`/api/auth/${2}`).set('Authorization', `Bearer ${loginRes.body.token}`).send({email: testUser.email, password: testUser.password});
  expect(updateRes.body.message).toEqual("unauthorized");
  //expect(updateRes.status).toBe(403);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function createUser() {
  const user = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
  user.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  return user; 
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  //console.log(user);
  return { ...user, password: 'toomanysecrets' };
}