export declare enum TokenEventType {
    LP_TOKEN_CREATED = 1,
    LP_TOKEN_BURNED = 2,
}

export interface TokenEvent {
    type: TokenEventType,
    data: unknown,
}
