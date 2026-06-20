const request = require('supertest');
const app = require('../src/server');
const db = require('../src/db');

afterAll(() => {
  db.close();
});

describe('E-commerce monolith smoke tests', () => {
  test('GET / returns welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('E-Commerce Monolith');
  });

  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET /products returns products array', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /products/:id returns product and reviews', async () => {
    const res = await request(app).get('/products/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  test('GET /products/:id rejects invalid id', async () => {
    const res = await request(app).get('/products/abc');
    expect(res.statusCode).toBe(400);
  });

  test('POST /auth/register rejects weak password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'weak@example.com', password: 'short' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /products/:id/review escapes XSS payload', async () => {
    const res = await request(app)
      .post('/products/1/review')
      .send({ reviewer: '<img src=x>', comment: '<script>alert(1)</script>' });
    expect(res.statusCode).toBe(201);
    expect(res.body.comment).not.toContain('<script>');
  });

  test('Helmet sets security headers', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });
});
