// Internal.
import { TaskExecutor } from '../executors/task';

export class DEXToolsAuditCheck extends TaskExecutor {
    async run(): Promise<void> {
        const tokenAddress = this.token;
        // TODO: check out the audit-scan matrix ('Honeypot', 'Sell Tax', 'Owner Percent', etc.)
    }
}
