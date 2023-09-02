declare enum ScannerResultType {
    OK,
    BAD,
}

export interface ScannerResult {
    type: ScannerResultType,
    timestamp: Date,
}

export interface Scanner {
    results: ScannerResult[];
    // Methods:
    setup(): Promise<void>;
    scan(): Promise<boolean>;
    cleanup(): Promise<void>;
}
