export declare enum ScannerResult {
    OK,
    BAD,
    FAILED,
}

export interface ScannerResultRecord {
    result: ScannerResult,
    timestamp: Date,
}

export interface Scanner {
    results: ScannerResultRecord[];
    // Methods:
    setup(): Promise<void>;
    scan(): Promise<boolean>;
    cleanup(): Promise<void>;
}
