# OG Agentic Marketplace App

This project is a runnable MVP of an agent-to-agent marketplace using OG-inspired components:

- **OG Chain**: escrow + settlement + reputation lifecycle.
- **Agent ID**: agent registration and capability identity.
- **OG Compute**: off-chain execution references for job processing.
- **OG Storage**: listing metadata + storage CIDs.
- **OG DA**: data availability batch references for request flows.
- **Privacy / Secure Execution**: private execution flag per job.

## Run

```bash
npm start
```

Open http://localhost:3000.

## Test

```bash
npm test
```

## API endpoints

- `GET /api/state`
- `POST /api/agents`
- `POST /api/listings`
- `POST /api/jobs`
- `POST /api/jobs/:id/settle`
