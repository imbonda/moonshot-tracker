/* eslint-disable class-methods-use-this */
// Internal.
import type { TrackingPipeline } from '../../../@types/pipeline';
import type { Scanner } from '../../../@types/scanner';
import { PipelineStage, PipelineStageStatus } from './stage';

export class Pipeline implements TrackingPipeline {
    private _stages: PipelineStage[];

    private _stageIndex: number;

    constructor() {
        this._stages = [
            this.createPipelineStage1(),
            this.createPipelineStage2(),
        ];
        this._stageIndex = 0;
    }

    private createPipelineStage1(): PipelineStage {
        const scanners: Scanner[] = [];
        return new PipelineStage(scanners, true);
    }

    private createPipelineStage2(): PipelineStage {
        const scanners: Scanner[] = [];
        return new PipelineStage(scanners);
    }

    public get stages(): PipelineStage[] {
        return this._stages;
    }

    private get currentStage(): PipelineStage {
        return this._stages[this._stageIndex];
    }

    private get isLastStage(): boolean {
        return this._stageIndex === this._stages.length - 1;
    }

    private get isStageCompleted(): boolean {
        return this.currentStage.status === PipelineStageStatus.DONE;
    }

    private get isPipelineCompleted(): boolean {
        return this.isLastStage && this.isStageCompleted;
    }

    public async execute(): Promise<void> {
        if (this.isPipelineCompleted) {
            return;
        }

        await this.currentStage.execute();

        if (this.isStageCompleted && !this.isLastStage) {
            // Advance next stage.
            this._stageIndex += 1;
        }
    }
}
