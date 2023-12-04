// 3rd party.
import { Job } from 'bull';
// Internal.
import { Dal } from '../../../../dal';
import type { ConsumeHandler } from '../../../message-queue/consumer';
import { BaseQueueRole } from './base';

export class QueueConsumer extends BaseQueueRole {
    protected get redisOptions(): Dal['redis']['options'] {
        const options = super.redisOptions;
        return {
            ...options,
            enableOfflineQueue: true,
            maxRetriesPerRequest: null,
        };
    }

    public async init(): Promise<void> {
        await this.cleanup();
    }

    /**
     * Register a consumption callback handler.
     *
     * @param onConsume Handler callback.
     * @returns
     */
    public async consume(onConsume: ConsumeHandler): Promise<void> {
        this.queue.process(async (job: Job) => {
            const message = {
                content: Buffer.from(job.data as Buffer),
            };

            let fulfill: Promise<unknown> = new Promise(() => {});
            const ack = async () => {
                await job.takeLock();
                fulfill = Promise.resolve();
            };
            const reject = async () => {
                await job.takeLock();
                fulfill = Promise.reject(new Error('Failed job'));
            };

            await onConsume(message, ack, reject);
            // Defer job's success/failure till after the consumer's callback.
            await fulfill;
        });
    }
}
