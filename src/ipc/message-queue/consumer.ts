// Internal.
export { QueueConsumer } from '../adapters/bullmq/message-queue/consumer';

export interface Message {
    content: Buffer;
}

export type ChannelAck = () => Promise<void>;
export type ChannelReject = (requeue?: boolean | undefined) => Promise<void>;
export type ConsumeHandler = (
    message: Message | null,
    ack: ChannelAck,
    reject: ChannelReject
) => Promise<void>;

export interface IQueueConsumer {
    init(): Promise<void>;
    consume(onConsume: ConsumeHandler): Promise<void>;
}
