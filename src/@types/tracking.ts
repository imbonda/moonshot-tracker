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
    // @not-supported yet.
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

export type TrackingPipeline = PipelineStage[];

export interface TrackedToken {
    uuid: string,
    chainId: number,
    address: string,
    tracking: boolean,
    pipeline: TrackingPipeline,
    tasks: Record<TaskData['taskId'], TaskData>,
    insights: null | {
        dextools?: DexToolsTokenInsights,
    },
    halted: boolean,
    aborted: boolean,
    completed: boolean,
    currentStageIndex: number,
    scheduledExecutionTime: Date,
    latestExecutionTime?: Date,
    schedulerLockExpirationTime?: Date,
}
