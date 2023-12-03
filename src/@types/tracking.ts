// Internal.
import type { TokenInsights as DexToolsTokenInsights } from './dex-tools';

export interface TaskData {
    taskId: string,
    state: string,
    repetitions: {
        count: number,
        repeat?: number,
        interval?: number,
        deadline?: Date,
    },
    retries?: {
        maxTime?: number,
        retryMaxTime?: number,
    },
    delay?: number,
    daemon?: boolean,
    scheduledExecutionTime?: Date,
}

export interface PipelineStage {
    stageId: string,
    state: string,
    taskIds: TaskData['taskId'][],
    prerequisiteTasks: TaskData['taskId'][],
}

export interface TrackedToken {
    uuid: string,
    chainId: number,
    address: string,
    tracking: boolean,
    pipeline: PipelineStage[],
    tasks: Record<TaskData['taskId'], TaskData>,
    insights: null | {
        dextools?: DexToolsTokenInsights,
    },
    aborted: boolean,
    completed: boolean,
    currentStageIndex: number,
    scheduledExecutionTime: Date,
    latestExecutionTime?: Date,
    schedulerLockExpirationTime?: Date,
}
