// Builtin.
import { parse } from 'url';
// 3rd party.
import Bull, { Queue } from 'bull';
import { RedisOptions } from 'ioredis';
// Internal.
import { ipcConfig } from '../../../../config';
import { Logger } from '../../../../lib/logger';

export abstract class BaseQueueRole {
    protected brokerUrl: string;

    protected routingKey: string;

    protected queue!: Queue<unknown>;

    protected logger: Logger;

    constructor(queue: string) {
        this.routingKey = queue;
        this.brokerUrl = ipcConfig.mq.URL;
        this.logger = new Logger(this.constructor.name);
        this.createQueue();
    }

    private createQueue(): void {
        const { auth, hostname, port } = parse(this.brokerUrl);
        const [username, password] = (auth ?? '').split(':');
        this.queue = new Bull(this.routingKey, {
            redis: {
                host: hostname,
                port: parseInt(port as string),
                ...(auth && { username, password }),
            } as RedisOptions,
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
        });
    }

    // eslint-disable-next-line class-methods-use-this
    public async init(): Promise<void> {
        return Promise.resolve();
    }
}
