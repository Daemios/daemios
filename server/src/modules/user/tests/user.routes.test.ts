import { describe, it } from 'vitest';

// Integration test skeleton for user routes.
// This test is intentionally skipped by default and serves as a template.
describe.skip('user routes (integration)', () => {
  it('POST /users -> creates user (requires running server and DB)', async () => {
    // Use supertest or a running server to exercise the route.
    // Example (if supertest is available):
    // const request = supertest(app);
    // await request.post('/users').send({ email: 'x@y.com', password: 'p', displayName: 'X' }).expect(201);
  });
});
