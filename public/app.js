async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function refresh() {
  const state = await api('/api/state');

  const agentOptions = state.agents.map(a => `<option value="${a.id}">${a.name} (${a.reputation}) [${a.network || 'OG'}]</option>`).join('');
  document.querySelector('#listing-form select[name="agentId"]').innerHTML = agentOptions;
  document.querySelector('#job-form select[name="buyerAgentId"]').innerHTML = agentOptions;

  const listingOptions = state.listings.map(l => `<option value="${l.id}">${l.title} - ${l.price} [${l.network || 'OG'}]</option>`).join('');
  document.querySelector('#job-form select[name="listingId"]').innerHTML = listingOptions;

  const jobOptions = state.jobs.map(j => `<option value="${j.id}">${j.id.slice(0, 8)}... (${j.status})</option>`).join('');
  document.querySelector('#settle-form select[name="jobId"]').innerHTML = jobOptions;

  document.getElementById('state').textContent = JSON.stringify(state, null, 2);
}

document.getElementById('agent-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  await api('/api/agents', {
    method: 'POST',
    body: JSON.stringify({
      name: form.get('name'),
      network: form.get('network'),
      capabilities: String(form.get('capabilities') || '').split(',').map(s => s.trim()).filter(Boolean),
      stake: Number(form.get('stake') || 0)
    })
  });
  e.target.reset();
  await refresh();
});

document.getElementById('listing-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  await api('/api/listings', {
    method: 'POST',
    body: JSON.stringify({
      agentId: form.get('agentId'),
      network: form.get('network'),
      title: form.get('title'),
      description: form.get('description'),
      price: Number(form.get('price') || 0)
    })
  });
  e.target.reset();
  await refresh();
});

document.getElementById('job-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  await api('/api/jobs', {
    method: 'POST',
    body: JSON.stringify({
      buyerAgentId: form.get('buyerAgentId'),
      listingId: form.get('listingId'),
      privateExecution: form.get('privateExecution') === 'on'
    })
  });
  await refresh();
});

document.getElementById('settle-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  await api(`/api/jobs/${form.get('jobId')}/settle`, {
    method: 'POST',
    body: JSON.stringify({ success: form.get('success') === 'true' })
  });
  await refresh();
});

refresh().catch(err => {
  document.getElementById('state').textContent = err.message;
});
