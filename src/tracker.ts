// Internal.
import type { TrackingPipeline } from './@types/pipeline';
import type { TokenData, TokenTracker } from './@types/tracker';
import { Pipeline } from './pipeline/pipeline';

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

    get token(): TokenData {
        return this._token;
    }

    get pipeline(): TrackingPipeline {
        return this._pipeline;
    }
}
