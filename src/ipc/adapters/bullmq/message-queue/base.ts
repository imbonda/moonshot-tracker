// Builtin.
import { parse } from 'url';
// 3rd party.
import Bull, { Queue as BullQueue } from 'bull';
import { RedisOptions } from 'ioredis';
// Internal.
import { ipcConfig } from '../../../../config';
import { Logger } from '../../../../lib/logger';

export abstract class BaseQueueRole {
    protected routingKey: string;

    protected queue: BullQueue<unknown>;

    protected brokerUrl: string;

    protected logger: Logger;

    constructor(queue: string) {
        this.routingKey = queue;
        this.brokerUrl = ipcConfig.mq.URL;
        this.logger = new Logger(this.constructor.name);
        this.createQueue();
    }

    private createQueue(): void {
        const { hostname, port, auth } = parse(this.brokerUrl);
        const [username, password] = (auth ?? '').split(':');
        this.queue = new Bull(this.routingKey, {
            redis: {
                host: hostname,
                port: parseInt(port as string),
                ...(auth && { username, password }),
            } as RedisOptions,
        });
    }

    // eslint-disable-next-line class-methods-use-this
    public async init(): Promise<void> {
        return Promise.resolve();
    }
}
