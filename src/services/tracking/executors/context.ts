// Internals.
import type { TaskData } from '../../../@types/tracking';
import { type Insights, TaskExecutor } from './task';

type TaskId = TaskData['taskId'];
type TaskById = Record<TaskId, TaskExecutor>;
type ExecuteById = Record<TaskId, TaskExecutor['execute']>;

export class ContextExecutor {
    private taskById: TaskById;

    private executeById: ExecuteById;

    constructor(tasks: TaskExecutor[]) {
        this.taskById = Object.fromEntries(
            tasks.map((task) => [task.id, task]),
        );
        this.executeById = Object.fromEntries(
            tasks.map((task) => [task.id, task.execute.bind(task)]),
        );
    }

    /**
     * Execute a task at most once.
     *
     * @param task
     */
    public async execute(taskId: TaskId): Promise<void> {
        const execute = this.executeById[taskId];
        await execute(this);
    }

    /**
     *
     * Allowing tasks to wait for execution results of other tasks.
     *
     * @param taskId
     * @returns
     */
    public async getLatestInsights(taskId: TaskId): Promise<Insights> {
        await this.execute(taskId);
        const task = this.taskById[taskId];
        return task?.insights ?? null;
    }

    public isTaskCompleted(taskId: TaskId): boolean {
        return !!this.taskById[taskId]?.completed;
    }
}
