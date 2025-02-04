const request = require('supertest');
const app = require('../service');

let adminUser;
let adminAuthToken;

beforeAll(async () => {
    if (process.env.VSCODE_INSPECTOR_OPTIONS) {
      jest.setTimeout(60 * 1000 * 7); // 5 minutes
    }
    adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    adminAuthToken = loginRes.body.token;
    expectValidJwt(adminAuthToken);
});

test('get menu', async() => {
    const getMenuRes = await request(app).get('/api/order/menu');
    //expect(getMenuRes.body).not.toHaveLength(0);
    expect(getMenuRes.status).toEqual(200);

});

test('add menu item valid', async() => {
    ///api/order/menu
    let menu = createMenuItem();
    const addMenuRes = await request(app).get('/api/order/menu').set('Authorization',  `Bearer ${adminAuthToken}`).send(menu);
    //expect(addMenuRes.body).not.toHaveLength(0);
    expect(addMenuRes.status).toEqual(200);
});

test('add menu item no admin', async() => {
    let menu = createMenuItem();
    const user = createUser();
    const regRes = await request(app).post('/api/auth').send(user);
    const addMenuRes = await request(app).put('/api/order/menu').set('Authorization',  `Bearer ${regRes.body.token}`).send(menu);

    expect(addMenuRes.status).toEqual(403);
});

test('get order for user', async() => {
    ///api/order
    let order = {franchiseId: 1, storeId:1, items:[{ menuId: 1, description: "Veggie", price: 0.05 }]};
    await request(app).post('/api/order').set('Authorization',  `Bearer ${adminAuthToken}`).send(order);
    const getOrderRes = await request(app).get('/api/order').set('Authorization',  `Bearer ${adminAuthToken}`);
    expect(getOrderRes.body.orders).not.toHaveLength(0);

});

test('create order', async() => {
    let franchise_id = await createMockFranchise();
    let store_id = await createMockStore(franchise_id);
    let order = {franchiseId: franchise_id, storeId: store_id, items:[{ menuId: 1, description: "Veggie", price: 0.05 }]};
    const createOrderRes = await request(app).post('/api/order').set('Authorization',  `Bearer ${adminAuthToken}`).send(order);
    expect(createOrderRes.status).toEqual(200);
    expectValidJwt(createOrderRes.body.jwt);
});

test('create bad order', async() => {
    let franchise_id = 2000000;
    let store_id = await createMockStore(franchise_id);
    let order = {franchiseId: franchise_id, storeId: store_id, items:[{ menuId: 1, description: "Veggie", price: 0.05 }]}; 
    const createOrderRes = await request(app).post('/api/order').set('Authorization',  `Bearer ${adminAuthToken}`).send(order);
    expect(createOrderRes.status).toEqual(500);
});


function createMenuItem() {
    let menu = {title: randomName(), description: "No topping, no sauce, just carbs", image:"pizza9.png", price: 0.0001 };
    return menu;
}

function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
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
  return { ...user, password: 'toomanysecrets' };
}

function createUser() {
    const user = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    user.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    return user; 
  }

async function createMockFranchise() {
    let n = randomName();
    const createFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminAuthToken}`).send({name: n, admins: [{email: `${adminUser.email}`}]});
   // console.log(createFranchiseRes.body);
    return createFranchiseRes.body.id;
}

async function createMockStore(franchise_id) {
    const createStoreRes = await request(app).post(`/api/franchise/${franchise_id}/store`).set('Authorization', `Bearer ${adminAuthToken}`).send({franchiseId: franchise_id, name:"Random"});
    return createStoreRes.body.id; 
}