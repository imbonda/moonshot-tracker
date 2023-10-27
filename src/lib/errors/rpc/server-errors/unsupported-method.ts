// Internal.
import { RpcServerError, RawServerError } from './server-error';

export class UnsupportedMethodError extends RpcServerError {
    constructor(err: RawServerError) {
        // Non-retryable.
        super(err, false);
    }
}
