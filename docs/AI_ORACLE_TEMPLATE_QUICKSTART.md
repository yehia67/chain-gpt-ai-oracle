# AI Oracle Template – QuickStart (A2A ERC-8004 Sepolia MVP)

This QuickStart explains the implemented end-to-end architecture for:

- ChainGPT reasoning
- Deterministic decision hashing
- ERC-8004-style A2A identity/validation/reputation registries
- Validation-gated on-chain execution on Sepolia

---

## 1. Architecture

```text
Data Source -> ChainGPT LLM -> Structured Decision -> DataHash
-> ValidationRegistry -> MockTradeExecutorV2 (buy/sell)
-> ReputationRegistry feedback
```

### Runtime model

- `POST /oracle/news` is **async** and returns `202` with a `taskId`.
- Worker processes pending tasks in the background.
- `GET /oracle/tasks/:taskId` exposes full lifecycle and execution result.

---

## 2. Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js 20+ | Build, NestJS, Hardhat |
| pnpm | Package manager |
| PostgreSQL | Durable task tracking |
| Sepolia ETH | For deployment + tx execution |
| ChainGPT API Key | LLM + News SDK |
| Pinata JWT | IPFS pinning for agent/proof/feedback JSON |

Copy and fill env values:

```bash
cp .env.example .env
```

Required variables include:

```bash
CHAINGPT_API_KEY=sk-...
RPC_URL=https://sepolia.infura.io/v3/...
PRIVATE_KEY=0x...
CHAIN_ID=11155111
PINATA_JWT=...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_oracle?schema=public
```

---

## 3. Install + DB

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate:deploy
```

---

## 4. Deploy Contracts to Sepolia

Compile contracts:

```bash
pnpm hardhat:compile
```

Deploy Identity/Validation/Reputation + trade executor:

```bash
pnpm hardhat:deploy:sepolia
```

Deployment script writes:

- `deployments/sepolia.json`

Use output addresses to set:

- `A2A_IDENTITY_REGISTRY_ADDRESS`
- `A2A_VALIDATION_REGISTRY_ADDRESS`
- `A2A_REPUTATION_REGISTRY_ADDRESS`
- `CONTRACT_ADDRESS`

Optional explorer verification:

```bash
pnpm hardhat:verify:sepolia
```

---

## 5. Register Agent Identity (IPFS + On-chain)

Pin agent card to IPFS:

```bash
pnpm agent:pin
```

Register URI in Identity Registry:

```bash
AGENT_URI=ipfs://... pnpm agent:register
```

The card includes:

- `agent_id` (CAIP-10 style)
- `name`, `description`
- `capabilities`
- `evm_address`
- schema tag `erc8004/identity/v1`

---

## 6. Start Application

```bash
pnpm build
pnpm start:prod
```

Dev mode:

```bash
pnpm start:dev
```

Worker polling interval is controlled by:

```bash
WORKER_POLL_MS=10000
```

---

## 7. API Usage

### 7.1 Create task

```http
POST /oracle/news
```

Response (`202`):

```json
{
  "taskId": "...",
  "status": "PENDING_VALIDATION",
  "action": "BUY",
  "validationRequestId": "12"
}
```

If action is `NO_ACTION`, status becomes `COMPLETED_NO_ACTION` and no validation/tx is requested.

### 7.2 Query task

```http
GET /oracle/tasks/:taskId
```

Response includes:

- `status` (`PENDING_VALIDATION`, `PROCESSING`, `EXECUTED`, `REJECTED`, `FAILED`, `COMPLETED_NO_ACTION`)
- `action`
- `validationRequestId`
- `validationStatus`, `executionStatus`
- `txHash`
- `validationProofUri`, `feedbackUri`
- `errorMessage`

### 7.3 Health check

```http
GET /health
```

---

## 8. Worker Lifecycle (Implemented)

For tasks with `BUY` or `SELL`:

1. Compute deterministic `dataHash` from canonical payload.
2. Call `requestValidation(...)` on Validation Registry.
3. Worker checks validation state.
4. If no response yet, worker pins proof JSON to IPFS and submits validator response.
5. If verified, worker executes `buy(validationRequestId)` or `sell(validationRequestId)`.
6. Worker pins feedback JSON and submits feedback URI to Reputation Registry.
7. Task marked `EXECUTED`; else `REJECTED`/`FAILED`.

---

## 9. Smart Contract Interfaces (Deployed)

- `IdentityRegistry`: `registerAgent`, `getAgent`
- `ValidationRegistry`: `requestValidation`, `submitValidationResponse`, `getValidation`, `isVerified`
- `ReputationRegistry`: `submitFeedback`, `getFeedback`
- `MockTradeExecutorV2`: `buy(uint256)`, `sell(uint256)` with validation gate + replay protection

---

## 10. Docker Deployment (VPS)

Build and run:

```bash
docker compose up --build -d
```

Included services:

- `db`: PostgreSQL
- `app`: NestJS API + background worker

---

## 11. Test Matrix

Backend tests:

```bash
pnpm test
```

Contract tests:

```bash
pnpm hardhat:test
```

Coverage includes:

- deterministic data hashing
- lifecycle status transitions
- blockchain adapter error handling
- validation-gated execution + replay protection
- identity/reputation registry behavior

---

## 12. End-to-End Sepolia Runbook

1. Fund the EOA from `.env` on Sepolia.
2. Deploy contracts (`pnpm hardhat:deploy:sepolia`).
3. Set deployed addresses in `.env`.
4. Pin and register agent card (`pnpm agent:pin`, `pnpm agent:register`).
5. Run DB migration (`pnpm prisma:migrate:deploy`).
6. Start app (`pnpm start:prod` or Docker).
7. Call `POST /oracle/news` and store `taskId`.
8. Poll `GET /oracle/tasks/:taskId`.
9. Confirm validation + trade tx on Sepolia explorer.

---

This implementation is intentionally modular so you can later replace single-validator logic with multi-validator consensus and add escrowed ETH/USDC payouts without changing the core AI engine.
