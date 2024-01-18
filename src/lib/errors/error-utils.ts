// Internal.
import { HttpError } from './http/http-error';
import { RpcError } from './rpc/rpc-error';

export function isRetryableError(err: HttpError | RpcError) {
    return err.isRetryable;
}
