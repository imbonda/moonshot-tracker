// 3rd party.
import { Job } from 'bull';
// Internal.
import { Dal } from '../../../../dal';
import { prettyTime } from '../../../../lib/utils';
import type { ConsumeHandler, Message } from '../../../message-queue/consumer';
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
        await super.init();
        await this.scheduleCleanup();
    }

    /**
     * Register a consumption callback handler.
     *
     * @param onConsume Handler callback.
     * @returns
     */
    public async consume(onConsume: ConsumeHandler): Promise<void> {
        this.queue.process(async (job: Job) => {
            let message: Message;
            try {
                this.logger.info('Consumed new message', { age: this.getJobAge(job) });
                message = {
                    content: Buffer.from(job.data as Buffer),
                };
            } catch (err) {
                // Important: Do not "await" - to allow proper cleanup throttling.
                this.scheduleCleanup();
                throw err;
            }

            let fulfill: Promise<unknown> = new Promise(() => {});
            const ack = async () => {
                await job.takeLock().catch();
                fulfill = Promise.resolve();
            };
            const reject = async () => {
                await job.takeLock().catch();
                fulfill = Promise.reject(new Error('Failed job'));
            };

            await onConsume(message, ack, reject);
            // Defer job's success/failure till after the consumer's callback.
            await fulfill;
        });
    }

    // eslint-disable-next-line class-methods-use-this
    private getJobAge(job: Job): string {
        return prettyTime(Date.now() - job.timestamp);
    }
}
