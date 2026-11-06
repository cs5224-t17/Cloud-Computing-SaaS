// Load test for the directory. Two kinds of traffic:
//   browse       - customers searching and opening listings (read-heavy), ramps to 100 virtual users to trigger ASG scale-out
//   owner_update - an owner flipping "taking orders" on one listing (write path: PATCH -> event queue -> follower emails)
// The owner scenario only runs when OWNER_EMAIL, OWNER_PASSWORD and OWNER_BUSINESS_ID are set (see notes at the bottom).
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.TARGET;
const P95 = Number(__ENV.P95_MS || 800); // p95 latency target in ms; agree the final number with the evaluation owner
// Fallback search terms (A's original list). Normally the terms are built from the loaded data in setup().
const FALLBACK_TERMS = ['bouquet', 'crochet', 'phone screen', 'lash', 'piano', 'candle', 'alteration', 'pottery', 'grooming'];

const OWNER = __ENV.OWNER_EMAIL && __ENV.OWNER_PASSWORD && __ENV.OWNER_BUSINESS_ID;

const scenarios = {
  browse: {
    executor: 'ramping-vus',
    exec: 'browse',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 20 },
      { duration: '3m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '1m', target: 0 },
    ],
  },
};
if (OWNER) {
  scenarios.owner_update = { executor: 'constant-vus', exec: 'ownerUpdate', vus: 2, duration: '10m' }; // same length as browse
}

export const options = {
  scenarios,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [`p(95)<${P95}`],
    ...(OWNER ? { 'http_req_failed{name:owner_update}': ['rate<0.01'] } : {}),
  },
};

// Runs once before the test: build search terms from the data that is actually loaded, and log in the owner if needed.
export function setup() {
  let terms = FALLBACK_TERMS;
  if (__ENV.TERMS) {
    terms = __ENV.TERMS.split(',').map((t) => t.trim());
  } else {
    // Category names are part of the search index, so each of these matches at least one listing.
    const facets = http.get(`${BASE}/api/businesses/facets`);
    const cats = facets.status === 200 ? (facets.json('categories') || []).map((c) => c.value) : [];
    const firstWords = cats.map((c) => c.split(/\s+/)[0].replace(/[^A-Za-z]/g, '')).filter((w) => w.length >= 3);
    if (cats.length) terms = [...cats, ...firstWords];
  }
  if (!OWNER) return { terms };
  const res = http.post(`${BASE}/api/auth/login`,
    JSON.stringify({ email: __ENV.OWNER_EMAIL, password: __ENV.OWNER_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } });
  if (res.status !== 200) throw new Error(`Owner login failed (${res.status}): ${res.body}`);
  return { terms, token: res.json('token') };
}

export function browse(data) {
  const term = data.terms[Math.floor(Math.random() * data.terms.length)];
  const list = http.get(`${BASE}/api/businesses?q=${encodeURIComponent(term)}`, { tags: { name: 'search' } });
  check(list, { 'search 200': (r) => r.status === 200 });

  http.get(`${BASE}/api/businesses/facets`, { tags: { name: 'facets' } });

  const results = list.json('results') || [];
  if (results.length) {
    const slug = results[Math.floor(Math.random() * results.length)].slug;
    const detail = http.get(`${BASE}/api/businesses/${slug}`, { tags: { name: 'detail' } });
    check(detail, { 'detail 200': (r) => r.status === 200 });
  }
  sleep(1 + Math.random() * 2);
}

export function ownerUpdate(data) {
  // Alternate between available / unavailable so every request is a real change.
  const available = __ITER % 2 === 0;
  const res = http.patch(`${BASE}/api/businesses/${__ENV.OWNER_BUSINESS_ID}`,
    JSON.stringify({ is_available: available }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` }, tags: { name: 'owner_update' } });
  check(res, { 'owner update 200': (r) => r.status === 200 });
  sleep(5);
}

// NOTES
// Run:  make loadtest TARGET=<url>                       (browse only)
//       make loadtest TARGET=<url> and add -e flags for the owner scenario, e.g.
//       k6 run -e TARGET=<url> -e OWNER_EMAIL=... -e OWNER_PASSWORD=... -e OWNER_BUSINESS_ID=<id> loadtest/k6.js
// Owner setup: register an account, verify the email, and claim one test listing whose contact_email is a team inbox.
//   Use a listing with NO followers: every update publishes an event and the worker emails the followers.
// Search terms come from the loaded data automatically. Optional: -e P95_MS=300 for the latency target,
// -e TERMS=henna,nails to force specific terms.