export enum SortingOrder {
    ASCENDING = 'asc',
    DESCENDING = 'dsc',
}

export const DEFAULTS = {
    queryLimit: 1000,
    pageNumber: 1,
    pageSize: 50,
    sort: SortingOrder.DESCENDING,
};

export const RESTRICTIONS = {
    queryLimit: 1000,
    pageSize: 1000,
};
