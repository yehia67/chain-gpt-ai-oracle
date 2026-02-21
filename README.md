# Chain GPT AI Oracle

> This project is developed as part of the **ChainGPT Web3 AI Grant Program**:
> [https://www.chaingpt.org/web3-ai-grant](https://www.chaingpt.org/web3-ai-grant)

A modular **AI-to-Blockchain execution framework** built with NestJS.

This project demonstrates how structured outputs from ChainGPT AI services can be validated, transformed, and executed as deterministic on-chain transactions.

The system is designed as infrastructure, not a trading bot, not a news tool,  but a reusable execution engine that bridges AI reasoning and smart contract actions.

📘 Detailed integration guide:
See [docs/AI_ORACLE_TEMPLATE_QUICKSTART.md](docs/AI_ORACLE_TEMPLATE_QUICKSTART.md)



# What This Project Is

The AI Oracle Template provides a structured pipeline:

```text
External Input → AI Evaluation → Structured Decision → Smart Contract Call
```

It ensures that:

* AI responses are schema-validated
* Only deterministic outputs trigger transactions
* Execution logic is cleanly separated from AI reasoning
* New AI-powered workflows can be added without modifying the core engine

This repository demonstrates a reference implementation using:

* ChainGPT Web3 LLM (for reasoning)
* ChainGPT AI News SDK (as one possible input source)
* Ethers.js (for blockchain interaction)
* NestJS (as the orchestration layer)



# Architecture Overview

The application is split into two layers:

## Core Engine (Infrastructure Layer)

Responsible for:

* Calling ChainGPT LLM
* Enforcing strict JSON structure
* Validating AI output
* Mapping decisions to transaction calls
* Submitting transactions using an oracle signer

This layer contains **no business logic**.

## Strategy Layer (Use Case Layer)

Each strategy defines:

* What input it consumes (news, governance text, etc.)
* How prompts are constructed
* What decision schema is expected
* How decisions map to blockchain actions

Adding a new AI workflow only requires implementing a new strategy module.



# Project Structure

```text
src/
 ├── core/               # AI execution engine
 ├── strategies/         # Pluggable AI strategies
 ├── blockchain/         # Contract interaction logic
 ├── config/             # Environment handling
 └── main.ts

contracts/               # Example/mock contracts
docs/
 └── AI_ORACLE_TEMPLATE_QUICKSTART.md
```



# Requirements

* Node.js 18+
* pnpm
* ChainGPT API key
* RPC endpoint (e.g., Sepolia)
* Private key for oracle signer



# Installation

Install dependencies:

```bash
pnpm install
```

If creating from scratch:

```bash
pnpm create nest
cd ai-oracle-template
pnpm install
```



# Environment Setup

Create a `.env` file in the root:

```bash
cp .env.example .env
```

Example configuration:

```env
CHAINGPT_API_KEY=sk-xxxxxxxx
RPC_URL=https://sepolia.infura.io/v3/xxxxxxxx
PRIVATE_KEY=0xabc123...
CHAIN_ID=11155111
```

Do not commit `.env` to version control.



# Running the Application

Development mode:

```bash
pnpm run start:dev
```

Build and run production:

```bash
pnpm run build
pnpm run start:prod
```



# Example Workflow Included

The repository contains a sample `NewsSentimentStrategy` to demonstrate:

1. Retrieving recent ETH-related articles
2. Sending structured input to ChainGPT
3. Receiving a strictly formatted decision
4. Mapping the decision to `buy()` or `sell()` contract calls
5. Submitting the transaction on-chain

The goal is to showcase the **template mechanism**, not to provide financial automation.



# How to Extend

To implement a new AI-powered automation:

1. Create a new strategy class.
2. Define:

   * Prompt construction
   * Expected decision schema
   * Mapping to contract methods
3. Register the strategy with the engine.

No modifications to the core execution service are required.



# Security Considerations

This implementation enforces:

* Structured JSON parsing
* Explicit decision enums
* Rejection of malformed AI responses
* Server-side key management

In production environments, consider:

* Logging decision hashes
* Rate limiting
* Retry handling
* Event auditing
* Optional cryptographic attestations



# Supported ChainGPT Services

This template integrates with:

* `@chaingpt/generalchat`
* `@chaingpt/ainews`

It can be extended to incorporate additional ChainGPT APIs depending on the strategy design.



# Local Testing (Sepolia)

- **Mock Trade Executor**: `0xC9a062736625E9bD8c9b2d4c7d8F5a8Fcb07d35D` (verified on [Sepolia Blockscout](https://eth-sepolia.blockscout.com/address/0xC9a062736625E9bD8c9b2d4c7d8F5a8Fcb07d35D?tab=contract))
- **HTTP Request template**: `docs/http/NEWS_AI_TRADE.http`

Example using the `.http` file (or curl/Postman):

```
POST http://localhost:3000/oracle/news
Content-Type: application/json
```

### Example Responses

```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 99
ETag: W/"63-iFGA70bZlH2C4IsrAecRpn/t6Fk"
Date: Sat, 21 Feb 2026 14:11:57 GMT
Connection: close

{
  "action": "NO_ACTION",
  "rawResponse": "{\"sentiment\":\"NEUTRAL\",\"confidence\":0.5}",
  "txHash": null
}
```

Other valid responses mirror the same structure, with `action` set to `BUY` or `SELL` and `txHash` populated once a transaction is mined.

# Development Commands

```bash
pnpm run start:dev
pnpm run build
pnpm run start:prod
pnpm run lint
pnpm run test