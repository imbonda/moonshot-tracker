// 3rd party.
import dotenv from 'dotenv';
// Internal.
import { TokenMonitor } from './services/monitoring/TokenMonitor';

dotenv.config();

function main() {
    const tokenMonitor = new TokenMonitor();

    if (tokenMonitor.type === 'provider') {
        tokenMonitor.monitorNewERC20Creation();
    } else {
        tokenMonitor.monitorLPTokenCreation();
        tokenMonitor.monitorStages();
    }
}

main();
