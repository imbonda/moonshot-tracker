// Internal.
import { RpcError, RawRpcError } from '../rpc-error';

export interface RawNetworkError extends RawRpcError {
    event: string,
}

export class RpcNetworkError extends RpcError {
    public readonly event: string;

    constructor(err: RawNetworkError) {
        // Retryable.
        super(err, true);
        this.event = err.event;
    }
}
