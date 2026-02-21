# AI Oracle Template – QuickStart Guide

The **AI Oracle Template** provides a reusable execution framework that converts ChainGPT AI outputs into deterministic on-chain transactions.

It is designed to integrate with:

* **ChainGPT Web3 LLM API** (`/chat/stream`)
* **ChainGPT AI News SDK** (`@chaingpt/ainews`)
* Any EVM-compatible smart contract

The template separates **AI reasoning**, **decision validation**, and **transaction execution**, ensuring safe and structured AI-driven automation.

---

## 1. Overview

The AI Oracle Template acts as a bridge:

```
Data Source → ChainGPT AI → Structured Decision → On-Chain Transaction
```

It is composed of two layers:

### Core Engine (Reusable)

* Calls ChainGPT Web3 LLM
* Enforces strict JSON schema
* Validates decision
* Maps decision to transaction
* Submits transaction on-chain

### Strategy Module (Use Case-Specific)

* Defines data source (News, Governance, Compliance, etc.)
* Defines prompt
* Defines decision schema
* Defines execution mapping

The Core Engine does not know business logic.
Strategies define behavior.

---

## 2. Prerequisites ✔︎

| Requirement      | Notes                             |
| ---------------- | --------------------------------- |
| ChainGPT API Key | Create via AI Hub → API Dashboard |
| Node.js ≥ 16     | Required for SDK usage            |
| EVM RPC URL      | e.g. Sepolia RPC                  |
| Private Key      | For oracle signer                 |
| Credits          | LLM: 0.5 credits/request          |

Set environment variables:

```bash
export CHAINGPT_API_KEY="sk-***"
export RPC_URL="https://sepolia.infura.io/v3/..."
export PRIVATE_KEY="0x..."
```

---

## 3. Installing Dependencies

```bash
npm install @chaingpt/generalchat
npm install @chaingpt/ainews
npm install ethers dotenv
```

---

## 4. Core Engine Usage

The Core Engine executes a strategy:

```ts
await aiOracle.execute(strategy, inputData);
```

### Internal Flow

1. Build prompt
2. Call ChainGPT Web3 LLM
3. Validate structured JSON
4. Map decision to transaction
5. Submit transaction

---

## 5. Example Strategy: AI News Sentiment Executor

This strategy:

* Fetches latest ETH-related news
* Uses Web3 LLM to classify sentiment
* Executes buy/sell based on AI decision

---

### 5.1 Fetch AI News

```ts
import { AINews } from '@chaingpt/ainews';

const ainews = new AINews({
  apiKey: process.env.CHAINGPT_API_KEY
});

const news = await ainews.getNews({
  tokenId: [80],      // Ethereum (ETH)
  limit: 5,
  sortBy: 'createdAt'
});
```

---

### 5.2 Strategy Prompt Design

The strategy builds a deterministic prompt:

```
You are a crypto sentiment classifier.

Evaluate the overall sentiment for ETH based on the following news.

Return ONLY valid JSON:

{
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "confidence": number
}

News:
1. Title: ...
   Summary: ...
```

Strict JSON is mandatory.

---

### 5.3 Calling ChainGPT Web3 LLM

```ts
import { GeneralChat } from "@chaingpt/generalchat";

const chat = new GeneralChat({
  apiKey: process.env.CHAINGPT_API_KEY
});

const response = await chat.createChatBlob({
  question: prompt,
  chatHistory: "off"
});

const rawOutput = response.data.bot;
```

---

### 5.4 Decision Validation

The template enforces schema:

```ts
{
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  confidence: number
}
```

If validation fails:

* Reject execution
* Log AI output
* Abort transaction

---

### 5.5 Execution Mapping

| Sentiment | Action |
| --------- | ------ |
| POSITIVE  | buy()  |
| NEGATIVE  | sell() |
| NEUTRAL   | noop   |

Example transaction submission:

```ts
await contract.buy();
```

---

## 6. Smart Contract Example (Mock Executor)

```solidity
contract MockTradeExecutor {
    address public oracle;

    event TradeExecuted(string action);

    modifier onlyOracle() {
        require(msg.sender == oracle);
        _;
    }

    function buy() external onlyOracle {
        emit TradeExecuted("BUY");
    }

    function sell() external onlyOracle {
        emit TradeExecuted("SELL");
    }
}
```

Only the AI Oracle signer can execute actions.

---

## 7. Extending the Template

The same Core Engine supports additional strategies:

| Strategy          | Data Source   | Action             |
| ----------------- | ------------- | ------------------ |
| GovernanceRisk    | Proposal Text | Approve / Reject   |
| ComplianceCheck   | Legal Text    | Mint / Block       |
| ExploitMonitor    | News          | Pause Contract     |
| TreasuryRebalance | Macro News    | Risk-On / Risk-Off |

Only the Strategy module changes.
The template remains identical.

---

## 8. Error Handling

Handle errors for:

* Invalid API key (401)
* Insufficient credits (402/403)
* Rate limit (429)
* Malformed JSON
* Transaction failure

Always abort execution if decision validation fails.

---

## 9. Security Best Practices

* Never execute free-text LLM responses
* Enforce strict JSON parsing
* Log raw AI output
* Store decision hash for auditability
* Keep API keys server-side only
* Consider adding ZK proofs in future versions

---

## 10. End-to-End Execution Example

```ts
await aiOracle.execute(new NewsSentimentStrategy(), {
  tokenId: 80
});
```

Output:

```
AI Decision: POSITIVE
Confidence: 0.82
Transaction Submitted: BUY
Tx Hash: 0x...
```

---

## 11. Architecture Summary

The AI Oracle Template:

* Uses ChainGPT AI for reasoning
* Enforces deterministic decision structure
* Converts AI output into smart contract execution
* Separates infrastructure from business logic
* Enables reusable AI-driven automation across Web3 systems

---

## 12. Future Extensions

* ZK-verified AI decisions
* Multi-agent orchestration
* Threshold-based execution policies
* ERC-8004 intent resolution
* FHE-based private policy evaluation

---

This document demonstrates how to use:

* **ChainGPT Web3 LLM API**
* **ChainGPT AI News SDK**
* Deterministic AI decision mapping
* On-chain transaction execution

The AI Oracle Template serves as a reusable AI-to-blockchain execution layer for Web3 automation.

