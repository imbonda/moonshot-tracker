export interface RawNetworkingError extends Error {
    code: string,
}

export abstract class NetworkingError extends Error {
    public readonly code: string;

    public readonly message: string;

    public readonly isRetryable: boolean;

    constructor(err: RawNetworkingError, retryable: boolean) {
        super();

        this.code = err.code;
        this.message = err.message;
        this.isRetryable = retryable;
    }
}
