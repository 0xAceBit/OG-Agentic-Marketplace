const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// OG Network Configuration
const OG_CONFIG = {
  testnet: {
    chainId: 16602,
    name: 'OG Galileo Testnet',
    rpcUrl: 'https://rpc-galileo.0g.ai',
    blockExplorer: 'https://chainscan-galileo.0g.ai',
    faucet: 'https://faucet.0g.ai',
    contracts: {
      DAEntrance: '0xE75A073dA5bb7b0eC622170Fd268f35E675a957B',
      Storage: {
        Flow: '0x22E03a6A89B950F1c82ec5e74F8eCa321a105296',
        Mine: '0x00A9E9604b0538e06b268Fb297Df333337f9593b',
        Reward: '0xA97B57b4BdFEA2D0a25e535bd849ad4e6C440A69'
      }
    }
  },
  mainnet: {
    chainId: 16600,
    name: 'OG Mainnet',
    rpcUrl: 'https://rpc.0g.ai',
    blockExplorer: 'https://chainscan.0g.ai'
  }
};

const db = {
  agents: [],
  listings: [],
  jobs: [],
  settlements: []
};

function findAgent(agentId) {
  return db.agents.find(a => a.id === agentId);
}

function findListing(listingId) {
  return db.listings.find(l => l.id === listingId);
}

function sendJson(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function registerAgent(data) {
  const agent = {
    id: randomUUID(),
    name: data.name,
    network: data.network || 'OG Mainnet',
    capabilities: data.capabilities || [],
    stake: Number(data.stake || 0),
    reputation: 0,
    createdAt: new Date().toISOString()
  };
  db.agents.push(agent);
  return agent;
}

function publishListing(data) {
  const agent = findAgent(data.agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  const listing = {
    id: randomUUID(),
    agentId: data.agentId,
    title: data.title,
    description: data.description,
    price: Number(data.price || 0),
    network: data.network || agent.network,
    storageCid: data.storageCid || `og-storage://${randomUUID()}`,
    createdAt: new Date().toISOString()
  };
  db.listings.push(listing);
  return listing;
}

function createJob(data) {
  const listing = findListing(data.listingId);
  if (!listing) {
    throw new Error('Listing not found');
  }

  const buyer = findAgent(data.buyerAgentId);
  if (!buyer) {
    throw new Error('Buyer agent not found');
  }

  const job = {
    id: randomUUID(),
    buyerAgentId: buyer.id,
    providerAgentId: listing.agentId,
    listingId: listing.id,
    status: 'matched',
    paymentLocked: listing.price,
    chainNetwork: listing.network,
    daBatchRef: `og-da://${randomUUID()}`,
    computeTraceRef: `og-compute://${randomUUID()}`,
    privateExecution: Boolean(data.privateExecution),
    createdAt: new Date().toISOString()
  };
  db.jobs.push(job);
  return job;
}

function settleJob(jobId, success) {
  const job = db.jobs.find(j => j.id === jobId);
  if (!job) {
    throw new Error('Job not found');
  }
  job.status = success ? 'settled' : 'slashed';
  const settlement = {
    id: randomUUID(),
    jobId,
    providerPaid: success ? job.paymentLocked : 0,
    buyerRefund: success ? 0 : job.paymentLocked,
    chainTxHash: `0x${randomUUID().replace(/-/g, '')}`,
    finalizedAt: new Date().toISOString()
  };
  db.settlements.push(settlement);
  const provider = db.agents.find(a => a.id === job.providerAgentId);
  if (provider) {
    provider.reputation += success ? 1 : -1;
  }
  return settlement;
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(urlPath).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const ext = path.extname(filePath);
    const types = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript'
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/state') {
    return sendJson(res, 200, db);
  }

  if (req.method === 'GET' && req.url.startsWith('/api/agents/')) {
    const id = req.url.split('/')[3];
    const agent = findAgent(id);
    if (!agent) return sendJson(res, 404, { error: 'Agent not found' });
    return sendJson(res, 200, agent);
  }

  if (req.method === 'GET' && req.url.startsWith('/api/listings/')) {
    const id = req.url.split('/')[3];
    const listing = findListing(id);
    if (!listing) return sendJson(res, 404, { error: 'Listing not found' });
    return sendJson(res, 200, listing);
  }

  if (req.method === 'POST' && req.url === '/api/agents') {
    const data = await parseBody(req).catch(err => sendJson(res, 400, { error: err.message }));
    if (!data || data.error) return;
    if (!data.name) return sendJson(res, 400, { error: 'name is required' });
    return sendJson(res, 201, registerAgent(data));
  }

  if (req.method === 'POST' && req.url === '/api/listings') {
    const data = await parseBody(req).catch(err => sendJson(res, 400, { error: err.message }));
    if (!data || data.error) return;
    if (!data.agentId || !data.title) return sendJson(res, 400, { error: 'agentId and title are required' });
    return sendJson(res, 201, publishListing(data));
  }

  if (req.method === 'POST' && req.url === '/api/jobs') {
    const data = await parseBody(req).catch(err => sendJson(res, 400, { error: err.message }));
    if (!data || data.error) return;
    if (!data.buyerAgentId || !data.listingId) return sendJson(res, 400, { error: 'buyerAgentId and listingId are required' });
    try {
      return sendJson(res, 201, createJob(data));
    } catch (err) {
      return sendJson(res, 404, { error: err.message });
    }
  }

  if (req.method === 'POST' && req.url.startsWith('/api/jobs/') && req.url.endsWith('/settle')) {
    const jobId = req.url.split('/')[3];
    const data = await parseBody(req).catch(err => sendJson(res, 400, { error: err.message }));
    if (!data || data.error) return;
    try {
      return sendJson(res, 200, settleJob(jobId, Boolean(data.success)));
    } catch (err) {
      return sendJson(res, 404, { error: err.message });
    }
  }

  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/public') || req.url.endsWith('.css') || req.url.endsWith('.js') || req.url.endsWith('.html'))) {
    return serveStatic(req, res);
  }

  return sendJson(res, 404, { error: 'Route not found' });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`OG Agentic Marketplace running on http://localhost:${PORT}`);
  });
}

module.exports = { server, db, registerAgent, publishListing, createJob, settleJob };
