// Internal.
import type { TrackedToken } from '../@types/tracking';
import { StageState, TaskState, TaskId } from '../services/tracking/static';

export const TASKS_TEMPLATE: TrackedToken['tasks'] = {
    [TaskId.DEX_TOOLS_AUDIT_CHECK]: {
        taskId: TaskId.DEX_TOOLS_AUDIT_CHECK,
        state: TaskState.ACTIVATED,
        repetitions: {
            count: 0,
            interval: 3 * 60 * 60, // 3 hours.
            repeat: 55, // ~ 1 week.
        },
        daemon: true,
    },
};

export const PIPELINE_TEMPLATE: TrackedToken['pipeline'] = [
    {
        stageId: 'stage1',
        state: StageState.UNLOCKED,
        taskIds: [TaskId.DEX_TOOLS_AUDIT_CHECK],
        prerequisiteTasks: [],
    },
];
