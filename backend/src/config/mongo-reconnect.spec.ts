import { EventEmitter } from 'events';
import type { Connection } from 'mongoose';
import { attachMongoReconnect } from './mongo-reconnect';

class FakeConnection extends EventEmitter {
  readyState = 0;
  openUri = jest.fn((): Promise<Connection> => {
    this.readyState = 1;
    return Promise.resolve(this as unknown as Connection);
  });
}

const silentLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as const;

describe('attachMongoReconnect', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the same connection so Nest can inject it', () => {
    const conn = new FakeConnection();
    expect(
      attachMongoReconnect(
        conn as unknown as Connection,
        'mongodb://x',
        silentLogger,
        100,
      ),
    ).toBe(conn);
  });

  it('does not crash on an error event and retries the initial connection', async () => {
    const conn = new FakeConnection();
    attachMongoReconnect(
      conn as unknown as Connection,
      'mongodb://x',
      silentLogger,
      100,
    );

    expect(() =>
      conn.emit('error', new Error('getaddrinfo ENOTFOUND mongo')),
    ).not.toThrow();
    expect(conn.openUri).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(100);
    expect(conn.openUri).toHaveBeenCalledWith('mongodb://x');
    expect(conn.openUri).toHaveBeenCalledTimes(1);
  });

  it('keeps retrying while the connection stays down', async () => {
    const conn = new FakeConnection();
    conn.openUri.mockImplementation(() =>
      Promise.reject(new Error('still down')),
    );
    attachMongoReconnect(
      conn as unknown as Connection,
      'mongodb://x',
      silentLogger,
      100,
    );

    conn.emit('error', new Error('first failure'));
    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(100);

    expect(conn.openUri).toHaveBeenCalledTimes(3);
  });

  it('does not retry when the error happens on an established connection', async () => {
    const conn = new FakeConnection();
    conn.readyState = 1;
    attachMongoReconnect(
      conn as unknown as Connection,
      'mongodb://x',
      silentLogger,
      100,
    );

    conn.emit('error', new Error('transient'));
    await jest.advanceTimersByTimeAsync(300);

    expect(conn.openUri).not.toHaveBeenCalled();
  });

  it('schedules at most one pending retry', async () => {
    const conn = new FakeConnection();
    conn.openUri.mockImplementation(() => Promise.reject(new Error('down')));
    attachMongoReconnect(
      conn as unknown as Connection,
      'mongodb://x',
      silentLogger,
      100,
    );

    conn.emit('error', new Error('a'));
    conn.emit('error', new Error('b'));
    conn.emit('error', new Error('c'));
    await jest.advanceTimersByTimeAsync(100);

    expect(conn.openUri).toHaveBeenCalledTimes(1);
  });
});
