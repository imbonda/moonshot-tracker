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
        this.client = new Redis({
            path: dbConfig.REDIS_URL,
        });

        return new Promise((resolve, reject) => {
            // Register connection callbacks.
            this.client.on('connect', (() => {
                this.logger.info('Connected to Redis');
                resolve();
            }));
            this.client.on('reconnecting', ((params: any) => {
                this.logger.info('Reconnecting to Redis', { attempt: params.attempt });
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
    public async getData(
        key: string,
        options?: {
            // Redis hashes are record types structured as collections of field-value pairs.
            hashKey?: string,
        },
    ): Promise<unknown | null> {
        if (this.client.status !== 'ready') {
            return null;
        }

        const output = options?.hashKey
            ? await this.client.hgetBuffer(options.hashKey, key)
            : await this.client.getBuffer(key);
        return output && v8.deserialize(output);
    }

    @safe()
    public async getAllData(hashKey: string): Promise<Record<string, any> | null> {
        if (this.client.status !== 'ready') {
            return null;
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
    public async setData(
        key: string,
        value: unknown,
        options?: {
            // Redis hashes are record types structured as collections of field-value pairs.
            hashKey?: string,
            ttlSeconds?: number
        },
    ) {
        if (this.client.status !== 'ready') {
            return;
        }

        const data = v8.serialize(value);

        const pipeline = this.client.pipeline();

        if (options?.hashKey) {
            pipeline.hset(options.hashKey, key, data);

            if (options?.ttlSeconds) {
                pipeline.expire(options.hashKey, options.ttlSeconds);
            }
        } else if (options?.ttlSeconds) {
            pipeline.set(key, data, 'EX', options.ttlSeconds);
        } else {
            pipeline.set(key, data);
        }

        await pipeline.exec();
    }
}
