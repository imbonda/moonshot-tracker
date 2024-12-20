// 3rd party.
import Bull, { type Queue, type QueueOptions } from 'bull';
// Internal.
import { ipcConfig } from '../../../../config';
import { Dal, dal } from '../../../../dal';
import { MS_IN_SECOND } from '../../../../lib/constants';
import { safe, throttle } from '../../../../lib/decorators';
import { Logger } from '../../../../lib/logger';
import { tracer, type Tracer } from '../../../static';

export const STUCK_JOB_THRESHOLD_MS = 5 * 60 * MS_IN_SECOND;

export abstract class BaseQueueRole {
    protected brokerUrl: string;

    protected routingKey: string;

    protected queue: Queue;

    protected logger: Logger;

    protected tracer: Tracer;

    constructor(queue: string) {
        this.routingKey = queue;
        this.brokerUrl = ipcConfig.mq.URL;
        this.queue = this.createQueue(this.routingKey);
        this.logger = new Logger(this.constructor.name);
        this.tracer = tracer;
    }

    // eslint-disable-next-line class-methods-use-this
    protected get redisOptions(): Dal['redis']['options'] {
        return {
            ...dal.redis.options,
        };
    }

    protected get queueOptions(): QueueOptions {
        return {
            redis: this.redisOptions,
            prefix: 'bull',
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
        };
    }

    protected createQueue(name: string): Queue {
        return new Bull(name, this.queueOptions);
    }

    @safe({ silent: true })
    @throttle({
        delayMs: STUCK_JOB_THRESHOLD_MS,
        maxConcurrent: 1,
        maxInTimeFrame: 1,
        queueSize: 1,
    })
    protected async scheduleCleanup(): Promise<void> {
        await this.cleanup();
    }

    /**
     * Perform stuck jobs cleanum on startup.
     */
    protected async cleanup(): Promise<void> {
        await this.tracer.startActiveSpan('mq.cleanup', async (span) => {
            try {
                this.logger.info('Starting cleanup stuck and old jobs');
                // Cleaning stucked jobs (e.g. after crash).
                await Promise.all([
                    this.queue.clean(STUCK_JOB_THRESHOLD_MS, 'active'),
                    this.queue.clean(STUCK_JOB_THRESHOLD_MS, 'wait'),
                    this.queue.clean(STUCK_JOB_THRESHOLD_MS, 'completed'),
                    this.queue.clean(STUCK_JOB_THRESHOLD_MS, 'failed'),
                ]);
            } finally {
                span.end();
                this.logger.info('Finished cleanup');
            }
        });
    }

    // eslint-disable-next-line class-methods-use-this
    public async init(): Promise<void> {
        return Promise.resolve();
    }
}
