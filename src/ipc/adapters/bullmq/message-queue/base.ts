// 3rd party.
import Bull, { Queue as BullQueue } from 'bull';
// Internal.
import { ipcConfig } from '../../../../config';
import { Logger } from '../../../../lib/logger';

export default abstract class BaseQueueRole {
    protected routingKey: string;

    protected queue: BullQueue<unknown>;

    protected brokerUrl: string;

    protected logger: Logger;

    constructor(queue: string) {
        this.routingKey = queue;
        this.brokerUrl = ipcConfig.mq.URL;
        this.queue = new Bull(this.routingKey, {
            redis: {
                path: this.brokerUrl,
            },
        });
        this.logger = new Logger(this.constructor.name);
    }

    // eslint-disable-next-line class-methods-use-this
    public init(): void {
        Promise.resolve();
    }
}
