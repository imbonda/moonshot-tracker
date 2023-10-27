// Internal.
import { BaseQueueRole } from './base';

export class QueueProducer extends BaseQueueRole {
    public async send(data: Buffer): Promise<void> {
        this.queue.add(data);
    }
}
