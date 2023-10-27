// 3rd party.
import mongoose, { Connection } from 'mongoose';
// Internal.
import { dbConfig } from '../../config';
import { Logger } from '../../lib/logger';

export class MongoDBAdapter {
    public db!: Connection;

    private logger: Logger;

    constructor() {
        this.logger = new Logger(this.constructor.name);
    }

    public async connect() {
        this.db = mongoose.connection;
        this.db.on('error', async (err) => {
            this.logger.error('MongoDB connection error', err);

            // Disconnect on any error.
            mongoose.disconnect();
        });

        this.db.on('connected', async () => {
            this.logger.info('MongoDB connected successfully');
        });

        this.db.on('disconnected', async () => {
            this.logger.info('MongoDB disconnected successfully');
        });

        return mongoose.connect(dbConfig.MONGO_URL, {});
    }

    // eslint-disable-next-line class-methods-use-this
    public async disconnect(): Promise<void> {
        return mongoose.disconnect();
    }
}
