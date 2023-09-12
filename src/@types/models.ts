export declare enum TokenEventType {
    LP_TOKEN_BURN = 1,
}

export interface TokenEvent {
    type: TokenEventType,
    data: unknown,
}
