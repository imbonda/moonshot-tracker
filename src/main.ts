// Builtin.
import http from 'http';
import https from 'https';
// 3rd party.
import { program, Option, OptionValues } from 'commander';
// Internal.
import { Service, ServiceClass } from './services/service';
import { TrackingAgent } from './services/tracking/agent';
import { TrackingScheduler } from './services/scheduling/scheduler';
import { BlockchainMonitor } from './services/monitoring/monitor';

class Launcher {
    private servicesByName: Record<string, ServiceClass>;

    private inputOptions: Option[];

    constructor() {
        this.servicesByName = {
            monitor: BlockchainMonitor,
            scheduler: TrackingScheduler,
            agent: TrackingAgent,
        };
        this.inputOptions = [
            new Option('-s, --service <name>', 'name of the service to start')
                .choices(Object.keys(this.servicesByName))
                .makeOptionMandatory(),
        ];
    }

    get service(): Service {
        const { service: name } = this.parseArgs();
        return new this.servicesByName[name]();
    }

    parseArgs(): OptionValues {
        this.inputOptions.forEach((option) => program.addOption(option));
        return program.parse().opts();
    }

    async launch(): Promise<void> {
        this.setHooks();
        await this.service.setup();
        await this.service.start().catch(this.service.teardown.bind(this));
    }

    // eslint-disable-next-line class-methods-use-this
    setHooks(): void {
        http.globalAgent = new http.Agent({ keepAlive: true });
        https.globalAgent = new https.Agent({ keepAlive: true });
    }
}

async function main() {
    new Launcher().launch();
}

main();
