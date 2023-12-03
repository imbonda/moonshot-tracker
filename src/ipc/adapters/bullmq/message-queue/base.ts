// 3rd party.
import Bull, { Queue } from 'bull';
// Internal.
import { ipcConfig } from '../../../../config';
import { Dal, dal } from '../../../../dal';
import { Logger } from '../../../../lib/logger';

export abstract class BaseQueueRole {
    protected brokerUrl: string;

    protected routingKey: string;

    protected queue: Queue;

    protected logger: Logger;

    constructor(queue: string) {
        this.routingKey = queue;
        this.brokerUrl = ipcConfig.mq.URL;
        this.logger = new Logger(this.constructor.name);
        this.queue = this.createQueue(this.routingKey);
    }

    // eslint-disable-next-line class-methods-use-this
    protected get redisOptions(): Dal['redis']['options'] {
        return {
            ...dal.redis.options,
        };
    }

    protected createQueue(name: string): Queue {
        return new Bull(
            name,
            {
                redis: this.redisOptions,
                defaultJobOptions: {
                    removeOnComplete: {
                        // Do not keep completed jobs.
                        count: 0,
                    },
                    removeOnFail: {
                        // Do not keep failed jobs.
                        count: 0,
                    },
                },
                settings: {
                    stalledInterval: 0,
                    maxStalledCount: 0,
                },
            },
        );
    }

    // eslint-disable-next-line class-methods-use-this
    public async init(): Promise<void> {
        return Promise.resolve();
    }
}
