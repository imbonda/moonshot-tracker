// Builtin.
import v8 from 'v8';
// Internal.
import type { TrackedToken } from '../../@types/tracking';
import { dal, type TrackedTokenQueryParams } from '../../dal';
import type { Paginated } from '../../dal/types';
import { TRACKING_QUEUE } from '../../ipc/message-queue/constants';
import { QueueProducer } from '../../ipc/message-queue/producer';
import { safe } from '../../lib/decorators';
import { Service } from '../service';

const SCHEDULING_INTERVAL_MS = 1 * 60 * 1000; // 1 minute.
const SCHEDULING_LOCK_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes.

export class TrackingScheduler extends Service {
    private producer: QueueProducer;

    constructor() {
        super();
        this.producer = new QueueProducer(TRACKING_QUEUE);
    }

    // eslint-disable-next-line class-methods-use-this
    public async setup(): Promise<void> {
        await dal.connect({ noRedis: true });
        await this.producer.init();
    }

    // eslint-disable-next-line class-methods-use-this
    public async teardown(): Promise<void> {
        await dal.disconnect();
    }

    public async start(): Promise<void> {
        await this.schedulePeriodically();
    }

    async schedulePeriodically(): Promise<void> {
        await this.tracer.startActiveSpan('schedule', { root: true }, async (span) => {
            await this.schedule().finally(() => span.end());
        });

        setTimeout(
            this.schedulePeriodically.bind(this),
            SCHEDULING_INTERVAL_MS,
        );
    }

    @safe()
    async schedule(): Promise<void> {
        const range = {
            endDate: new Date(),
        };
        const set = {
            // Locking the tokens until the tracking request is completes or the lock expires.
            schedulerLockDuration: SCHEDULING_LOCK_EXPIRATION_MS,
        };

        let paginated = await this.findScheduledTrackedTokens({ range, set });
        while (paginated.page.length) {
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(
                paginated.page.map(this.scheduleTokenTracking.bind(this)),
            );
            // eslint-disable-next-line no-await-in-loop
            paginated = await this.findScheduledTrackedTokens({
                range: {
                    ...range,
                    pageNumber: paginated.pageNumber + 1,
                },
                set,
            });
        }
    }

    private async findScheduledTrackedTokens(
        { range, set }: TrackedTokenQueryParams,
    ): Promise<Paginated<TrackedToken>> {
        return this.tracer.startActiveSpan('findScheduledTrackedTokens', async (span) => {
            try {
                return await dal.models.trackedToken.findScheduledTrackedTokens({ range, set });
            } finally {
                span.end();
            }
        });
    }

    @safe()
    private async scheduleTokenTracking(token: TrackedToken): Promise<void> {
        this.logger.info('Scheduling tracked token', {
            chainId: token.chainId,
            token: token.address,
        });
        // Send to queue.
        await this.producer.send(v8.serialize(token));
    }
}
