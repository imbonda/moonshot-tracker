# Moonshot Tracker

## Run

### VSCode
`Run and Debug` to run one of the pre-configured services found at `.vscode/launch.json`.
<b4>

### PM2
Development:
```
npx pm2 start
npx pm2 start --env dev
```

Production:
```
npx pm2 start --env production
```
<b4>

### Docker
Build:
```
docker compose build
```

Start:
```
docker compose up -d
```

Stop:
```
docker compose down
```
