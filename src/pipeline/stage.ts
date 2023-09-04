// Internal.
import type { PipelineStage as IPipelineStage } from '../@types/pipeline';
import type { Scanner } from '../@types/scanner';

export enum PipelineStageStatus {
    READY,
    NOT_READY,
    PENDING,
    DONE,
    FAILED,
}

export class PipelineStage implements IPipelineStage {
    private _status: PipelineStageStatus;

    private _scanners: Scanner[];

    constructor(scanners: Scanner[], isReady: boolean = false) {
        this._scanners = scanners;
        this._status = isReady
            ? PipelineStageStatus.READY
            : PipelineStageStatus.NOT_READY;
    }

    public async execute(): Promise<void> {
        await Promise.all(
            this._scanners.map((scanner) => scanner.scan()),
        );
    }

    public get status(): PipelineStageStatus {
        return this._status;
    }

    public set status(value: PipelineStageStatus) {
        this._status = value;
    }
}
