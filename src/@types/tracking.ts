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
    insights: {
        project?: {
            marketCap: number,
            links: {
                telegram: string,
                twitter: string,
            }
        },
    },
    completed: boolean,
    currentStageIndex: number,
    scheduledExecutionTime: Date,
    latestExecutionTime?: Date,
}
