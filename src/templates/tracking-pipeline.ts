// Internal.
import type { TrackedToken } from '../@types/tracking';
import { StageState, TaskState, TaskId } from '../services/tracking/static';

export const TASKS_TEMPLATE: TrackedToken['tasks'] = {
    [TaskId.DEX_TOOLS_SCRAPER]: {
        taskId: TaskId.DEX_TOOLS_SCRAPER,
        state: TaskState.ACTIVATED,
        active: true,
        repetitions: {
            count: 0,
            interval: 30 * 60, // 30 minutes.
            repeat: 340, // ~ 1 week.
        },
        daemon: true,
    },
    [TaskId.AUDIT_CHECK]: {
        taskId: TaskId.AUDIT_CHECK,
        state: TaskState.ACTIVATED,
        active: true,
        repetitions: {
            count: 0,
            // Lazy task does not schedule tracking.
            interval: undefined,
        },
        daemon: true,
    },
    [TaskId.CREDIBILITY_CHECK]: {
        taskId: TaskId.CREDIBILITY_CHECK,
        state: TaskState.ACTIVATED,
        active: true,
        repetitions: {
            count: 0,
            // Lazy task does not schedule tracking.
            interval: undefined,
        },
        daemon: true,
    },
};

export const PIPELINE_TEMPLATE: TrackedToken['pipeline'] = [
    {
        stageId: 'stage1',
        state: StageState.UNLOCKED,
        taskIds: [
            TaskId.DEX_TOOLS_SCRAPER,
            TaskId.AUDIT_CHECK,
            TaskId.CREDIBILITY_CHECK,
        ],
        prerequisiteTasks: [],
    },
];
