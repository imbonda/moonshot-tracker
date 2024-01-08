// Internals.
import type { TaskData } from '../../../@types/tracking';
import { type TaskInsightsUnwrapped, TaskExecutor } from './task';

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
        this.executionById[taskId] ||= this.taskById[taskId].execute(this);
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
    public async getLatestTaskInsightsUnwrapped(taskId: TaskId): Promise<TaskInsightsUnwrapped> {
        await this.execute(taskId);
        const task = this.taskById[taskId];
        return task.insights?.[task.insightsKey] || null;
    }

    public isTaskActive(taskId: TaskId): boolean {
        return !!this.taskById[taskId]?.active;
    }

    public isTaskCompleted(taskId: TaskId): boolean {
        return !!this.taskById[taskId]?.completed;
    }
}
