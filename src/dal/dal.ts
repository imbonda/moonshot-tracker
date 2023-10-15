// Internal.
import { Logger } from '../lib/logger';
import { MongoDBAdapter } from './adapters/mongodb';
import { RedisAdapter } from './adapters/redis';
import { NewERC20Model } from './models/new-erc20';
import { TrackedTokenModel } from './models/tracked-token';

interface DalModels {
    newErc20: NewERC20Model,
    trackedToken: TrackedTokenModel,
}

class Dal {
    public redis: RedisAdapter;

    public mongodb: MongoDBAdapter;

    public models: DalModels;

    private logger: Logger;

    constructor() {
        this.redis = new RedisAdapter();
        this.mongodb = new MongoDBAdapter();
        this.models = {
            newErc20: new NewERC20Model(this),
            trackedToken: new TrackedTokenModel(this),
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
