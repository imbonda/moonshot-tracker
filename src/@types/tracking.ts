export interface TaskData {
    taskId: string,
    state: string,
    repetitions: {
        count: number,
        repeat: number,
        interval: number,
        deadline: Date,
    },
    retries: {
        maxTime: number,
        maxRetryTime: number,
    },
    scheduledExecutionTime: Date,
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
    currentStageIndex: number,
    scheduledExecutionTime: Date,
    latestExecutionTime?: Date,
}
