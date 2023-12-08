// Internal.
import type { TaskData, TrackedToken } from '../../../@types/tracking';
import { MS_IN_SECOND } from '../../../lib/constants';
import { Logger } from '../../../lib/logger';
import { TaskState, tracer, type Tracer } from '../static';

export type Insights = Record<string, unknown> | null;

/**
 * The following describes the different task configurations:
 * @delay Number of seconds by which the initial task execution would be delayed.
 * @daemon Task can be asked to run even after completed.
 * @repetitions Different options defining how many times (or until when) to repeat the task.
 * @scheduledExecutionTime The next time the task should run.
 *
 * Important notes:
 * - A task is completed when "setCompleted" was called, or when it is finished repeating.
 * - A task can trigger a circuit-breaker to abort token tracking by calling "abort".
 * - A daemon can be disactivated by calling "setDisactivated".
 */
export abstract class TaskExecutor {
    protected token: TrackedToken;

    protected taskData: TaskData;

    protected taskState: TaskState;

    protected repetition: number;

    protected logger: Logger;

    protected tracer: Tracer;

    private _aborted: boolean;

    constructor(token: TrackedToken, taskData: TaskData) {
        this.token = token;
        this.taskData = taskData;
        this.taskState = taskData.state as TaskState;
        this.repetition = taskData.repetitions.count;
        this.logger = new Logger(
            this.constructor.name,
            {
                token: token.address,
                taskId: taskData.taskId,
            },
        );
        this.tracer = tracer;
        this._aborted = false;
    }

    public get id(): TaskData['taskId'] {
        return this.taskData.taskId;
    }

    public get completed(): boolean {
        return this.taskState === TaskState.DONE;
    }

    public get aborted(): boolean {
        return this._aborted;
    }

    public setActivated(): void {
        this.taskState = TaskState.ACTIVATED;
    }

    protected setDisactivated(): void {
        this.taskState = TaskState.DISACTIVATED;
    }

    protected setCompleted(): void {
        this.taskState = TaskState.DONE;
    }

    /**
     * Circuit breaker.
     */
    protected abort(): void {
        this._aborted = true;
    }

    private get state(): TaskData['state'] {
        return this.taskState;
    }

    private get data(): TaskData {
        return this.taskData;
    }

    private get isActivated(): boolean {
        return (this.taskState === TaskState.ACTIVATED)
            || (this.taskState === TaskState.IN_PROGRESS)
            || (this.isDaemon && !this.isDisactivated);
    }

    private get isDisactivated() {
        return this.taskState === TaskState.DISACTIVATED;
    }

    private get notStarted(): boolean {
        return this.taskState === TaskState.PENDING
            || this.taskState === TaskState.ACTIVATED;
    }

    private get isDaemon(): boolean {
        return !!this.data.daemon;
    }

    private get isFirstRepetition(): boolean {
        return this.repetition === 1;
    }

    private get nextScheduledTime(): TaskData['scheduledExecutionTime'] {
        if (!this.isActivated) {
            return undefined;
        }

        const { delay } = this.data;
        const executionDelayMs = this.isFirstRepetition
            ? (delay ?? 0) * MS_IN_SECOND
            : 0;

        const { interval } = this.data.repetitions;
        const repetitionIntervalMs = (interval ?? 0) * MS_IN_SECOND;

        return new Date(Date.now() + executionDelayMs + repetitionIntervalMs);
    }

    private get shouldNotRepeat(): boolean {
        const {
            repeat, deadline,
        } = this.data.repetitions;

        const now = new Date();
        const isExpired = (!!deadline) && (new Date(deadline) <= now);
        const isFinishedRepeating = ((repeat ?? 0) <= this.repetition);
        return !this.isDaemon && (isExpired || isFinishedRepeating);
    }

    private get shouldExecute(): boolean {
        const { scheduledExecutionTime } = this.data;
        const now = new Date();
        const isScheduled = !scheduledExecutionTime || (new Date(scheduledExecutionTime) <= now);
        const shouldExecute = this.isActivated && isScheduled && !this.shouldNotRepeat;
        return shouldExecute;
    }

    public async execute(): Promise<void> {
        if (!this.shouldExecute) {
            return;
        }

        if (this.notStarted) {
            this.taskState = TaskState.IN_PROGRESS;
        }

        await this.tracer.startActiveSpan(`task.${this.id}`, async (span) => {
            try {
                span.setAttributes({ taskId: this.id });
                this.logger.info('Execution started');
                await this.run();
            } finally {
                span.end();
                this.logger.info('Execution ended');
            }
        });

        this.repetition += 1;
        if (this.completed || this.shouldNotRepeat) {
            this.setCompleted();
        }
    }

    protected abstract run(): Promise<void>;

    public toJSON(): TaskData {
        return {
            ...this.data,
            state: this.state,
            repetitions: {
                ...this.data.repetitions,
                count: this.repetition,
            },
            scheduledExecutionTime: this.nextScheduledTime,
        };
    }

    /**
     * Override to save insights.
     */
    // eslint-disable-next-line class-methods-use-this
    public get insights(): Insights {
        return null;
    }
}

export interface TaskExecutorClass {
    new (token: TrackedToken, taskData: TaskData): TaskExecutor;
}

export type TasksById = Record<TaskData['taskId'], TaskExecutor>;
