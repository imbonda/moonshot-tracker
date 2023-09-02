/* eslint-disable class-methods-use-this */
// Internal.
import type {
    TrackingPipeline,
    PipelineStage,
} from '../@types/pipeline';

enum PipelineStageStatus {
    READY,
    NOT_READY,
    PENDING,
    DONE,
    FAILED,
}

export class Pipeline implements TrackingPipeline {
    private _stages: PipelineStage[];

    constructor() {
        this._stages = [
            this.createPipelineStage1(),
            this.createPipelineStage2(),
        ];
    }

    private createPipelineStage1(): PipelineStage {
        return {
            scanners: [],
            status: PipelineStageStatus.READY,
        };
    }

    private createPipelineStage2(): PipelineStage {
        return {
            scanners: [],
            status: PipelineStageStatus.NOT_READY,
        };
    }

    get stages() {
        return this._stages;
    }
}
