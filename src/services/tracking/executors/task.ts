// Internal.
import type { TaskData, TrackedToken } from '../../../@types/tracking';
import { Logger } from '../../../lib/logger';
import { TaskState } from '../static';

export abstract class TaskExecutor {
    protected token: TrackedToken;

    protected taskData: TaskData;

    protected taskState: TaskState;

    protected repetition: number;

    protected logger: Logger;

    constructor(token: TrackedToken, taskData: TaskData) {
        this.token = token;
        this.taskData = taskData;
        this.taskState = taskData.state as TaskState;
        this.repetition = taskData.repetitions.count;
        this.logger = new Logger(this.constructor.name);
    }

    public get id(): TaskData['taskId'] {
        return this.taskData.taskId;
    }

    public get isCompleted(): boolean {
        return this.taskState === TaskState.DONE;
    }

    protected setCompleted(): void {
        this.taskState = TaskState.DONE;
    }

    private get state(): TaskData['state'] {
        return this.taskState;
    }

    private get data(): TaskData {
        return this.taskData;
    }

    private get nextScheduledTime(): TaskData['scheduledExecutionTime'] {
        if (this.isCompleted) {
            return undefined;
        }

        const { interval } = this.data.repetitions;
        const repetitionIntervalMs = (interval ?? 0) * 1000;
        return new Date(Date.now() + repetitionIntervalMs);
    }

    private get shouldNotRepeat(): boolean {
        const {
            repeat, deadline,
        } = this.data.repetitions;

        const now = new Date();
        const isExpired = (!!deadline) && (deadline <= now);
        const isFinishedRepeating = ((repeat ?? 0) <= this.repetition);
        return isExpired || isFinishedRepeating;
    }

    private get shouldExecute(): boolean {
        const { scheduledExecutionTime } = this.data;
        const now = new Date();
        const isScheduled = !scheduledExecutionTime || (scheduledExecutionTime <= now);
        const shouldExecute = !this.isCompleted && !this.shouldNotRepeat && isScheduled;
        return shouldExecute;
    }

    public async execute(): Promise<void> {
        if (!this.shouldExecute) {
            return;
        }

        this.taskState = TaskState.IN_PROGRESS;

        await this.run();

        this.repetition += 1;
        if (this.isCompleted || this.shouldNotRepeat) {
            this.setCompleted();
        }
    }

    protected abstract run(): Promise<void>;

    public toJSON(): TaskData {
        return {
            ...this.data,
            state: this.state,
            scheduledExecutionTime: this.nextScheduledTime,
        };
    }

    /**
     * Override to save insight.
     */
    // eslint-disable-next-line class-methods-use-this
    public get insight(): Record<string, unknown> {
        return {};
    }
}

export interface TaskExecutorClass {
    new (token: TrackedToken, taskData: TaskData): TaskExecutor;
}

export type TasksById = Record<TaskData['taskId'], TaskExecutor>;
