// 3rd party.
import { Job } from 'bull';
// Internal.
import type { ConsumeHandler } from '../../../message-queue/consumer';
import { BaseQueueRole } from './base';
import { MS_IN_SECOND } from '../../../../lib/constants';

export class QueueConsumer extends BaseQueueRole {
    /**
     * Perform stuck jobs cleanum on startup.
     */
    public async init(): Promise<void> {
        const STUCK_JOB_THRESHOLD_MS = 5 * 60 * MS_IN_SECOND;
        // Cleaning stucked jobs (e.g. after crash).
        await Promise.all([
            this.queue.clean(STUCK_JOB_THRESHOLD_MS, 'active'),
            this.queue.clean(STUCK_JOB_THRESHOLD_MS, 'wait'),
        ]);
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
