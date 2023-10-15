// Internal.
import type { TrackedToken } from '../../../@types/tracking';
import { Logger } from '../../../lib/logger';
import { mergeDeep } from '../../../lib/utils';
import { StageExecutor } from './stage';
import type { TasksById } from './task';

export class PipelineExecutor {
    private token: TrackedToken;

    private stages: StageExecutor[];

    private tasksById: TasksById;

    private currentStageIndex: number;

    private logger: Logger;

    constructor(token: TrackedToken) {
        this.token = token;
        this.stages = token.pipeline.map(
            (stage) => new StageExecutor(token, stage),
        );
        this.tasksById = this.stages.reduce((accum: TasksById, stage: StageExecutor) => {
            stage.tasks.forEach((task) => {
                accum[task.id] = task;
            });
            return accum;
        }, {});
        this.currentStageIndex = this.token.currentStageIndex;
        this.logger = new Logger(this.constructor.name);
    }

    private get currentStage(): StageExecutor {
        return this.stages[this.currentStageIndex];
    }

    private get nextStage(): StageExecutor | undefined {
        return this.stages[this.currentStageIndex + 1];
    }

    private get isLastStage(): boolean {
        return this.currentStageIndex === this.token.pipeline.length - 1;
    }

    private get isStageCompleted(): boolean {
        return this.currentStage.isCompleted;
    }

    private get isPipelineCompleted(): boolean {
        return this.isLastStage && this.isStageCompleted;
    }

    public async execute(): Promise<void> {
        if (this.isPipelineCompleted) {
            return;
        }

        await Promise.all(
            this.stages.map((stage) => stage.execute()),
        );

        if (!this.isLastStage) {
            this.nextStage!.attemptUnlock(this.tasksById);
            if (this.nextStage!.isUnlocked) {
                this.currentStageIndex += 1;
            }
        }
    }

    public get result(): TrackedToken {
        const stagesData = this.stages.map((stage) => stage.toJSON());
        const tasks = Object.values(this.tasksById);
        const tasksData = Object.fromEntries(
            tasks.map((task) => [task.id, task.toJSON()]),
        );
        const insights = mergeDeep(
            tasks.map((task) => task.insight),
        );
        const scheduledExecutionTime = Object.values(tasksData).reduce(
            (soonest: Date | null, task) => {
                const scheduledTime = task.scheduledExecutionTime;
                return (soonest && (soonest < scheduledTime))
                    ? soonest
                    : scheduledTime;
            },
            null,
        ) as Date;

        return {
            ...this.token,
            pipeline: stagesData,
            tasks: tasksData,
            insights,
            currentStageIndex: this.currentStageIndex,
            latestExecutionTime: new Date(),
            scheduledExecutionTime,
        };
    }
}
