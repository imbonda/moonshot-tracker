// Internal.
import { InvalidArgumentError, RawInvalidArgumentError } from './argument-errors/invalid-argument';
import { CallRevertError, RawCallRevertError } from './call-errors/call-revert';
import { RpcNetworkError, RawNetworkError } from './network-errors/network-error';
import { RpcError, RawRpcError } from './rpc-error';
import { rpcServerErrorFactory } from './server-errors/factory';
import type { RawServerError } from './server-errors/server-error';

export function rpcErrorFactory(err: RawRpcError): RpcError {
    switch (err.code) {
        case 'CALL_EXCEPTION':
            // Non-retryable.
            return new CallRevertError(err as RawCallRevertError);
        case 'INVALID_ARGUMENT':
            // Non-retryable.
            return new InvalidArgumentError(err as RawInvalidArgumentError);
        case 'NETWORK_ERROR':
            // Retryable.
            return new RpcNetworkError(err as RawNetworkError);
        case 'SERVER_ERROR':
            // Either retryable or non-retryable.
            return rpcServerErrorFactory(err as RawServerError);
        default:
            // By default return a retryable RPC error.
            return new RpcError(err, true);
    }
}
