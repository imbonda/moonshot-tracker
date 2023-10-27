import type { TaskData, TrackedToken } from '../../../@types/tracking';
import { TaskExecutor, TaskExecutorClass } from '../executors/task';
import { TaskId } from '../static';

const TASK_CLASS_BY_ID: Record<TaskData['taskId'], TaskExecutorClass> = {
    // TODO: Add tasks here ..
};

export class TaskFactory {
    public static createTask(
        token: TrackedToken,
        taskData: TaskData,
    ): TaskExecutor {
        const Cls = TASK_CLASS_BY_ID[taskData.taskId];
        return new Cls(token, taskData);
    }
}
