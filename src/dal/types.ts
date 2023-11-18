// Internal.
import { SortingOrder } from './static';

export type Timestamped<T> = T & {
    createdAt: Date,
    updatedAt: Date,
}

export type Paginated<T> = {
    page: T[],
    pageNumber: number,
    total?: number,
}

export type QueryMatchParams = Record<string, unknown>;

export interface QueryRangeParams {
    startDate?: Date,
    endDate?: Date,
    // Non-pagination queries.
    queryLimit?: number,
    // Pagination queries.
    pageSize?: number,
    pageNumber?: number,
}

export type QuerySetParams = Record<string, unknown>;

export interface QueryParams {
    match?: QueryMatchParams,
    range?: QueryRangeParams,
    set?: QuerySetParams,
    sort?: SortingOrder,
}
