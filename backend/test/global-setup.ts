import { MongoMemoryServer } from 'mongodb-memory-server';

declare global {
  var __MONGOD__: MongoMemoryServer | undefined;
}

export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryServer.create();

  process.env.MONGO_URI = mongod.getUri();
  process.env.MONGO_DB_NAME = 'passx_test';
  process.env.JWT_SECRET = 'e2e-test-secret';

  global.__MONGOD__ = mongod;
}
