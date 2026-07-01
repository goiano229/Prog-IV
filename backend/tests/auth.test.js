process.env.JWT_SECRET = 'segredo_de_teste';
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server');
const { closeDb } = require('../src/db');

afterAll(() => closeDb());

describe('POST /auth/registrar', () => {
  it('registra um novo usuario com sucesso', async () => {
    const res = await request(app).post('/auth/registrar').send({ username: 'teste', password: '123456' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.username).toBe('teste');
  });

  it('rejeita registro com campos faltando', async () => {
    const res = await request(app).post('/auth/registrar').send({ username: 'teste' });
    expect(res.status).toBe(400);
  });

  it('rejeita username duplicado', async () => {
    await request(app).post('/auth/registrar').send({ username: 'duplicado', password: '123' });
    const res = await request(app).post('/auth/registrar').send({ username: 'duplicado', password: '456' });
    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/auth/registrar').send({ username: 'loginuser', password: 'senha123' });
  });

  it('retorna token com credenciais corretas', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'loginuser', password: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejeita credenciais incorretas', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'loginuser', password: 'errada' });
    expect(res.status).toBe(401);
  });
});
