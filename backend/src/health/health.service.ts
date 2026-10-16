import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/** Upper bound for a single Mongo ping before it is reported as down. */
export const MONGO_PING_TIMEOUT_MS = 1500;

export interface MongoCheckResult {
  ok: boolean;
  latencyMs: number;
}

@Injectable()
export class HealthService {
  private mongoUp = false;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Pings Mongo via the driver admin command, raced against a timeout so the
   * readiness probe never hangs on server selection.
   */
  async checkMongo(): Promise<MongoCheckResult> {
    const startedAt = Date.now();
    const db = this.connection.db;
    if (!db) {
      return this.record(false, startedAt);
    }

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('mongo ping timed out')),
        MONGO_PING_TIMEOUT_MS,
      );
    });

    try {
      await Promise.race([db.admin().ping(), timeout]);
      return this.record(true, startedAt);
    } catch {
      return this.record(false, startedAt);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Result of the most recent `checkMongo()`; `false` until the first check. */
  isMongoUp(): boolean {
    return this.mongoUp;
  }

  private record(ok: boolean, startedAt: number): MongoCheckResult {
    this.mongoUp = ok;
    return { ok, latencyMs: Date.now() - startedAt };
  }
}
