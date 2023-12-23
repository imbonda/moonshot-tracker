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
    [TaskId.CREDIBILITY_SCORE_CHECK]: {
        taskId: TaskId.CREDIBILITY_SCORE_CHECK,
        state: TaskState.ACTIVATED,
        repetitions: {
            count: 0,
            // Lazy task does not schedule tracking.
            interval: undefined,
        },
        config: {
            threshold: 70,
        },
    },
};

export const PIPELINE_TEMPLATE: TrackedToken['pipeline'] = [
    {
        stageId: 'stage1',
        state: StageState.UNLOCKED,
        taskIds: [
            TaskId.DEX_TOOLS_AUDIT_CHECK,
            TaskId.CREDIBILITY_SCORE_CHECK,
        ],
        prerequisiteTasks: [],
    },
];
