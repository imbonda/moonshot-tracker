// 3rd party.
import { Types, PipelineStage } from 'mongoose';
// Internal.
import { DalError } from '../errors/dal-error';
import { DEFAULTS, RESTRICTIONS } from '../static';
import type { QueryParams } from '../types';

export function createId(id?: Types.ObjectId | string): Types.ObjectId {
    return new Types.ObjectId(id);
}

export function generateId(): Types.ObjectId {
    return createId();
}

export function validatePageSize(pageSize: number) {
    if (pageSize > RESTRICTIONS.pageSize) {
        throw new DalError(`Page size too big: ${pageSize}`);
    }
}

export function createTimeRangeFilter(
    key: string,
    {
        startDate,
        endDate,
        negate,
    }: {
        startDate?: Date,
        endDate?: Date,
        negate?: boolean,
    } = {},
) {
    const startDateFilter = {
        ...(startDate && (
            negate
                ? { $not: { $gte: new Date(startDate) } }
                : { $gte: new Date(startDate) }
        )),
    };
    const endDateFilter = {
        ...(endDate && (
            negate
                ? { $not: { $lte: new Date(endDate) } }
                : { $lte: new Date(endDate) }
        )),
    };
    return {
        ...((startDate || endDate) && {
            [key]: {
                ...startDateFilter,
                ...endDateFilter,
            },
        }),
    };
}

export function createPagination(
    pipeline: PipelineStage[],
    params?: QueryParams,
): PipelineStage[] {
    const { range } = params ?? {};

    const pageNumber = range?.pageNumber || DEFAULTS.pageNumber;
    const pageSize = Math.min(
        range?.pageSize || DEFAULTS.pageSize,
        RESTRICTIONS.queryLimit,
    );
    validatePageSize(pageSize);

    return [
        ...pipeline,
        {
            $facet: {
                page: [
                    {
                        // Pagination starts at page number "1".
                        $skip: (pageNumber - 1) * pageSize,
                    },
                    {
                        $limit: pageSize,
                    },
                ],
                total: [
                    {
                        $count: 'count',
                    },
                ],
            },
        },
        {
            $project: {
                page: '$page',
                pageNumber: { $literal: pageNumber },
                total: {
                    $ifNull: [
                        { $arrayElemAt: ['$total.count', 0] },
                        0,
                    ],
                },
            },
        },
    ];
}
