// Internal.
import type { Scanner } from './scanner';

export declare enum PipelineStageStatus {
    READY,
    NOT_READY,
    PENDING,
    DONE,
    FAILED,
}

export interface PipelineStage {
    scanners: Scanner[];
    status: PipelineStageStatus;
}

export interface TrackingPipeline {
    stages: PipelineStage[];
}
