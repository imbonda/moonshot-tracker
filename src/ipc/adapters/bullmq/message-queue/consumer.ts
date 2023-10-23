// 3rd party.
import { DoneCallback } from 'bull';
// Internal.
import type { ConsumeHandler } from '../../../message-queue/consumer';
import { BaseQueueRole } from './base';

export class QueueConsumer extends BaseQueueRole {
    /**
     * Register a consumption callback handler.
     *
     * @param onConsume Handler callback.
     * @returns
     */
    public async consume(onConsume: ConsumeHandler): Promise<void> {
        this.queue.process(async (job, done: DoneCallback) => {
            const message = {
                content: job.data as Buffer,
            };
            await onConsume(
                message,
                async () => done(),
                async () => done(),
            );
        });
    }
}
