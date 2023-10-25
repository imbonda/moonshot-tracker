// Internal.
import { NetworkingError, RawNetworkingError } from '../networking-error';

export interface RawRpcError extends RawNetworkingError {
    reason: string,
}

export class RpcError extends NetworkingError {
    public readonly reason: string;

    constructor(err: RawRpcError, retryable: boolean) {
        super(err, retryable);
        this.reason = err.reason;
    }
}
