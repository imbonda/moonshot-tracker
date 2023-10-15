// Internal.
import type { TrackedToken } from '../../@types/tracking';
import { dal } from '../../dal/dal';
import { TRACKING_QUEUE } from '../../ipc/message-queue/constants';
import { QueueProducer } from '../../ipc/message-queue/producer';
import { safe } from '../../lib/decorators';
import { Service } from '../service';

const SCHEDULING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes.

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
        const range = {
            startDate: new Date(),
        };

        let paginated = await dal.models.trackedToken.findScheduledTrackedTokens({
            range,
        });
        while (paginated.page.length) {
            paginated.page.forEach(this.sendToQueue.bind(this));
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
        await this.producer.send(Buffer.from(JSON.stringify(token)));
    }
}
