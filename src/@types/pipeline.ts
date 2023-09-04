export declare enum PipelineStageStatus {
    READY,
    NOT_READY,
    PENDING,
    DONE,
    FAILED,
}

export interface PipelineStage {
    status: PipelineStageStatus;
    execute: () => Promise<void>;
}

export interface TrackingPipeline {
    stages: PipelineStage[];
}
