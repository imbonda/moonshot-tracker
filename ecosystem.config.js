/* eslint-disable camelcase */
module.exports = {
    apps: [
        {
            name: 'monitor_eth',
            cwd: './',
            script: 'node',
            args: '-r ./build/src/lib/tracer.js ./build/src/main.js --service monitor',
            env: {
                NODE_ENV: 'dev',
                CHAIN_ID: 1,
            },
            env_prod: {
                NODE_ENV: 'prod',
                CHAIN_ID: 1,
            },
        },

        {
            name: 'monitor_bsc',
            cwd: './',
            script: 'node',
            args: '-r ./build/src/lib/tracer.js ./build/src/main.js --service monitor',
            env: {
                NODE_ENV: 'dev',
                CHAIN_ID: 56,
            },
            env_prod: {
                NODE_ENV: 'prod',
                CHAIN_ID: 56,
            },
        },

        {
            name: 'scheduler',
            cwd: './',
            script: 'node',
            args: '-r ./build/src/lib/tracer.js ./build/src/main.js --service scheduler',
            env: {
                NODE_ENV: 'dev',
            },
            env_prod: {
                NODE_ENV: 'prod',
            },
        },

        {
            name: 'agent',
            cwd: './',
            script: 'node',
            args: '-r ./build/src/lib/tracer.js ./build/src/main.js --service agent',
            env: {
                NODE_ENV: 'dev',
            },
            env_prod: {
                NODE_ENV: 'prod',
            },
        },
    ],
};
