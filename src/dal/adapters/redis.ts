// Builtin.
import { parse } from 'url';
import v8 from 'v8';
// 3rd party.
import Redis, { RedisOptions } from 'ioredis';
// Internal.
import { dbConfig, serviceConfig } from '../../config';
import { safe } from '../../lib/decorators';
import { Logger } from '../../lib/logger';
import { exponentialBackoff, isEmpty } from '../../lib/utils';
import { MS_IN_SECOND } from '../../lib/constants';

export class RedisAdapter {
    private _client!: Redis;

    private logger: Logger;

    constructor() {
        this.logger = new Logger(this.constructor.name);
    }

    // eslint-disable-next-line class-methods-use-this
    public get options(): RedisOptions {
        const { auth, hostname, port } = parse(dbConfig.REDIS_URL);
        const [username, password] = (auth ?? '').split(':');
        return {
            host: hostname!,
            port: parseInt(port!),
            ...(auth && { username, password }),
            retryStrategy: (times: number) => exponentialBackoff(
                times,
                { maxDelay: 10 * MS_IN_SECOND },
            ),
            connectionName: serviceConfig.DESCRIPTION,
        };
    }

    public get client(): Redis {
        return this._client;
    }

    public async connect(): Promise<void> {
        this._client = new Redis(this.options);

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
    public async get<T>(
        key: string,
        options?: {
            // Redis hashes are record types structured as collections of field-value pairs.
            hashKey?: string,
            deserialize?: boolean,
        },
    ): Promise<T | null> {
        if (this.client.status !== 'ready') {
            return null;
        }

        const deserialize = options?.deserialize ?? true;
        if (!deserialize) {
            const output = options?.hashKey
                ? await this.client.hget(options.hashKey, key)
                : await this.client.get(key);
            return output as T;
        }

        const output = options?.hashKey
            ? await this.client.hgetBuffer(options.hashKey, key)
            : await this.client.getBuffer(key);
        return output && v8.deserialize(output);
    }

    @safe()
    public async getAll<T>(
        hashKey: string,
        options?: {
            deserialize?: boolean,
        },
    ): Promise<Record<string, T> | null> {
        if (this.client.status !== 'ready') {
            return null;
        }

        const deserialize = options?.deserialize ?? true;
        if (!deserialize) {
            const result = await this.client.hgetall(hashKey);
            return isEmpty(result)
                ? null
                : result as Record<string, T>;
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
    ): Promise<void> {
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
    ): Promise<void> {
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

    @safe()
    public async delete(...keys: string[]) {
        await this.client.del(...keys);
    }
}
