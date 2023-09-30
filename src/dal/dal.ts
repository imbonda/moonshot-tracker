// Internal.
import { Logger } from '../lib/logger';
import { MongoDBAdapter } from './adapters/mongodb';
import { RedisAdapter } from './adapters/redis';
import { NewERC20Module } from './modules/new-erc20';

interface DalModules {
    newErc20: NewERC20Module,
}

class Dal {
    public redis: RedisAdapter;

    public mongodb: MongoDBAdapter;

    public modules: DalModules;

    private logger: Logger;

    constructor() {
        this.redis = new RedisAdapter();
        this.mongodb = new MongoDBAdapter();
        this.modules = {
            newErc20: new NewERC20Module(this),
        };
        this.logger = new Logger(this.constructor.name);
    }

    public async connect(): Promise<void> {
        await Promise.all([
            this.redis.connect(),
            this.mongodb.connect(),
        ]);
        this.logger.info('Dal connected');
    }

    public async disconnect(): Promise<void> {
        await Promise.all([
            this.redis.disconnect(),
            this.mongodb.disconnect(),
        ]);
        this.logger.info('Dal disconnected');
    }
}

export type { Dal };
export const dal = new Dal();
