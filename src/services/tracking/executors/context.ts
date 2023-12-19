// Internals.
import type { TaskData } from '../../../@types/tracking';
import { type ResolvedTaskInsights, TaskExecutor } from './task';

type TaskId = TaskData['taskId'];
type TaskById = Record<TaskId, TaskExecutor>;
type ExecutionById = Record<TaskId, ReturnType<TaskExecutor['execute']>>;

export class ContextExecutor {
    private taskById: TaskById;

    private executionById: ExecutionById;

    constructor(tasks: TaskExecutor[]) {
        this.taskById = Object.fromEntries(
            tasks.map((task) => [task.id, task]),
        );
        this.executionById = {};
    }

    /**
     * Execute a task at most once.
     *
     * @param task
     */
    public async execute(taskId: TaskId): Promise<void> {
        this.executionById[taskId] ??= this.taskById[taskId].execute(this);
        await this.executionById[taskId];
    }

    /**
     *
     * Get insights of another task from the current iteration,
     * thereby allowing tasks to wait for execution results of other tasks.
     *
     * @param taskId
     * @returns
     */
    public async getLatestResolvedTaskInsights(taskId: TaskId): Promise<ResolvedTaskInsights> {
        await this.execute(taskId);
        const task = this.taskById[taskId];
        return task.insights?.[task.insightsKey] ?? null;
    }

    public isTaskAlive(taskId: TaskId): boolean {
        return !!this.taskById[taskId]?.isAlive;
    }

    public isTaskCompleted(taskId: TaskId): boolean {
        return !!this.taskById[taskId]?.completed;
    }
}
