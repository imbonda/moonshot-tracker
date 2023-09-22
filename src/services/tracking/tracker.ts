// Internal.
import type { TokenUpdateEvent } from '../../@types/transfer';
import type { TrackingPipeline } from '../../@types/pipeline';
import type { TokenData, TokenTracker } from '../../@types/tracker';
import { Pipeline } from './pipeline/pipeline';

export enum TokenUpdateEventType {
    LP_TOKEN_CREATED = 1,
    LP_TOKEN_BURNED = 2,
}

export class Tracker implements TokenTracker {
    private _token: TokenData;

    private _pipeline: TrackingPipeline;

    constructor(address: string) {
        this._token = {
            tokenAddress: address,
            links: {},
        };
        this._pipeline = new Pipeline();
    }

    public get token(): TokenData {
        return this._token;
    }

    public get pipeline(): TrackingPipeline {
        return this._pipeline;
    }

    // eslint-disable-next-line class-methods-use-this
    public ingest(event: TokenUpdateEvent): void {
        switch (event.type) {
            case TokenUpdateEventType.LP_TOKEN_BURNED:
                break;
            default:
                break;
        }
    }
}
