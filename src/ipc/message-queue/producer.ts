// Internal.
import QueueProducerBullMQ from '../adapters/bullmq/message-queue/producer';

export interface IQueueProducer {
    init(): Promise<void>;
    send(data: Buffer): Promise<void>;
}

export default QueueProducerBullMQ;
