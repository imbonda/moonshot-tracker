// Internal.
import type { DeepPartial, valueof } from '../../../@types/generics';
import type { TaskData, TrackedToken } from '../../../@types/tracking';
import { MS_IN_SECOND } from '../../../lib/constants';
import { safe } from '../../../lib/decorators';
import { Logger } from '../../../lib/logger';
import { TaskState, tracer, type Tracer } from '../static';
import { type ContextExecutor } from './context';

export type InsightsKey = keyof NonNullable<TrackedToken['insights']>;
export type TaskInsights = DeepPartial<TrackedToken['insights']>;
export type TaskInsightsUnwrapped = valueof<NonNullable<TaskInsights>> | null;

const PROBATION_TTL = 24 * 60 * 60 * MS_IN_SECOND; // 1 day.

/**
 * The following describes the different task configurations:
 * @delay Number of seconds by which the initial task execution would be delayed.
 * @daemon Task can be asked to run even after completed.
 * @repetitions Different options defining how many times (or until when) to repeat the task.
 * @scheduledExecutionTime The next time the task should run.
 *
 * Important notes:
 * - A task is completed only when "setCompleted" was called.
 * - A task is halted when it finishes repeating without being completed (via "setCompleted").
 * - A task can trigger a circuit-breaker to abort token tracking by calling "abort".
 * - A daemon can be halted by calling "halt".
 */
export abstract class TaskExecutor {
    protected token: TrackedToken;

    protected taskData: TaskData;

    protected taskState: TaskState;

    protected repetition: number;

    protected logger: Logger;

    protected tracer: Tracer;

    private _active: boolean;

    private _aborted: boolean;

    private _probationDeadline?: Date;

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
        this._active = taskData.active;
        this._aborted = false;
        this._probationDeadline = taskData.probationDeadline;
    }

    public get id(): TaskData['taskId'] {
        return this.taskData.taskId;
    }

    public get config(): TaskData['config'] {
        return this.taskData.config;
    }

    public get active(): boolean {
        return this._active;
    }

    protected set active(value: boolean) {
        this._active = value;
    }

    public get completed(): boolean {
        return this.taskState === TaskState.DONE;
    }

    public get halted(): boolean {
        return this.taskState === TaskState.HALTED;
    }

    public get aborted(): boolean {
        return this._aborted;
    }

    public activate(): void {
        this.active = true;
        this.taskState = TaskState.ACTIVATED;
    }

    /**
     * Set proabtion period before abort.
     */
    protected setProbation(): void {
        this._probationDeadline ||= new Date(Date.now() + PROBATION_TTL);
    }

    /**
     * Clear proabtion period before abort.
     */
    protected clearProbation(): void {
        this._probationDeadline = undefined;
    }

    /**
     * Circuit breaker.
     */
    protected abort(): void {
        this._aborted = true;
        this._active = false;
        this.taskState = TaskState.ABORTED;
    }

    protected halt(): void {
        this.active = false;
        // Do not override resolved state (e.g. in case of a completed daemon task).
        if (!this.completed) {
            this.taskState = TaskState.HALTED;
        }
    }

    protected setCompleted(): void {
        if (!this.isDaemon) {
            this.active = false;
        }
        this.taskState = TaskState.DONE;
    }

    private get state(): TaskData['state'] {
        return this.taskState;
    }

    private get data(): TaskData {
        return this.taskData;
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

    private get failedProbation(): boolean {
        const now = new Date();
        return !!this._probationDeadline && this._probationDeadline <= now;
    }

    /**
     * Lazy task run only when other tasks have scheduled tracking.
     */
    private get isLazy(): boolean {
        const { interval } = this.data.repetitions;
        return interval === null || interval === undefined;
    }

    private get nextScheduledTime(): TaskData['scheduledExecutionTime'] {
        if (!this.active || this.isLazy) {
            return undefined;
        }

        const { delay } = this.data;
        const { interval } = this.data.repetitions;
        const executionDelayMs = this.isFirstRepetition
            ? (delay || 0) * MS_IN_SECOND
            : 0;
        const repetitionIntervalMs = (interval || 0) * MS_IN_SECOND;
        return new Date(Date.now() + executionDelayMs + repetitionIntervalMs);
    }

    private get shouldNotRepeat(): boolean {
        if (this.isLazy) {
            return false;
        }

        const {
            repeat, deadline,
        } = this.data.repetitions;
        const now = new Date();
        const isExpired = (!!deadline) && (new Date(deadline) <= now);
        const isFinishedRepeating = ((repeat || 0) <= this.repetition);
        return isExpired || isFinishedRepeating;
    }

    public get shouldExecute(): boolean {
        const { scheduledExecutionTime } = this.data;
        const now = new Date();
        const isScheduled = !scheduledExecutionTime || (new Date(scheduledExecutionTime) <= now);
        const shouldExecute = this.active && isScheduled && !this.shouldNotRepeat;
        return shouldExecute;
    }

    /**
     * Should not be called directly, only via context-executor.
     *
     * @param context
     * @returns
     */
    public async execute(context: ContextExecutor): Promise<void> {
        if (this.failedProbation) {
            this.abort();
        }

        if (this.active && this.shouldNotRepeat) {
            this.halt();
        }

        if (!this.shouldExecute) {
            return;
        }

        await this.safeExecute(context);

        this.repetition += 1;
        if (this.shouldNotRepeat) {
            this.halt();
        }
    }

    @safe()
    private async safeExecute(context: ContextExecutor): Promise<void> {
        await this.tracer.startActiveSpan(`task.${this.id}`, async (span) => {
            try {
                span.setAttributes({ taskId: this.id });
                this.logger.info('Execution started');
                if (this.notStarted) {
                    this.taskState = TaskState.IN_PROGRESS;
                }
                await this.run(context);
            } catch (err) {
                this.logger.error('Execution failed', err);
            } finally {
                span.end();
                this.logger.info('Execution ended');
            }
        });
    }

    protected abstract run(context: ContextExecutor): Promise<void>;

    public toJSON(): TaskData {
        return {
            ...this.data,
            state: this.state,
            active: this.active,
            repetitions: {
                ...this.data.repetitions,
                count: this.repetition,
            },
            probationDeadline: this._probationDeadline,
            scheduledExecutionTime: this.nextScheduledTime,
        };
    }

    /**
     * Override to customize inisghts key.
     * Task insights will be saved under "token.insights[insightsKey]".
     */
    public get insightsKey(): InsightsKey {
        return this.id as InsightsKey;
    }

    /**
     * Override to save insights.
     */
    // eslint-disable-next-line class-methods-use-this
    public get insights(): TaskInsights {
        const { insights } = this.token;
        const unwrapped = insights?.[this.insightsKey];
        const wrapped = { [this.insightsKey]: unwrapped };
        return unwrapped ? wrapped : null;
    }
}

export interface TaskExecutorClass {
    new (token: TrackedToken, taskData: TaskData): TaskExecutor;
}
