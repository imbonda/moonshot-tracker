// Internal.
import { RpcError, RawRpcError } from '../rpc-error';

export interface RawInvalidArgumentError extends RawRpcError {
    argument: string,
    value: string,
}

export class InvalidArgumentError extends RpcError {
    public readonly argument: string;

    public readonly value: string;

    constructor(err: RawInvalidArgumentError) {
        // Non-retryable.
        super(err, false);
        this.argument = err.argument;
        this.value = err.value;
    }
}
