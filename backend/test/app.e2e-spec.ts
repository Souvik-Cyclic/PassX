import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

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

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
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
});
