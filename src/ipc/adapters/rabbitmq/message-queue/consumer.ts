// 3rd party.
import amqp from 'amqplib/callback_api';
// Internal.
import type { ConsumeHandler } from '../../../message-queue/consumer';
import BaseQueueRole from './base';

export class QueueConsumer extends BaseQueueRole {
    protected async onExchangeReady(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.channel.assertQueue(
                this.routingKey,
                { durable: true },
                async (queueErr: Error, _ok: amqp.Replies.AssertQueue) => {
                    if (queueErr) {
                        return reject(queueErr);
                    }

                    try {
                        this.channel.bindQueue(
                            this.routingKey,
                            this.exchange,
                            this.routingKey,
                        );

                        // Telling RabbitMQ not to give more than one message at a time.
                        this.channel.prefetch(1);

                        return resolve();
                    } catch (err) {
                        return reject(err);
                    }
                },
            );
        });
    }

    /**
     * Register a consumption callback handler.
     *
     * @param onConsume Handler callback.
     * @returns
     */
    public async consume(onConsume: ConsumeHandler): Promise<void> {
        const ack = this.channel.ack.bind(this.channel);
        const reject = this.channel.reject.bind(this.channel);

        this.channel.consume(
            this.routingKey,
            async (message: amqp.Message | null) => {
                await onConsume(
                    message,
                    async () => ack(message as amqp.Message),
                    async (requeue?: boolean) => reject(message as amqp.Message, requeue),
                );
            },
            { noAck: false, exclusive: false },
        );
    }
}
