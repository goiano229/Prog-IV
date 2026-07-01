process.env.JWT_SECRET = 'segredo_de_teste';
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/server');
const { closeDb } = require('../src/db');

let token;

beforeAll(async () => {
  await request(app).post('/auth/registrar').send({ username: 'admin', password: 'admin123' });
  const res = await request(app).post('/auth/login').send({ username: 'admin', password: 'admin123' });
  token = res.body.token;
});

afterAll(() => closeDb());

const filmeBase = {
  titulo: 'Panico (1996)',
  conteudo: 'O filme original que revolucionou o slasher.',
  imagem: 'https://example.com/panico1.jpg',
  ordem: 1,
};

describe('GET /filmes', () => {
  it('retorna lista vazia inicialmente', async () => {
    const res = await request(app).get('/filmes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /filmes', () => {
  it('cria filme com token valido', async () => {
    const res = await request(app).post('/filmes').set('Authorization', `Bearer ${token}`).send(filmeBase);
    expect(res.status).toBe(201);
    expect(res.body.titulo).toBe(filmeBase.titulo);
    expect(res.body).toHaveProperty('id');
  });

  it('rejeita criacao sem token', async () => {
    const res = await request(app).post('/filmes').send(filmeBase);
    expect(res.status).toBe(401);
  });

  it('rejeita criacao com campos faltando', async () => {
    const res = await request(app).post('/filmes').set('Authorization', `Bearer ${token}`).send({ titulo: 'Sem conteudo' });
    expect(res.status).toBe(400);
  });
});

describe('GET /filmes/:id', () => {
  let filmeId;
  beforeAll(async () => {
    const res = await request(app).post('/filmes').set('Authorization', `Bearer ${token}`).send({ ...filmeBase, titulo: 'Panico 2 (1997)', ordem: 2 });
    filmeId = res.body.id;
  });

  it('retorna o filme pelo id', async () => {
    const res = await request(app).get(`/filmes/${filmeId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(filmeId);
  });

  it('retorna 404 para id inexistente', async () => {
    const res = await request(app).get('/filmes/99999');
    expect(res.status).toBe(404);
  });
});

describe('PUT /filmes/:id', () => {
  let filmeId;
  beforeAll(async () => {
    const res = await request(app).post('/filmes').set('Authorization', `Bearer ${token}`).send({ ...filmeBase, titulo: 'Para Atualizar', ordem: 3 });
    filmeId = res.body.id;
  });

  it('atualiza titulo do filme', async () => {
    const res = await request(app).put(`/filmes/${filmeId}`).set('Authorization', `Bearer ${token}`).send({ titulo: 'Titulo Atualizado' });
    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe('Titulo Atualizado');
  });

  it('retorna 404 ao atualizar id inexistente', async () => {
    const res = await request(app).put('/filmes/99999').set('Authorization', `Bearer ${token}`).send({ titulo: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /filmes/:id', () => {
  let filmeId;
  beforeAll(async () => {
    const res = await request(app).post('/filmes').set('Authorization', `Bearer ${token}`).send({ ...filmeBase, titulo: 'Para Deletar', ordem: 4 });
    filmeId = res.body.id;
  });

  it('deleta o filme com sucesso', async () => {
    const res = await request(app).delete(`/filmes/${filmeId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('retorna 404 ao deletar id inexistente', async () => {
    const res = await request(app).delete('/filmes/99999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('Ordenacao dos filmes', () => {
  it('retorna filmes ordenados pelo campo ordem (ASC)', async () => {
    await request(app).post('/filmes').set('Authorization', `Bearer ${token}`).send({ ...filmeBase, titulo: 'Ultimo', ordem: 99 });
    await request(app).post('/filmes').set('Authorization', `Bearer ${token}`).send({ ...filmeBase, titulo: 'Primeiro', ordem: 0 });

    const res = await request(app).get('/filmes');
    expect(res.status).toBe(200);

    const ordens = res.body.map(f => f.ordem);
    const ordenado = [...ordens].sort((a, b) => a - b);
    expect(ordens).toEqual(ordenado);
  });
});
