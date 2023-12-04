// Internal.
import type { TrackedToken } from '../../../@types/tracking';
import { Logger } from '../../../lib/logger';
import { mergeDeep } from '../../../lib/utils';
import { tracer, type Tracer } from '../static';
import { StageExecutor } from './stage';
import type { TasksById } from './task';

export class PipelineExecutor {
    private token: TrackedToken;

    private stages: StageExecutor[];

    private tasksById: TasksById;

    private currentStageIndex: number;

    private logger: Logger;

    private tracer: Tracer;

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
        this.logger = new Logger(
            this.constructor.name,
            { token: token.address },
        );
        this.tracer = tracer;
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
        return this.currentStage.completed;
    }

    public get completed(): boolean {
        return this.isLastStage && this.isStageCompleted;
    }

    public async execute(): Promise<void> {
        if (this.completed) {
            return;
        }

        await this.tracer.startActiveSpan('pipeline', async (span) => {
            try {
                this.logger.info('Execution started');

                await Promise.all(
                    this.stages.map((stage) => stage.execute()),
                );

                if (!this.isLastStage) {
                    this.nextStage!.attemptUnlock(this.tasksById);
                    if (this.nextStage!.unlocked) {
                        this.currentStageIndex += 1;
                    }
                }
            } finally {
                span.end();
                this.logger.info('Execution ended');
            }
        });
    }

    public get result(): TrackedToken {
        const stagesData = this.stages.map((stage) => stage.toJSON());
        const tasks = Object.values(this.tasksById);
        const tasksData = Object.fromEntries(
            tasks.map((task) => [task.id, task.toJSON()]),
        );
        const aborted = tasks.some((task) => task.aborted);
        const tracking = !this.completed && !aborted;
        const insights = mergeDeep(this.token.insights, ...tasks.map((task) => task.insight));
        const scheduledExecutionTime = Object.values(tasksData).reduce(
            (soonest: Date | undefined, task) => {
                const scheduledTime = task.scheduledExecutionTime;
                if (!soonest || !scheduledTime) {
                    return soonest ?? scheduledTime;
                }
                return (soonest < scheduledTime)
                    ? soonest
                    : scheduledTime;
            },
            undefined,
        ) as Date;

        return {
            ...this.token,
            tracking,
            pipeline: stagesData,
            tasks: tasksData,
            insights,
            aborted,
            completed: this.completed,
            currentStageIndex: this.currentStageIndex,
            latestExecutionTime: new Date(),
            scheduledExecutionTime,
        };
    }
}
