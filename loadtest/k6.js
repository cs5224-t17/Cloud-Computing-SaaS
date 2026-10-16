// Read-heavy browse/search mix (what customers do). Ramps to 100 virtual users to trigger ASG scale-out.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.TARGET;
const TERMS = ['bouquet', 'crochet', 'phone screen', 'lash', 'piano', 'candle', 'alteration', 'pottery', 'grooming'];

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const term = TERMS[Math.floor(Math.random() * TERMS.length)];
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
