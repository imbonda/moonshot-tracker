// 3rd party.
import type { Model, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
// Internal.
import type { TrackedToken } from '../../@types/tracking';
import { Dal } from '../dal';
import { createPagination, createTimeRangeFilter } from '../helpers/mongodb';
import type { Paginated, QueryParams, Timestamped } from '../types';
import { BaseDalModule } from './base';

type TrackedTokenDocument = HydratedDocument<Timestamped<TrackedToken>>;

export class TrackedTokenModel extends BaseDalModule {
    private model: Model<TrackedToken>;

    constructor(dal: Dal) {
        super(dal);
        this.model = mongoose.model<TrackedToken>('Tracked Token');
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
