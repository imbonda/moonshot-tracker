// Internal.
import { BaseQueueRole } from './base';

export class QueueProducer extends BaseQueueRole {
    public async send(data: Buffer): Promise<void> {
        this.channel.publish(
            this.exchange,
            this.routingKey,
            data,
            { persistent: true },
        );
    }
}
