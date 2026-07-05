import worker from '../src/worker.js';

// Mock D1
const mockDB = {
    prepare: (query) => ({
        bind: () => ({
            all: async () => ({ results: [] }),
            first: async () => null
        }),
        all: async () => {
            if (query.includes('settings') && query.includes('knowledge_base')) {
                return { results: [{ value: JSON.stringify([{q: 'Test?', a: 'Test!'}]) }] };
            }
            if (query.includes('blog_posts')) {
                return { results: [{ title: 'Test Post', slug: 'test-post' }] };
            }
            if (query.includes('settings') && query.includes('site_config')) {
                return { results: [{ value: JSON.stringify({ phone: '123' }) }] };
            }
            return { results: [] };
        }
    })
};

// Mock KV
const mockKV = {
    get: async () => null,
    put: async () => null
};

async function runTests() {
  console.log('🚀 Starting Advanced Ecosystem Verification...');

  const env = {
    DB: mockDB,
    LIMITER: mockKV,
    X_POWERED_BY: 'Vakil.AI/1.0',
    PRIMARY_DOMAIN: 'law.webiyar.com',
    JWT_SECRET: 'test-secret'
  };

  const tests = [
    {
      name: 'Landing Page SEO & Layout',
      url: 'https://law.webiyar.com/',
      assert: (res) => res.status === 200 && res.headers.get('X-Powered-By') === 'Vakil.AI/1.0'
    },
    {
      name: 'Knowledge Center Route',
      url: 'https://law.webiyar.com/knowledge',
      assert: (res) => res.status === 200
    },
    {
      name: 'Blog Route',
      url: 'https://law.webiyar.com/blog',
      assert: (res) => res.status === 200
    },
    {
      name: 'Chat Redirect to Bot',
      url: 'https://law.webiyar.com/chat',
      assert: (res) => res.status === 302 && res.headers.get('Location').includes('t.me')
    },
    {
        name: 'Dashboard Unauthorized',
        url: 'https://law.webiyar.com/dashboard',
        assert: (res) => res.status === 401
    },
    {
        name: 'Dashboard Authorized',
        url: 'https://law.webiyar.com/dashboard',
        headers: { 'Authorization': 'Bearer test-secret' },
        assert: (res) => res.status === 200
    }
  ];

  let passed = 0;
  for (const test of tests) {
    try {
      const req = new Request(test.url, { headers: test.headers || {} });
      const res = await worker.fetch(req, env, {});
      const success = await test.assert(res);
      if (success) {
        console.log(`✅ PASSED: ${test.name}`);
        passed++;
      } else {
        console.error(`❌ FAILED: ${test.name}`);
        console.log(`   Status: ${res.status}`);
      }
    } catch (err) {
      console.error(`💥 ERROR in ${test.name}:`, err.message);
      console.error(err.stack);
    }
  }

  console.log(`\n📊 Summary: ${passed}/${tests.length} tests passed.`);
  if (passed !== tests.length) process.exit(1);
}

if (typeof HTMLRewriter === 'undefined') {
  global.HTMLRewriter = class {
    on() { return this; }
    transform(res) { return res; }
  };
}

runTests();
