const request = require('supertest');
const app = require('../service');

let adminUser;
let adminAuthToken;
let userID;

beforeAll(async () => {
    if (process.env.VSCODE_INSPECTOR_OPTIONS) {
      jest.setTimeout(60 * 1000 * 7); // 5 minutes
    }
    adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    userID = loginRes.body.user.id
    adminAuthToken = loginRes.body.token;
    expectValidJwt(adminAuthToken);
});

test('create store', async() => {
    // const getStores = await request(app).get(`/api/franchise/${userID}`).set('Authorization', `Bearer ${adminAuthToken}`);
    // console.log(getStores.body)
    //const getFranchises = await request(app).get('/api/franchise')
    // let franchise_id = createMockFranchise();
    // const getFranchises = await request(app).get('/api/franchise')
    // console.log(getFranchises.body)
    const createStoreRes = await request(app).post(`/api/franchise/${1620}/store`).set('Authorization', `Bearer ${adminAuthToken}`).send({franchiseId: 1620, name:"Orem"});
    // console.log(createStoreRes.body)
    expect(createStoreRes.status).toBe(200);
    expect(createStoreRes.body.franchiseId).toEqual(1620)
    expect(createStoreRes.body.name).toEqual("Orem")
});

test('create store no admin', async() => {
    const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    const regRes =  await request(app).post('/api/auth').send(testUser);
    const createStoreRes = await request(app).post(`/api/franchise/${1}/store`).set('Authorization', `Bearer ${regRes.body.token}`).send({franchiseId: 1, name:"SLC"}); 
    expect(createStoreRes.status).toEqual(403)
});

test('create franchise', async() => {
    // const getFranchise = await request(app).get(`/api/franchise/${userID}`).set('Authorization', `Bearer ${adminAuthToken}`);
    const getFranchises = await request(app).get('/api/franchise')
    // console.log(getFranchises.body)
    let pizza_id;
    for (const fran of getFranchises.body) {
        if(fran.name == "franchise_test") {
            pizza_id = fran.id
        }
    }
    //console.log(getFranchise);
    await request(app).delete(`/api/franchise/${pizza_id}`).set('Authorization', `Bearer ${adminAuthToken}`)
    const createFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminAuthToken}`).send({name: "franchise_test", admins: [{email: `${adminUser.email}`}]});
    expect(createFranchiseRes.body.name).toEqual("franchise_test");
});

test('create franchise no admin', async() => {
    let auth = await createUser();
    const createFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${auth}`).send({name: "no_admin", admins: [{email: `${adminUser.email}`}]});
    expect(createFranchiseRes.status).toBe(403);
});

test('delete franchise', async() => {
    let franchise_id = await createMockFranchise();
    const deleteFranchiseRes = await request(app).delete(`/api/franchise/${franchise_id}`).set('Authorization', `Bearer ${adminAuthToken}`);
    expect(deleteFranchiseRes.body.message).toEqual("franchise deleted");
});

test('delete franchise no admin', async() => {
    let auth = await createUser();
    let franchise_id = await createMockFranchise();
    const deleteFranchiseRes = await request(app).delete(`/api/franchise/${franchise_id}`).set('Authorization', `Bearer ${auth}`);
    //console.log(deleteFranchiseRes);
    expect(deleteFranchiseRes.status).toEqual(403);
    await request(app).delete(`/api/franchise/${franchise_id}`).set('Authorization', `Bearer ${adminAuthToken}`);
});

test('delete store', async() => {
    // /api/franchise/:franchiseId/store/:storeId
    let franchise_id = await createMockFranchise();
    let store_id = await createMockStore(franchise_id);
    const deleteStoreRes = await request(app).delete(`/api/franchise/${franchise_id}/store/${store_id}`).set('Authorization', `Bearer ${adminAuthToken}`);
    expect(deleteStoreRes.body.message).toEqual('store deleted'); 
});

test('delete store not an admin', async() => {
    let auth = await createUser();
    let franchise_id = await createMockFranchise();
    let store_id = await createMockStore(franchise_id);
    const deleteStoreRes = await request(app).delete(`/api/franchise/${franchise_id}/store/${store_id}`).set('Authorization', `Bearer ${auth}`); 
    expect(deleteStoreRes.status).toEqual(403);
});

test('get franchises user', async() => {
    ///api/franchise/:userId
    const getStores = await request(app).get(`/api/franchise/${userID}`).set('Authorization', `Bearer ${adminAuthToken}`);
    expect(getStores.status).toEqual(200);
    //console.log(getStores);

});

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
  //console.log(user);
  return { ...user, password: 'toomanysecrets' };
}

async function createUser() {
    const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    const regRes =  await request(app).post('/api/auth').send(testUser);
    return regRes.body.token;
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