// Internal.
import type { TrackingPipeline } from './pipeline';

export interface TokenData {
    tokenAddress?: string;
    lpTokenAddress?: string;
    links: {
        website?: string;
        telegram?: string;
        twitter?: string;
    }
}

export interface TokenTracker {
    token: TokenData;
    pipeline: TrackingPipeline;
}
