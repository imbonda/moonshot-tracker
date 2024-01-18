// Internal.
import { RpcError, RawRpcError } from '../rpc-error';

export interface RawCallRevertError extends RawRpcError {
    action: string,
    address: string,
    args: Array<string>,
    method: string,
    transaction: {
        [key: string]: string,
    },
}

export class CallRevertError extends RpcError {
    public readonly action: string;

    public readonly address: string;

    public readonly args: Array<string>;

    public readonly method: string;

    public readonly transaction: RawCallRevertError['transaction'];

    constructor(err: RawCallRevertError) {
        // Non-retryable.
        super(err, false);
        this.action = err.action;
        this.address = err.address;
        this.args = err.args;
        this.method = err.method;
        this.transaction = err.transaction;
    }
}
