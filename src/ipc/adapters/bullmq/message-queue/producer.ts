// Internal.
import { Dal } from '../../../../dal';
import { BaseQueueRole } from './base';

export class QueueProducer extends BaseQueueRole {
    protected get redisOptions(): Dal['redis']['options'] {
        const options = super.redisOptions;
        return {
            ...options,
            enableOfflineQueue: false,
        };
    }

    public async send(data: Buffer): Promise<void> {
        await this.queue.add(data);
    }
}
