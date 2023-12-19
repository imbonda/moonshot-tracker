// Internal.
import type { TaskData, TrackedToken } from '../../../@types/tracking';
import { TaskExecutor, TaskExecutorClass } from '../executors/task';
import { TaskId } from '../static';
import { CredibilityScoreCheck } from './credibility-score-check';
import { DEXToolsAuditCheck } from './dex-tools-audit-check';

const TASK_CLASS_BY_ID: Record<TaskData['taskId'], TaskExecutorClass> = {
    [TaskId.DEX_TOOLS_AUDIT_CHECK]: DEXToolsAuditCheck,
    [TaskId.CREDIBILITY_SCORE_CHECK]: CredibilityScoreCheck,
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
