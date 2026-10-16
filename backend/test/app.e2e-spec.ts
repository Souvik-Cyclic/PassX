import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MetricsService } from '../src/metrics/metrics.service';

describe('PassX API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  const alice = {
    email: 'A@B.com',
    authKeyHash: 'alice-hash',
    encryptedMasterKey: 'alice-emk',
  };
  const bob = {
    email: 'bob@example.com',
    authKeyHash: 'bob-hash',
    encryptedMasterKey: 'bob-emk',
  };
  let aliceToken: string;
  let bobToken: string;
  let itemId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('health', () => {
    it('GET /health returns ok', async () => {
      const res = await http.get('/health').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('GET /health/live returns ok', async () => {
      const res = await http.get('/health/live').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('GET /health/ready reports Mongo up', async () => {
      const res = await http.get('/health/ready').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', mongo: 'up' });
      expect(res.body.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('request ids', () => {
    const UUID_V4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    it('assigns a UUID request id when none is sent', async () => {
      const res = await http.get('/health/live').expect(200);
      expect(res.headers['x-request-id']).toMatch(UUID_V4);
    });

    it('echoes a well-formed incoming request id', async () => {
      const res = await http
        .get('/health/live')
        .set('x-request-id', 'client-abc-123')
        .expect(200);
      expect(res.headers['x-request-id']).toBe('client-abc-123');
    });

    it('replaces a hostile request id', async () => {
      const res = await http
        .get('/health/live')
        .set('x-request-id', 'x'.repeat(200))
        .expect(200);
      expect(res.headers['x-request-id']).toMatch(UUID_V4);
    });
  });

  describe('version', () => {
    it('GET /version reports build identity with safe defaults', async () => {
      const res = await http.get('/version').expect(200);
      expect(res.body).toMatchObject({
        commit: 'unknown',
        imageTag: 'unknown',
        buildTime: 'unknown',
        pipelineUrl: 'unknown',
        pod: 'unknown',
        node: 'unknown',
      });
      expect(Number.isFinite(Date.parse(res.body.startedAt))).toBe(true);
    });
  });

  describe('auth', () => {
    it('signs up a new user and returns a token', async () => {
      const res = await http.post('/auth/signup').send(alice).expect(201);
      expect(typeof res.body.accessToken).toBe('string');
      aliceToken = res.body.accessToken;
    });

    it('rejects a duplicate signup', async () => {
      await http.post('/auth/signup').send(alice).expect(400);
    });

    it('rejects an invalid email', async () => {
      await http
        .post('/auth/signup')
        .send({ ...bob, email: 'not-an-email' })
        .expect(400);
    });

    it('rejects unknown fields in the body', async () => {
      await http
        .post('/auth/signup')
        .send({ ...bob, role: 'admin' })
        .expect(400);
    });

    it('logs in case-insensitively and returns the encrypted master key', async () => {
      const res = await http
        .post('/auth/login')
        .send({ email: 'a@b.com', authKeyHash: alice.authKeyHash })
        .expect(200);
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.encryptedMasterKey).toBe(alice.encryptedMasterKey);
    });

    it('rejects a wrong auth key hash', async () => {
      await http
        .post('/auth/login')
        .send({ email: alice.email, authKeyHash: 'wrong' })
        .expect(401);
    });

    it('signs up a second user', async () => {
      const res = await http.post('/auth/signup').send(bob).expect(201);
      bobToken = res.body.accessToken;
    });
  });

  describe('vault', () => {
    const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

    it('rejects requests without a token', async () => {
      await http.get('/vault').expect(401);
    });

    it('creates an item for the caller', async () => {
      const res = await http
        .post('/vault')
        .set(auth(aliceToken))
        .send({ encryptedData: 'blob1' })
        .expect(201);
      expect(res.body.encryptedData).toBe('blob1');
      expect(typeof res.body._id).toBe('string');
      itemId = res.body._id;
    });

    it('lists only the caller items', async () => {
      const res = await http.get('/vault').set(auth(aliceToken)).expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).toBe(itemId);
    });

    it('updates the caller item', async () => {
      const res = await http
        .put(`/vault/${itemId}`)
        .set(auth(aliceToken))
        .send({ encryptedData: 'blob2' })
        .expect(200);
      expect(res.body.encryptedData).toBe('blob2');
    });

    it('does not let another user update the item', async () => {
      await http
        .put(`/vault/${itemId}`)
        .set(auth(bobToken))
        .send({ encryptedData: 'stolen' })
        .expect(404);
    });

    it('does not show the item to another user', async () => {
      const res = await http.get('/vault').set(auth(bobToken)).expect(200);
      expect(res.body).toEqual([]);
    });

    it('leaves the item untouched after the rejected update', async () => {
      const res = await http.get('/vault').set(auth(aliceToken)).expect(200);
      expect(res.body[0].encryptedData).toBe('blob2');
    });

    it('does not let another user delete the item', async () => {
      await http.delete(`/vault/${itemId}`).set(auth(bobToken)).expect(404);
      const res = await http.get('/vault').set(auth(aliceToken)).expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('rejects unknown fields on create', async () => {
      await http
        .post('/vault')
        .set(auth(aliceToken))
        .send({ encryptedData: 'x', type: 'password' })
        .expect(400);
    });

    it('returns 404 for a malformed id on update', async () => {
      await http
        .put('/vault/not-an-objectid')
        .set(auth(aliceToken))
        .send({ encryptedData: 'x' })
        .expect(404);
    });

    it('returns 404 for a malformed id on delete', async () => {
      await http
        .delete('/vault/not-an-objectid')
        .set(auth(aliceToken))
        .expect(404);
    });

    it('deletes the caller item', async () => {
      const res = await http
        .delete(`/vault/${itemId}`)
        .set(auth(aliceToken))
        .expect(200);
      expect(res.body).toEqual({ success: true });
    });

    it('returns 404 when deleting again', async () => {
      await http.delete(`/vault/${itemId}`).set(auth(aliceToken)).expect(404);
    });
  });

  describe('metrics', () => {
    it('serves Prometheus metrics on the separate metrics port', async () => {
      const port = app.get(MetricsService).boundPort;
      expect(port).toBeGreaterThan(0);

      const res = await fetch(`http://127.0.0.1:${port}/metrics`);
      const body = await res.text();

      expect(res.status).toBe(200);
      expect(body).toMatch(/http_requests_total\{[^}]*route="\/vault"/);
      expect(body).toMatch(/http_requests_total\{[^}]*status="404"/);
      expect(body).toContain('mongo_up 1');
      expect(body).not.toMatch(/route="\/health\/live"/);
    });

    it('does not serve metrics on the app port', async () => {
      await http.get('/metrics').expect(404);
    });
  });
});
