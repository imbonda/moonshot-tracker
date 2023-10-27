// Internal.
import { RawNetworkingError } from '../networking-error';
import { HttpError } from './http-error';

export function httpErrorFactory(err: RawNetworkingError): HttpError {
    if (err instanceof TypeError) {
        // Non-retryable.
        return new HttpError(err, false);
    }
    // By default return a retryable HTTP error.
    return new HttpError(err, true);
}
