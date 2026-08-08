const BASE_URL = 'http://localhost:8000/api';

export async function fetchSummary() {
  const res = await fetch(`${BASE_URL}/dashboard/summary`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function fetchAlerts(type = 'all') {
  const res = await fetch(`${BASE_URL}/alerts?type=${type}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function fetchOrgTree() {
  const res = await fetch(`${BASE_URL}/org/tree`);
  if (!res.ok) throw new Error('Failed to fetch org tree');
  return res.json();
}

export async function fetchFileJourney(fileId) {
  const res = await fetch(`${BASE_URL}/files/${fileId}/journey`);
  if (!res.ok) throw new Error('Failed to fetch file journey');
  return res.json();
}

export async function fetchEmployeeWorkload(employeeId) {
  const res = await fetch(`${BASE_URL}/employees/${employeeId}/workload`);
  if (!res.ok) throw new Error('Failed to fetch employee workload');
  return res.json();
}
