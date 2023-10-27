// Internal.
import type { TrackedToken } from '../../@types/tracking';
import { dal } from '../../dal/dal';
import { TRACKING_QUEUE } from '../../ipc/message-queue/constants';
import { QueueConsumer } from '../../ipc/message-queue/consumer';
import { Service } from '../service';
import { PipelineExecutor } from './executors/pipeline';

export class TrackingAgent extends Service {
    private consumer: QueueConsumer;

    constructor() {
        super();
        this.consumer = new QueueConsumer(TRACKING_QUEUE);
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
        this.consumer.consume(async (msg, ack, reject) => {
            if (!msg) {
                this.logger.info('Consumed empty message');
                return;
            }

            try {
                const trackedToken = JSON.parse(msg.content.toString());
                await this.track(trackedToken);
                await ack();
            } catch (err) {
                this.logger.error(err);
                await reject(false);
            }
        });
    }

    // eslint-disable-next-line class-methods-use-this
    private async track(token: TrackedToken): Promise<void> {
        const pipeline = new PipelineExecutor(token);
        await pipeline.execute();
        await dal.models.trackedToken.upsertTrackedToken(pipeline.result);
    }
}
