// 3rd party.
import amqp from 'amqplib/callback_api';
// Internal.
import { ipcConfig } from '../../../../config';
import { Logger } from '../../../../lib/logger';

export default abstract class BaseQueueRole {
    protected brokerUrl: string;

    protected exchange: string;

    protected routingKey: string;

    protected conn!: amqp.Connection;

    protected channel!: amqp.Channel;

    protected logger: Logger;

    constructor(queue: string) {
        this.routingKey = queue;
        this.brokerUrl = ipcConfig.mq.URL;
        this.exchange = ipcConfig.mq.EXCHANGE;
        this.logger = new Logger(this.constructor.name);
    }

    public async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            amqp.connect(this.brokerUrl, async (connErr: Error, conn: amqp.Connection) => {
                if (connErr) {
                    return reject(connErr);
                }

                try {
                    return resolve(await this.onConnection(conn));
                } catch (err) {
                    return reject(err);
                }
            });
        });
    }

    protected async onConnection(conn: amqp.Connection): Promise<void> {
        this.conn = conn;

        return new Promise((resolve, reject) => {
            this.conn.createChannel((channelErr: Error, channel: amqp.Channel) => {
                if (channelErr) {
                    return reject(channelErr);
                }

                try {
                    return resolve(this.onChannelCreated(channel));
                } catch (err) {
                    return reject(err);
                }
            });
        });
    }

    protected async onChannelCreated(channel: amqp.Channel): Promise<void> {
        this.channel = channel;

        return new Promise((resolve, reject) => {
            this.channel.assertExchange(
                this.exchange,
                'direct',
                { durable: true },
                async (exchangeErr: Error, ok: amqp.Replies.AssertExchange) => {
                    if (exchangeErr) {
                        return reject(exchangeErr);
                    }

                    try {
                        return resolve(await this.onExchangeReady());
                    } catch (err) {
                        return reject(err);
                    }
                },
            );
        });
    }

    // eslint-disable-next-line class-methods-use-this
    protected async onExchangeReady(): Promise<void> {
        // Ready for producing, or setting consuming logic.
    }
}
