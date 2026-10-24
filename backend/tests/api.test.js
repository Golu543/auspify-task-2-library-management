const BASE_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- STARTING LIBRARY API VERIFICATION TESTS ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name} ->`, err.message);
      failed++;
    }
  }

  // 1. Health check
  await test('GET /health verifies database connection', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Health check failed');
  });

  // 2. Dashboard metrics
  await test('GET /dashboard/stats returns accurate metrics', async () => {
    const res = await fetch(`${BASE_URL}/dashboard/stats`);
    const json = await res.json();
    if (!json.success || typeof json.data.total_titles !== 'number') {
      throw new Error('Stats payload malformed');
    }
    if (json.data.total_titles < 1) throw new Error('Expected at least 1 book title');
  });

  // 3. Books catalog
  await test('GET /books returns seeded books array', async () => {
    const res = await fetch(`${BASE_URL}/books`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
      throw new Error('Failed to retrieve books list');
    }
  });

  // 4. Out of stock issue prevention
  await test('POST /transactions/issue rejects book with 0 available copies', async () => {
    // Book 8 in seed data has available_copies = 0
    const res = await fetch(`${BASE_URL}/transactions/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: 8, member_id: 2, due_days: 14 })
    });
    const json = await res.json();
    if (res.status !== 400 || json.success === true) {
      throw new Error('Server allowed issuing an out-of-stock book');
    }
  });

  // 5. Reports summary
  await test('GET /reports/summary returns categorized analytics', async () => {
    const res = await fetch(`${BASE_URL}/reports/summary`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.category_breakdown)) {
      throw new Error('Report summary payload invalid');
    }
  });

  console.log('--------------------------------------------------');
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runTests();