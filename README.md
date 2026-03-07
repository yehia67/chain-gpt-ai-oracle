# AI Oracle Template (A2A ERC-8004 Sepolia MVP)

A NestJS-based AI-to-blockchain execution framework that converts ChainGPT outputs into deterministic on-chain actions.

This version introduces an ERC-8004-style A2A trust layer on Sepolia:
- Identity Registry
- Validation Registry
- Reputation Registry
- Validation-gated trade execution (`buy/sell` only after verified validation)

## High-Level Flow

```text
ETH News -> ChainGPT Decision -> Task DataHash -> Validation Request
-> Validator Response -> Trade Execution -> Feedback Attestation
```

## API

- `POST /oracle/news` -> creates async task (`202 Accepted`)
- `GET /oracle/tasks/:taskId` -> returns lifecycle status + tx/proof metadata
- `GET /health` -> service health

Example create response:

```json
{
  "taskId": "5b7668db-bd93-4f37-a7fb-25d50712ea32",
  "status": "PENDING_VALIDATION",
  "action": "BUY",
  "validationRequestId": "12"
}
```

## Requirements

- Node.js 20+
- pnpm
- PostgreSQL
- Sepolia RPC + funded private key
- ChainGPT API key
- Pinata JWT

## Install

```bash
pnpm install
pnpm prisma:generate
```

## Database

```bash
cp .env.example .env
pnpm prisma:migrate:deploy
```

## Sepolia Contract Deployment (Hardhat)

Compile:

```bash
pnpm hardhat:compile
```

Deploy:

```bash
pnpm hardhat:deploy:sepolia
```

This writes `deployments/sepolia.json` with:
- `A2A_IDENTITY_REGISTRY_ADDRESS`
- `A2A_VALIDATION_REGISTRY_ADDRESS`
- `A2A_REPUTATION_REGISTRY_ADDRESS`
- `CONTRACT_ADDRESS` (`MockTradeExecutorV2`)

Optional explorer verification:

```bash
pnpm hardhat:verify:sepolia
```

## Agent Card + Identity Registration

Pin agent card to IPFS:

```bash
pnpm agent:pin
```

Register URI on-chain:

```bash
AGENT_URI=ipfs://... pnpm agent:register
```

## Run Backend

```bash
pnpm build
pnpm start:prod
```

Or dev mode:

```bash
pnpm start:dev
```

The worker runs in-process and polls pending tasks every `WORKER_POLL_MS`.

## Docker (VPS)

```bash
docker compose up --build -d
```

Services:
- `db` (PostgreSQL)
- `app` (NestJS + worker)
- In Docker Compose, app DB host is forced to `db` (service name), so container networking works even if `.env` uses `localhost` for local runs.
- Host PostgreSQL port is mapped to `5433` to avoid conflicts with local Postgres on `5432`.

## Contract Suite

- `IdentityRegistry.sol`
- `ValidationRegistry.sol`
- `ReputationRegistry.sol`
- `MockTradeExecutorV2.sol`

All under `/contracts` and tested through Hardhat tests under `/hardhat/test`.

## Tests

Backend tests:

```bash
pnpm test
```

Contract tests:

```bash
pnpm hardhat:test
```

## Notes

- Current default is single EOA for deployer/oracle/validator (centralized trust tradeoff).
- `NO_ACTION` tasks are finalized immediately without validation/transaction.
- `BUY/SELL` tasks require successful validation before execution.
