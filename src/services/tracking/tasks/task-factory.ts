// Internal.
import type { TaskData, TrackedToken } from '../../../@types/tracking';
import { TaskExecutor, TaskExecutorClass } from '../executors/task';
import { TaskId } from '../static';
import { CredibilityCheck } from './credibility-check';
import { AuditCheck } from './audit-check';
import { DEXToolsScraper } from './dex-tools-scraper';

const TASK_CLASS_BY_ID: Record<TaskData['taskId'], TaskExecutorClass> = {
    [TaskId.DEX_TOOLS_SCRAPER]: DEXToolsScraper,
    [TaskId.AUDIT_CHECK]: AuditCheck,
    [TaskId.CREDIBILITY_CHECK]: CredibilityCheck,
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
