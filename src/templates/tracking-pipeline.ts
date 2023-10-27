// Internal.
import type { TrackedToken } from '../@types/tracking';
import { StageState, TaskState, TaskId } from '../services/tracking/static';

export const TASKS_TEMPLATE: TrackedToken['tasks'] = {
    // TODO: fill in tasks data, i.e.:
    // [TaskId.XXX]: {
    //     taskId: TaskId.XXX,
    //     state: TaskState.PENDING,
    //     repetitions: {
    //         count: 0,
    //         repeat: 999,
    //         interval: 1000,
    //         deadline: new Date(),
    //     },
    //     retries: {
    //         maxTime: 10,
    //         retryMaxTime: 60,
    //     },
    // },
};

export const PIPELINE_TEMPLATE: TrackedToken['pipeline'] = [
    {
        state: StageState.UNLOCKED,
        taskIds: [],
        prerequisiteTasks: [],
    },
];
