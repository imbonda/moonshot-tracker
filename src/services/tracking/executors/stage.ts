// Internal.
import type { TrackedToken, PipelineStage } from '../../../@types/tracking';
import { Logger } from '../../../lib/logger';
import { StageState, tracer, type Tracer } from '../static';
import { TaskFactory } from '../tasks/task-factory';
import { type ContextExecutor } from './context';
import { TaskExecutor } from './task';

export class StageExecutor {
    private stage: PipelineStage;

    private stageState: StageState;

    private stageTasks: TaskExecutor[];

    private logger: Logger;

    private tracer: Tracer;

    constructor(token: TrackedToken, stage: PipelineStage) {
        this.stage = stage;
        this.stageState = this.stage.state as StageState;
        this.stageTasks = stage.taskIds.map(
            (taskId) => TaskFactory.createTask(token, token.tasks[taskId]),
        );
        this.logger = new Logger(
            this.constructor.name,
            {
                token: token.address,
                stageId: this.id,
            },
        );
        this.tracer = tracer;
    }

    public get unlocked(): boolean {
        return this.stageState === StageState.UNLOCKED;
    }

    public get halted(): boolean {
        return this.stageState === StageState.HALTED;
    }

    public get completed(): boolean {
        return this.stageState === StageState.DONE;
    }

    public get tasks(): TaskExecutor[] {
        return this.stageTasks;
    }

    private get id(): PipelineStage['stageId'] {
        return this.stage.stageId;
    }

    private get state(): PipelineStage['state'] {
        return this.stageState;
    }

    private get notStarted(): boolean {
        return this.stageState === StageState.LOCKED
            || this.stageState === StageState.UNLOCKED;
    }

    public async execute(context: ContextExecutor): Promise<void> {
        const tasksToExecute = this.tasks.filter((task) => task.shouldExecute);
        const shouldExecute = tasksToExecute.length > 0;
        if (!shouldExecute) {
            return;
        }

        await this.tracer.startActiveSpan('stage', async (span) => {
            try {
                span.setAttributes({ stageId: this.id });
                this.logger.info('Execution started');

                if (this.notStarted) {
                    this.stageState = StageState.IN_PROGRESS;
                }

                await Promise.all(
                    tasksToExecute.map((task) => context.execute(task.id)),
                );

                const halted = this.tasks.every((task) => task.halted);
                const completed = this.tasks.every((task) => task.completed);
                if (halted) {
                    this.stageState = StageState.HALTED;
                }
                if (completed) {
                    this.stageState = StageState.DONE;
                }
            } finally {
                span.end();
                this.logger.info('Execution ended');
            }
        });
    }

    public attemptUnlock(context: ContextExecutor): void {
        if (this.state !== StageState.LOCKED) {
            return;
        }

        const unlocked = this.stage.prerequisiteTasks.every(
            (taskId) => context.isTaskCompleted(taskId),
        );

        if (unlocked) {
            this.stageState = StageState.UNLOCKED;
            this.tasks.forEach((task) => task.setActivated());
        }
    }

    public toJSON(): PipelineStage {
        return {
            ...this.stage,
            state: this.state,
        };
    }
}
