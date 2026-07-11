const request = require('supertest');
const app = require('../server');

describe('API Integration Tests & Auth', () => {
  const SECRET_TOKEN = 'xpto_demo_123';
  const VALID_AUTH_HEADER = `Bearer ${SECRET_TOKEN}`;

  it('Should reject requests without Authorization header (401)', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Token de autenticação não fornecido');
  });

  it('Should reject requests with invalid token (401)', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', 'Bearer WRONG_TOKEN');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Token inválido');
  });

  it('Should accept valid token and return inventory (200)', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', VALID_AUTH_HEADER);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('Should process chat messages correctly via POST (200)', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', VALID_AUTH_HEADER)
      .send({ message: 'oi' });
    expect(res.statusCode).toBe(200);
    expect(res.body.text).toContain('Olá');
  });
});
