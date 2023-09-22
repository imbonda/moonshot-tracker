export declare enum TokenUpdateEventType {
    LP_TOKEN_CREATED = 1,
    LP_TOKEN_BURNED = 2,
}

export interface TokenUpdateEvent {
    type: TokenUpdateEventType,
    data: unknown,
}
