// Internal.
import type { TrackedToken, PipelineStage } from '../../../@types/tracking';
import { Logger } from '../../../lib/logger';
import { StageState } from '../static';
import { TaskFactory } from '../tasks/task-factory';
import { type TasksById, TaskExecutor } from './task';

const EXECUTABLE_STATES = new Set<string>([
    StageState.UNLOCKED,
    StageState.IN_PROGRESS,
]);

export class StageExecutor {
    private stage: PipelineStage;

    private stageState: StageState;

    private stageTasks: TaskExecutor[];

    private logger: Logger;

    constructor(token: TrackedToken, stage: PipelineStage) {
        this.stage = stage;
        this.stageState = this.stage.state as StageState;
        this.stageTasks = stage.taskIds.map(
            (taskId) => TaskFactory.createTask(token, token.tasks[taskId]),
        );
        this.logger = new Logger(this.constructor.name);
    }

    public get unlocked(): boolean {
        return this.stageState === StageState.UNLOCKED;
    }

    public get completed(): boolean {
        return this.stageState === StageState.DONE;
    }

    public get tasks(): TaskExecutor[] {
        return this.stageTasks;
    }

    private get state(): PipelineStage['state'] {
        return this.stageState;
    }

    private get shouldExecute(): boolean {
        return EXECUTABLE_STATES.has(this.stageState);
    }

    public async execute(): Promise<void> {
        if (!this.shouldExecute) {
            return;
        }

        this.logger.info('Execution started');

        this.stageState = StageState.IN_PROGRESS;

        await Promise.all(
            this.stageTasks.map((task) => task.execute()),
        );

        const completedAllTasks = this.stageTasks.every((task) => task.completed);
        if (completedAllTasks) {
            this.stageState = StageState.DONE;
        }

        this.logger.info('Execution ended');
    }

    public attemptUnlock(tasksById: TasksById): void {
        if (this.state !== StageState.LOCKED) {
            return;
        }

        const unlocked = this.stage.prerequisiteTasks.every(
            (taskId) => tasksById[taskId]?.completed,
        );

        if (unlocked) {
            this.stageState = StageState.UNLOCKED;
            this.stageTasks.forEach((task) => task.setActivated());
        }
    }

    public toJSON(): PipelineStage {
        return {
            ...this.stage,
            state: this.state,
        };
    }
}
