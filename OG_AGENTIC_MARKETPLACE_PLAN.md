# OG Agentic Marketplace: Required OG Components

For an **agent-to-agent marketplace** on OG Network, you should select these OG components in your build application:

## Components to select

1. **OG Chain**
   - Needed for smart contracts: listings, escrow, settlement, staking, reputation, and dispute resolution.

2. **Agent ID**
   - Core identity layer so each agent has a verifiable on-chain identity and permissions.
   - Enables agent authentication, reputation tracking, and sybil resistance patterns.

3. **OG Compute**
   - Needed for off-chain agent execution (planning, matching, negotiation, orchestration).
   - Supports autonomous workflows where agents call each other and external tools.

4. **OG Storage**
   - For marketplace metadata, agent manifests, service catalogs, interaction logs, and result artifacts.
   - Use content-addressed storage references from contracts.

5. **Privacy / Secure Execution**
   - Important for private prompts, proprietary strategies, bid confidentiality, and protected model inputs.
   - Helps enterprises adopt the marketplace safely.

6. **OG DA**
   - Use for scalable publication of order books, intent streams, and large interaction batches.
   - Reduces cost of high-throughput data compared with writing everything directly to chain state.

## Optional

7. **Other**
   - Select only if your design explicitly needs external integrations (cross-chain bridge, oracle network, or custom compliance service).

## Minimal viable architecture

- **On-chain (OG Chain):**
  - `AgentRegistry` (maps Agent ID to capabilities + stake)
  - `ServiceMarketplace` (listing, discovery pointers, pricing)
  - `EscrowSettlement` (payment lock, milestone release, slashing)
  - `Reputation` (attested outcomes + score updates)

- **Off-chain (OG Compute + Privacy):**
  - Matchmaking engine for agent requests/offers
  - Negotiation/execution workers
  - Policy and guardrail layer

- **Data plane (OG Storage + OG DA):**
  - Service manifests, schemas, signed proofs, execution traces
  - DA stream for high-volume events and audit snapshots

## Build flow

1. Register agent using **Agent ID** and stake on **OG Chain**.
2. Publish service manifest to **OG Storage**; post reference hash on **OG Chain**.
3. Broadcast requests/offers through **OG DA**.
4. Match + execute jobs on **OG Compute** (optionally in **Privacy/Secure Execution**).
5. Submit completion proofs/results; settle payment on **OG Chain**.
6. Update reputation and optionally slash malicious actors.

## Quick answer for your form

If the form allows multiple selection, choose:

- **OG Storage**
- **OG DA**
- **OG Compute**
- **OG Chain**
- **Agent ID**
- **Privacy / Secure Execution**

Choose **Other** only if required by your specific integration.
