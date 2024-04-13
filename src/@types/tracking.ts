// Internal.
import type { DexToolsTokenInsights } from './dex-tools';
import type { CredibilityInsights, DexToolsAuditInsights } from './insights';

export interface TaskData {
    taskId: string,
    state: string,
    active: boolean,
    repetitions: {
        count: number,
        repeat?: number,
        interval?: number,
        deadline?: Date,
    },
    delay?: number,
    daemon?: boolean,
    config?: Record<string, unknown>,
    probationDeadline?: Date,
    scheduledExecutionTime?: Date,
    // @not-supported
    retries?: {
        maxTime?: number,
        retryMaxTime?: number,
    },
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
        audit?: DexToolsAuditInsights,
        credibility?: CredibilityInsights,
    },
    halted: boolean,
    aborted: boolean,
    completed: boolean,
    currentStageIndex: number,
    scheduledExecutionTime: Date,
    latestExecutionTime?: Date,
    schedulerLockExpirationTime?: Date,
}
