const test = require('node:test');
const assert = require('node:assert/strict');
const { db, registerAgent, publishListing, createJob, settleJob } = require('./server');

test('agent -> listing -> job -> settlement flow', () => {
  db.agents.length = 0;
  db.listings.length = 0;
  db.jobs.length = 0;
  db.settlements.length = 0;

  const provider = registerAgent({ name: 'Provider', capabilities: ['summarize'], stake: 100 });
  assert.equal(provider.network, 'OG Mainnet');
  const buyer = registerAgent({ name: 'Buyer', capabilities: ['consume'], stake: 50 });
  const listing = publishListing({ agentId: provider.id, title: 'Summarize docs', description: 'Fast', price: 25 });
  const job = createJob({ buyerAgentId: buyer.id, listingId: listing.id, privateExecution: true });
  const settlement = settleJob(job.id, true);

  assert.equal(job.status, 'settled');
  assert.equal(settlement.providerPaid, 25);
  assert.equal(db.agents.find(a => a.id === provider.id).reputation, 1);
});
