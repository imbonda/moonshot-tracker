// Builtin.
import v8 from 'v8';
// Internal.
import type { TrackedToken } from '../../@types/tracking';
import { dal } from '../../dal/dal';
import type { QueryRangeParams } from '../../dal/types';
import { TRACKING_QUEUE } from '../../ipc/message-queue/constants';
import { QueueProducer } from '../../ipc/message-queue/producer';
import { safe } from '../../lib/decorators';
import { Service } from '../service';

const SCHEDULING_INTERVAL_MS = 1 * 60 * 1000; // 1 minute.

export class TrackingScheduler extends Service {
    private producer: QueueProducer;

    constructor() {
        super();
        this.producer = new QueueProducer(TRACKING_QUEUE);
    }

    // eslint-disable-next-line class-methods-use-this
    public async setup(): Promise<void> {
        await dal.connect();
    }

    // eslint-disable-next-line class-methods-use-this
    public async teardown(): Promise<void> {
        await dal.disconnect();
    }

    public async start(): Promise<void> {
        await this.schedule();
    }

    @safe()
    async schedule(): Promise<void> {
        const range: QueryRangeParams = {
            endDate: new Date(),
        };

        let paginated = await dal.models.trackedToken.findScheduledTrackedTokens({
            range,
        });
        while (paginated.page.length) {
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(
                paginated.page.map(this.sendToQueue.bind(this)),
            );
            // eslint-disable-next-line no-await-in-loop
            paginated = await dal.models.trackedToken.findScheduledTrackedTokens({
                range: {
                    ...range,
                    pageNumber: paginated.pageNumber + 1,
                },
            });
        }

        setTimeout(
            this.schedule.bind(this),
            SCHEDULING_INTERVAL_MS,
        );
    }

    @safe()
    private async sendToQueue(token: TrackedToken): Promise<void> {
        await this.producer.send(v8.serialize(token));
    }
}
