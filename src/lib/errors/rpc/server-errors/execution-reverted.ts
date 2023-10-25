// Internal.
import { RpcServerError, RawServerError } from './server-error';

export class ExecutionRevertedError extends RpcServerError {
    constructor(err: RawServerError) {
        // Non-retryable.
        super(err, false);
    }
}
