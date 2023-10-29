// 3rd party.
import type { Model, HydratedDocument } from 'mongoose';
import mongoose, { Schema } from 'mongoose';
// Internal.
import type { PipelineStage, TaskData, TrackedToken } from '../../@types/tracking';
import { Dal } from '../dal';
import { createPagination, createTimeRangeFilter } from '../helpers/mongodb';
import type { Paginated, QueryParams, Timestamped } from '../types';
import { BaseDalModule } from './base';

type TrackedTokenDocument = HydratedDocument<Timestamped<TrackedToken>>;

const TaskRepetitionsSchema = new Schema<TaskData['repetitions']>(
    {
        count: { type: Number },
        repeat: { type: Number, required: false },
        interval: { type: Number, required: false },
        deadline: { type: Date, required: false },
    },
    { _id: false },
);

const TaskRetriesSchema = new Schema<TaskData['retries']>(
    {
        maxTime: { type: Number, required: false },
        retryMaxTime: { type: Number, required: false },
    },
    { _id: false },
);

const TaskDataSchema = new Schema<TaskData>(
    {
        taskId: { type: String },
        state: { type: String },
        repetitions: { type: TaskRepetitionsSchema },
        retries: { type: TaskRetriesSchema, required: false },
        delay: { type: Number, required: false },
        daemon: { type: Boolean, required: false },
        scheduledExecutionTime: { type: Date, required: false },
    },
    { _id: false },
);

const PipelineStageSchema = new Schema<PipelineStage>(
    {
        state: { type: String },
        taskIds: { type: [String] },
        prerequisiteTasks: { type: [String] },
    },
    { _id: false },
);

const TrackedTokenSchema = new Schema<Timestamped<TrackedToken>>(
    {
        uuid: { type: String },
        chainId: { type: Number },
        address: { type: String },
        tracking: { type: Boolean, default: true },
        pipeline: { type: [PipelineStageSchema] },
        tasks: { type: Map, of: TaskDataSchema },
        insights: { type: Schema.Types.Mixed },
        currentStageIndex: { type: Number },
        scheduledExecutionTime: { type: Date },
        latestExecutionTime: { type: Date, required: false },
    },
    { timestamps: true },
);

export class TrackedTokenModel extends BaseDalModule {
    private model: Model<Timestamped<TrackedToken>>;

    constructor(dal: Dal) {
        super(dal);
        this.model = mongoose.model<Timestamped<TrackedToken>>('Tracked Token', TrackedTokenSchema);
    }

    public async upsertTrackedToken(
        token: TrackedToken,
    ): Promise<TrackedTokenDocument> {
        const { uuid } = token;
        return this.model.findOneAndUpdate(
            {
                uuid,
            },
            {
                ...token,
            },
            { upsert: true, new: true },
        ).lean();
    }

    public async findScheduledTrackedTokens(
        params: QueryParams,
    ): Promise<Paginated<TrackedTokenDocument>> {
        const { range } = params;
        const [result] = await this.model.aggregate(
            createPagination(
                [
                    {
                        $match: {
                            tracking: true,
                            ...createTimeRangeFilter(
                                'scheduledExecutionTime',
                                range?.startDate,
                                range?.endDate,
                            ),
                        },
                    },
                ],
                params,
            ),
        );
        return result;
    }
}
