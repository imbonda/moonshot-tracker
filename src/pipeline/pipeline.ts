/* eslint-disable class-methods-use-this */
// Internal.
import type { TrackingPipeline } from '../@types/pipeline';
import type { Scanner } from '../@types/scanner';
import { PipelineStage } from './stage';

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

    public async execute(): Promise<void> {
        await this.currentStage.execute();
        // TODO: check advancing next stage.
    }
}
