// Builtin.
import v8 from 'v8';
// Internal.
import type { TrackedToken } from '../../@types/tracking';
import { dal } from '../../dal/dal';
import { TRACKING_QUEUE } from '../../ipc/message-queue/constants';
import { QueueConsumer } from '../../ipc/message-queue/consumer';
import { telegram } from '../../lib/notifications/telegram';
import { pretifyNumber } from '../../lib/utils';
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
                const trackedToken = v8.deserialize(msg.content);
                await this.track(trackedToken);
                await ack();
            } catch (err) {
                this.logger.error(err);
                await reject(false);
            }
        });
    }

    private async track(token: TrackedToken): Promise<void> {
        const pipeline = new PipelineExecutor(token);
        await pipeline.execute();
        const { result } = pipeline;
        if (pipeline.completed) {
            await this.notifyMoonShotToken(result);
        }
        await dal.models.trackedToken.upsertTrackedToken(pipeline.result);
    }

    private async notifyMoonShotToken(token: TrackedToken): Promise<void> {
        await telegram.sendNotification(this.formatMoonShotMessage(token));
    }

    // eslint-disable-next-line class-methods-use-this
    private formatMoonShotMessage(token: TrackedToken): string {
        const dextoolsInsights = token.insights.dextools!;
        const { name, symbol } = dextoolsInsights.properties;
        const { fdv, mcap } = dextoolsInsights.metrics;
        const { liquidity: topPairLiquidity } = dextoolsInsights.topPair.metrics;
        const explorerLink = dextoolsInsights.topPair.url;

        return '🚀✨<b>Moonshot-Token</b>🚀✨\n'
            + `${name} [${symbol}]\n`
            + '\n'
            + `Mktcap: $${pretifyNumber(mcap)}\n`
            + `Fully Diluted: $${pretifyNumber(fdv)}\n`
            + `Top Pair Liquidity: ${pretifyNumber(topPairLiquidity)}\n`
            + '\n'
            + `${explorerLink}`;
    }
}
