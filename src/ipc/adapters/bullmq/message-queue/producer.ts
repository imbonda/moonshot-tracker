// Internal.
import { Dal } from '../../../../dal';
import { MS_IN_SECOND } from '../../../../lib/constants';
import { BaseQueueRole, STUCK_JOB_THRESHOLD_MS } from './base';

export class QueueProducer extends BaseQueueRole {
    protected get redisOptions(): Dal['redis']['options'] {
        const options = super.redisOptions;
        return {
            ...options,
            enableOfflineQueue: false,
        };
    }

    public async send(data: Buffer): Promise<void> {
        const job = await this.queue.add(data);
        // Set ttl on jobs to prevent stuck jobs from flooding the queue.
        const key = `${this.queueOptions.prefix}:${job.queue.name}:${job.id}`;
        const ttl = STUCK_JOB_THRESHOLD_MS / MS_IN_SECOND;
        await this.queue.client.expire(key, ttl);
    }
}
