// 3rd party.
import dotenv from 'dotenv';
// Internal.
import { TokenMonitor } from './services/monitoring/monitor';

dotenv.config();

function main() {
    new TokenMonitor().monitor();
}

main();
