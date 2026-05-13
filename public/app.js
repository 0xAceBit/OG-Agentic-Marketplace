// OG Network Configuration
const OG_CONFIG = {
  testnet: {
    chainId: 16602,
    name: 'OG Galileo Testnet',
    rpcUrl: 'https://rpc-galileo.0g.ai',
    blockExplorer: 'https://chainscan-galileo.0g.ai',
    faucet: 'https://faucet.0g.ai'
  },
  mainnet: {
    chainId: 16600,
    name: 'OG Mainnet',
    rpcUrl: 'https://rpc.0g.ai',
    blockExplorer: 'https://chainscan.0g.ai'
  }
};

let state = { agents: [], listings: [], jobs: [], settlements: [] };
let wallet = null;
let provider = null;
let currentAlert = null;

function showAlert(message, type = 'error', duration = 5000) {
  const alertDiv = document.getElementById('alert');
  if (!alertDiv) return;
  alertDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  alertDiv.style.display = 'block';
  if (duration) setTimeout(() => { if (alertDiv) alertDiv.innerHTML = ''; }, duration);
}

async function api(path, options = {}) {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    showAlert(err.message, 'error');
    throw err;
  }
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      showAlert('MetaMask not detected. Please install MetaMask.', 'error');
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    wallet = accounts[0];
    provider = new ethers.BrowserProvider(window.ethereum);
    updateUI();
    showAlert(`Connected: ${wallet.slice(0, 6)}...${wallet.slice(-4)}`, 'success');
  } catch (err) {
    showAlert('Failed to connect wallet', 'error');
  }
}

async function refresh() {
  try {
    state = await api('/api/state');
    updateUI();
  } catch (err) {
    console.error(err);
  }
}

function updateUI() {
  const app = document.getElementById('app');
  const walletStr = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'Disconnected';
  const agentOpts = state.agents.map(a => `<option value="${a.id}">${a.name} (rep: ${a.reputation})</option>`).join('');
  const listingOpts = state.listings.map(l => `<option value="${l.id}">${l.title} - ${l.price} 0G</option>`).join('');
  const jobOpts = state.jobs.map(j => `<option value="${j.id}">${j.id.slice(0, 8)}... (${j.status})</option>`).join('');

  app.innerHTML = `
    <div class="nav" style="padding: 16px; display: flex; justify-content: space-between; align-items: center;">
      <h1 style="font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">🚀 OG Marketplace</h1>
      <div style="display: flex; gap: 16px; align-items: center;">
        <div class="network-status">
          <div class="status-dot"></div>
          <span>OG Galileo (16602)</span>
        </div>
        <button class="wallet-btn" onclick="connectWallet()" style="margin: 0;">
          ${wallet ? `Wallet: ${walletStr}` : 'Connect Wallet'}
        </button>
      </div>
    </div>

    <div class="container">
      <div id="alert" style="display: none;"></div>

      <div class="grid-2">
        <div class="card fade-in">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;"><span>📋</span> Register Agent</h2>
          <form onsubmit="registerAgent(event)">
            <div class="form-group">
              <label>Agent Name</label>
              <input name="name" type="text" placeholder="e.g., AI Data Processor" required>
            </div>
            <div class="form-group">
              <label>Capabilities</label>
              <input name="capabilities" type="text" placeholder="e.g., summarize, analyze, compute" value="">
            </div>
            <div class="form-group">
              <label>Stake (0G)</label>
              <input name="stake" type="number" placeholder="10" value="10" min="0">
            </div>
            <button type="submit">Register Agent</button>
          </form>
        </div>

        <div class="card fade-in">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;"><span>📝</span> Publish Listing</h2>
          <form onsubmit="publishListing(event)">
            <div class="form-group">
              <label>Select Agent</label>
              <select name="agentId" required>${agentOpts || '<option>No agents registered</option>'}</select>
            </div>
            <div class="form-group">
              <label>Service Title</label>
              <input name="title" type="text" placeholder="e.g., Document Summarization" required>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea name="description" placeholder="Service details..." style="min-height: 80px;"></textarea>
            </div>
            <div class="form-group">
              <label>Price (0G)</label>
              <input name="price" type="number" placeholder="25" value="25" min="0" required>
            </div>
            <button type="submit">Publish Listing</button>
          </form>
        </div>

        <div class="card fade-in">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;"><span>⚙️</span> Create Job</h2>
          <form onsubmit="createJob(event)">
            <div class="form-group">
              <label>Buyer Agent</label>
              <select name="buyerAgentId" required>${agentOpts || '<option>No agents registered</option>'}</select>
            </div>
            <div class="form-group">
              <label>Service Listing</label>
              <select name="listingId" required>${listingOpts || '<option>No listings available</option>'}</select>
            </div>
            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 16px;">
                <input name="privateExecution" type="checkbox" style="width: auto;">
                <span>Private Execution</span>
              </label>
            </div>
            <button type="submit">Create Job</button>
          </form>
        </div>

        <div class="card fade-in">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;"><span>✅</span> Settle Job</h2>
          <form onsubmit="settleJob(event)">
            <div class="form-group">
              <label>Select Job</label>
              <select name="jobId" required>${jobOpts || '<option>No jobs available</option>'}</select>
            </div>
            <div class="form-group">
              <label>Outcome</label>
              <select name="success" required>
                <option value="true">✓ Success (pay provider)</option>
                <option value="false">✗ Failure (refund buyer)</option>
              </select>
            </div>
            <button type="submit">Settle Job</button>
          </form>
        </div>
      </div>

      <div class="card fade-in" style="margin-top: 20px;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;"><span>📊</span> Marketplace State</h2>
        <div class="state-viewer" id="stateViewer"></div>
      </div>
    </div>
  `;

  document.getElementById('stateViewer').textContent = JSON.stringify(state, null, 2);
}

async function registerAgent(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await api('/api/agents', {
      method: 'POST',
      body: JSON.stringify({
        name: form.get('name'),
        network: 'OG Galileo',
        capabilities: String(form.get('capabilities') || '').split(',').map(s => s.trim()).filter(Boolean),
        stake: Number(form.get('stake') || 0)
      })
    });
    showAlert('✓ Agent registered successfully!', 'success');
    event.target.reset();
    await refresh();
  } catch (err) {
    showAlert(`Failed to register agent: ${err.message}`, 'error');
  }
}

async function publishListing(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await api('/api/listings', {
      method: 'POST',
      body: JSON.stringify({
        agentId: form.get('agentId'),
        title: form.get('title'),
        description: form.get('description'),
        price: Number(form.get('price') || 0),
        network: 'OG Galileo'
      })
    });
    showAlert('✓ Listing published successfully!', 'success');
    event.target.reset();
    await refresh();
  } catch (err) {
    showAlert(`Failed to publish listing: ${err.message}`, 'error');
  }
}

async function createJob(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await api('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        buyerAgentId: form.get('buyerAgentId'),
        listingId: form.get('listingId'),
        privateExecution: form.get('privateExecution') === 'on'
      })
    });
    showAlert('✓ Job created successfully!', 'success');
    await refresh();
  } catch (err) {
    showAlert(`Failed to create job: ${err.message}`, 'error');
  }
}

async function settleJob(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const jobId = form.get('jobId');
  const success = form.get('success') === 'true';
  try {
    await api(`/api/jobs/${jobId}/settle`, {
      method: 'POST',
      body: JSON.stringify({ success })
    });
    showAlert(`✓ Job settled: ${success ? 'provider paid ✓' : 'buyer refunded ↩'}`, 'success');
    await refresh();
  } catch (err) {
    showAlert(`Failed to settle job: ${err.message}`, 'error');
  }
}

window.addEventListener('load', () => {
  updateUI();
  refresh();
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      wallet = accounts[0] || null;
      updateUI();
    });
  }
  setInterval(refresh, 5000);
});
