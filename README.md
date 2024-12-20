# Moonshot Tracker

## Setup

### Environment
- `MongoDB` - Either localy or as a cloud service.
- `Redis` - Either localy or as a cloud service.
- `Docker` - Optional.


### Requirements
Install `npm` modules:
```
npm i
```

## Run

### VSCode
`Run and Debug` to run one of the pre-configured services found at `.vscode/launch.json`.

### PM2

#### Development
```
# Build js files.
npm run build

# Run PM2 with "dev" mode (alias commands).
npx pm2 start
npx pm2 start --env dev

# Stop all PM2 processes.
npx pm2 stop --all
```

#### Production
```
# Run PM2 with "production" mode.
npx pm2 start --env prod

# Stop all PM2 processes.
npx pm2 stop --all
```

### Docker

#### Build
```
docker compose build
```

#### Start
```
docker compose up -d
```

#### Stop
```
docker compose down
```

## Top Down Design
<img width="1009" alt="image" src="https://github.com/imbonda/moonshot-tracker/assets/16254595/2511bca6-35af-40dd-8a25-e643470ee044">
