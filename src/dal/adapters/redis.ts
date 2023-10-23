// Builtin.
import v8 from 'v8';
// 3rd party.
import Redis from 'ioredis';
// Internal.
import { dbConfig } from '../../config';
import { safe } from '../../lib/decorators';
import { Logger } from '../../lib/logger';
import { isEmpty } from '../../lib/utils';

export class RedisAdapter {
    private client!: Redis;

    private logger: Logger;

    constructor() {
        this.logger = new Logger(this.constructor.name);
    }

    public async connect(): Promise<void> {
        this.client = new Redis(dbConfig.REDIS_URL);

        return new Promise((resolve, reject) => {
            // Register connection callbacks.
            this.client.on('connect', (() => {
                this.logger.info('Connected to Redis');
                resolve();
            }));
            this.client.on('reconnecting', ((params: any) => {
                this.logger.info('Reconnecting to Redis', { attempt: params?.attempt });
            }));
            this.client.on('error', ((err) => {
                this.logger.error('Error connecting to Redis', err);
                reject(err);
            }));
        });
    }

    public disconnect(): void {
        this.client.disconnect();
    }

    @safe()
    public async get(
        key: string,
        options?: {
            // Redis hashes are record types structured as collections of field-value pairs.
            hashKey?: string,
            deserialize?: boolean,
        },
    ): Promise<unknown | null> {
        if (this.client.status !== 'ready') {
            return null;
        }

        const deserialize = options?.deserialize ?? true;
        if (!deserialize) {
            const output = options?.hashKey
                ? await this.client.hget(options.hashKey, key)
                : await this.client.get(key);
            return output;
        }

        const output = options?.hashKey
            ? await this.client.hgetBuffer(options.hashKey, key)
            : await this.client.getBuffer(key);
        return output && v8.deserialize(output);
    }

    @safe()
    public async getAll(
        hashKey: string,
        options?: {
            deserialize?: boolean,
        },
    ): Promise<Record<string, unknown> | null> {
        if (this.client.status !== 'ready') {
            return null;
        }

        const deserialize = options?.deserialize ?? true;
        if (!deserialize) {
            const result = await this.client.hgetall(hashKey);
            return isEmpty(result)
                ? null
                : result;
        }

        const result = await this.client.hgetallBuffer(hashKey);
        if (isEmpty(result)) {
            return null;
        }
        return result && Object.fromEntries(
            Object.entries(result).map(([key, value]) => [key, v8.deserialize(value)]),
        );
    }

    @safe()
    public async set(
        key: string,
        value: unknown,
        options?: {
            // Redis hashes are record types structured as collections of field-value pairs.
            hashKey?: string,
            serialize?: boolean,
            ttlSeconds?: number
        },
    ) {
        if (this.client.status !== 'ready') {
            return;
        }

        const serialize = options?.serialize ?? true;
        const data = serialize
            ? v8.serialize(value)
            : value as string | number | Buffer;

        const pipeline = this.client.pipeline();

        if (options?.hashKey) {
            pipeline.hset(options.hashKey, key, data);

            if (options?.ttlSeconds) {
                pipeline.expire(options.hashKey, options.ttlSeconds!);
            }
        } else if (options?.ttlSeconds) {
            pipeline.set(key, data, 'EX', options.ttlSeconds!);
        } else {
            pipeline.set(key, data);
        }

        await pipeline.exec();
    }

    @safe()
    public async setMultiple(
        keyValues: { key: string, value: unknown }[],
        options?: {
            // Redis hashes are record types structured as collections of field-value pairs.
            hashKey?: string,
            serialize?: boolean,
            ttlSeconds?: number
        },
    ) {
        if (this.client.status !== 'ready') {
            return;
        }

        const serialize = options?.serialize ?? true;
        const keyDataMap = keyValues.reduce(
            (accum, { key, value }) => {
                accum[key] = serialize
                    ? v8.serialize(value)
                    : value as string | number | Buffer;
                return accum;
            },
            {} as Record<string, string | number | Buffer>,
        );

        const pipeline = this.client.pipeline();

        if (options?.hashKey) {
            pipeline.hmset(options.hashKey, keyDataMap);

            if (options?.ttlSeconds) {
                pipeline.expire(options.hashKey, options.ttlSeconds!);
            }
        } else if (options?.ttlSeconds) {
            Object.entries(keyDataMap).forEach(([key, data]) => {
                pipeline.set(key, data, 'EX', options.ttlSeconds!);
            });
        } else {
            pipeline.mset(keyDataMap);
        }

        await pipeline.exec();
    }
}
