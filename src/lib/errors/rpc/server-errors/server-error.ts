// Internal.
import { RpcError, RawRpcError } from '../rpc-error';

export interface RawServerError extends RawRpcError {
    body: string,
    error: Error & { code: number, data: string },
    requestBody: string,
    requestMethod: string,
    url: string,
}

export class RpcServerError extends RpcError {
    public body: string;

    public data: string;

    public errorCode: number;

    public requestBody: string;

    public requestMethod: string;

    public url: string;

    constructor(err: RawServerError, retryable: boolean) {
        super(err, retryable);
        this.body = err.body;
        this.data = err.error?.data;
        this.errorCode = err.error?.code;
        this.requestBody = err.requestBody;
        this.requestMethod = err.requestMethod;
        this.url = err.url;
    }
}
