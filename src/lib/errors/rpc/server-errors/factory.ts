// Internal.
import { RpcServerError, RawServerError } from './server-error';
import { ExecutionRevertedError } from './execution-reverted';
import { UnsupportedMethodError } from './unsupported-method';

const RE_EXECUTION_REVERTED = /^(execution reverted)/i;
const RE_UNSUPPORTED_METHOD = /^(the method [\w_]+ does not exist\/is not available)/i;

export function rpcServerErrorFactory(err: RawServerError) {
    const message = err.error?.message;

    if (RE_EXECUTION_REVERTED.test(message)) {
        return new ExecutionRevertedError(err);
    }

    if (RE_UNSUPPORTED_METHOD.test(message)) {
        return new UnsupportedMethodError(err);
    }

    // By default return a retryable RPC server error.
    return new RpcServerError(err, true);
}
