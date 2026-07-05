import { Router } from 'itty-router';

const router = Router();

// --- Layouts & Components (Inlined for simplicity in this sandbox, normally read from src/templates) ---

const BASE_LAYOUT = (content, title = '', desc = '') => `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;300;400;700;900&display=swap');
        body { font-family: 'Vazirmatn', sans-serif; background-color: #050505; color: white; }
        .hero-gradient { background: radial-gradient(circle at center, #1a1a1a 0%, #050505 100%); }
    </style>
</head>
<body class="min-h-screen flex flex-col">
    <nav class="p-6 flex justify-between items-center border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-[#050505]/80">
        <a href="/" class="text-2xl font-black tracking-tighter text-[#d4af37]">Vakil.AI</a>
        <div class="hidden md:flex space-x-reverse space-x-8 text-sm uppercase tracking-widest">
            <a href="/" class="hover:text-[#d4af37] transition">خانه</a>
            <a href="/knowledge" class="hover:text-[#d4af37] transition">دانشنامه</a>
            <a href="/blog" class="hover:text-[#d4af37] transition">بلاگ</a>
        </div>
        <a href="https://t.me/VakilAi_Bot" class="bg-[#d4af37] text-black px-6 py-2 rounded-full font-bold hover:scale-105 transition">شروع مشاوره</a>
    </nav>
    <main class="flex-grow">${content}</main>
    <footer class="bg-black py-20 px-6 border-t border-white/10">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div class="text-2xl font-black text-[#d4af37]">Vakil.AI</div>
            <p class="text-gray-500 text-sm">تمامی حقوق برای وکیل هوش مصنوعی محفوظ است. © ۲۰۲۶</p>
        </div>
    </footer>
</body>
</html>`;

// --- SEO & Meta Transformation ---

class SEOHandler {
  constructor(metadata) { this.metadata = metadata; }
  element(element) {
    if (element.tagName === 'head') {
      if (this.metadata.title) element.append(`<title>${this.metadata.title}</title>`, { html: true });
      if (this.metadata.description) element.append(`<meta name="description" content="${this.metadata.description}">`, { html: true });
      if (this.metadata.title) element.append(`<meta property="og:title" content="${this.metadata.title}">`, { html: true });
      if (this.metadata.description) element.append(`<meta property="og:description" content="${this.metadata.description}">`, { html: true });
      element.append(`<meta property="og:type" content="website">`, { html: true });
      if (this.metadata.schema) {
        element.append(`<script type="application/ld+json">${JSON.stringify(this.metadata.schema)}</script>`, { html: true });
      }
    }
  }
}

// --- Mobile Asset Stripper ---
class MobileOptimizer {
  constructor(isMobile) { this.isMobile = isMobile; }
  element(element) {
    if (this.isMobile && element.getAttribute('data-luxury-only') === 'true') {
      element.remove();
    }
  }
}

// --- Middleware ---

const withSecurityHeaders = (request, env) => {
  return (response) => {
    const headers = new Headers(response.headers);
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Content-Security-Policy', "default-src 'self' https: 'unsafe-inline' cdn.tailwindcss.com fonts.googleapis.com fonts.gstatic.com; img-src 'self' data: https:;");
    headers.set('X-Powered-By', env.X_POWERED_BY || 'Vakil.AI/1.0');

    // Canonical Domain Check
    const url = new URL(request.url);
    if (env.PRIMARY_DOMAIN && url.hostname !== env.PRIMARY_DOMAIN && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
        headers.set('Link', `<https://${env.PRIMARY_DOMAIN}${url.pathname}>; rel="canonical"`);
    }

    return new Response(response.body, { status: response.status, headers });
  };
};

const authMiddleware = async (request, env) => {
    const authHeader = request.headers.get('Authorization') || new URL(request.url).searchParams.get('token');

    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (authHeader) {
        token = authHeader;
    }

    if (!token) {
        return new Response('Unauthorized: No token provided', { status: 401 });
    }

    // In a real app, we would verify the JWT signature here.
    // For this architectural demo, we'll validate against the secret or a known session.
    if (token !== env.JWT_SECRET && token !== 'demo-user-token') {
        return new Response('Unauthorized: Invalid token', { status: 401 });
    }

    request.user = { id: 'user_1', role: 'USER' }; // Mock user object
};

router.all('*', async (request, env) => {
  request.addSecurityHeaders = (response) => withSecurityHeaders(request, env)(response);

  // Smart Rate Limiting
  const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';
  if (env.LIMITER) {
    const key = `rate-limit:${ip}`;
    const count = parseInt(await env.LIMITER.get(key) || '0');
    if (count > 100) {
       return new Response('Too Many Requests', { status: 429 });
    }
    await env.LIMITER.put(key, (count + 1).toString(), { expirationTtl: 60 });
  }
});

// --- Routes ---

router.get('/', async (request, env) => {
  const isMobile = /Mobile|Android|iPhone/i.test(request.headers.get('user-agent') || '');

  const { results: settings } = await env.DB.prepare("SELECT * FROM settings WHERE key = 'site_config'").all();
  const config = settings.length ? JSON.parse(settings[0].value) : { phone: '09016807808' };

  const metadata = {
    title: 'Vakil.AI - وکیل هوشمند | نسل آینده عدالت',
    description: 'اولین پلتفرم هوش مصنوعی حقوقی ایران با قابلیت تحلیل قرارداد، مشاوره صوتی و تنظیم اوراق قضایی.',
    schema: { "@context": "https://schema.org", "@type": "LegalService", "name": "Vakil.AI", "telephone": config.phone }
  };
  const content = `<section class="hero-gradient py-32 text-center px-4">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-5xl md:text-7xl font-black mb-8 leading-tight">وکیل هوشمند؛ <br><span class="text-[#d4af37]">عدالت در دسترس همه</span></h1>
        <p class="text-xl text-gray-400 mb-12 leading-relaxed">ترکیب هوش مصنوعی مولد و دانش حقوقی به‌روز برای پاسخ به سوالات شما در کمتر از ۳ ثانیه.</p>
        <div data-luxury-only="true" class="mb-8 p-4 bg-white/5 rounded-xl border border-white/10">این بخش فقط در دسکتاپ نمایش داده می‌شود (لوکس)</div>
        <div class="flex justify-center gap-6">
            <a href="https://t.me/VakilAi_Bot" class="bg-[#d4af37] text-black px-12 py-4 rounded-full font-black text-xl hover:bg-white transition">شروع مشاوره رایگان</a>
        </div>
    </div>
  </section>`;
  const response = new Response(BASE_LAYOUT(content), {
    headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600'
    }
  });
  return new HTMLRewriter()
    .on('head', new SEOHandler(metadata))
    .on('[data-luxury-only]', new MobileOptimizer(isMobile))
    .transform(response);
});

router.get('/knowledge', async (request, env) => {
  const { results } = await env.DB.prepare("SELECT * FROM settings WHERE key = 'knowledge_base'").all();
  const knowledgeData = results.length ? JSON.parse(results[0].value) : [];

  const metadata = {
    title: 'دانشنامه حقوقی Vakil.AI - پاسخ به سوالات متداول حقوقی',
    description: 'مرکز دانش حقوقی برای آموزش و رفع ابهام در حوزه‌های خانواده، کسب‌وکار، کیفری و ثبتی.',
    schema: { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": knowledgeData.map(item => ({
        "@type": "Question", "name": item.q, "acceptedAnswer": { "@type": "Answer", "text": item.a }
    })) }
  };

  const content = `<section class="py-20 px-6 max-w-4xl mx-auto">
    <h1 class="text-4xl font-black mb-12">مرکز <span class="text-[#d4af37]">دانش حقوقی</span></h1>
    <div class="space-y-6">
        ${knowledgeData.map(item => `
        <div class="bg-white/5 p-8 rounded-3xl border border-white/10">
            <h3 class="text-xl font-bold mb-4">${item.q}</h3>
            <p class="text-gray-400 leading-relaxed">${item.a}</p>
        </div>`).join('')}
        ${knowledgeData.length === 0 ? '<p>مطلبی یافت نشد.</p>' : ''}
    </div>
  </section>`;

  const response = new Response(BASE_LAYOUT(content), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  return new HTMLRewriter().on('head', new SEOHandler(metadata)).transform(response);
});

router.get('/blog', async (request, env) => {
  const { results } = await env.DB.prepare("SELECT * FROM blog_posts WHERE is_published = 1 ORDER BY published_at DESC").all();

  const metadata = { title: 'بلاگ تخصصی حقوق و تکنولوژی - Vakil.AI', description: 'آخرین اخبار و مقالات دنیای Legal Tech.' };
  const content = `<section class="py-20 px-6 max-w-6xl mx-auto">
    <h1 class="text-4xl font-black mb-12">آخرین مطالب <span class="text-[#d4af37]">بلاگ</span></h1>
    <div class="grid md:grid-cols-3 gap-8">
        ${results.map(post => `
        <article class="bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-[#d4af37]/50 transition">
            <div class="p-8">
                <div class="text-[#d4af37] text-xs font-bold mb-4 uppercase">${post.category || 'عمومی'}</div>
                <h2 class="text-xl font-bold mb-4">${post.title}</h2>
                <p class="text-gray-500 text-sm mb-6">${post.summary || ''}</p>
                <a href="/blog/${post.slug}" class="text-white font-bold text-sm">مطالعه بیشتر ←</a>
            </div>
        </article>`).join('')}
        ${results.length === 0 ? '<p>مطلبی یافت نشد.</p>' : ''}
    </div>
  </section>`;
  const response = new Response(BASE_LAYOUT(content), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  return new HTMLRewriter().on('head', new SEOHandler(metadata)).transform(response);
});

router.get('/blog/:slug', async (request, env) => {
    const { slug } = request.params;
    const post = await env.DB.prepare("SELECT * FROM blog_posts WHERE slug = ? AND is_published = 1").bind(slug).first();

    if (!post) return new Response('Not Found', { status: 404 });

    const metadata = {
        title: post.seo_title || post.title,
        description: post.seo_description || post.summary
    };
    const content = `<section class="py-20 px-6 max-w-4xl mx-auto">
        <div class="mb-8">
            <a href="/blog" class="text-[#d4af37] hover:underline">← بازگشت به بلاگ</a>
        </div>
        <h1 class="text-4xl font-black mb-8">${post.title}</h1>
        <div class="prose prose-invert max-w-none text-gray-300 leading-loose">
            ${post.content}
        </div>
    </section>`;
    const response = new Response(BASE_LAYOUT(content), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new HTMLRewriter().on('head', new SEOHandler(metadata)).transform(response);
});

router.get('/analysis', async (request, env) => {
  const metadata = {
    title: 'تحلیل هوشمند قرارداد - Vakil.AI',
    description: 'تحلیل دقیق بندهای قرارداد و شناسایی مخاطرات حقوقی با هوش مصنوعی.',
    schema: { "@context": "https://schema.org", "@type": "Service", "name": "Contract Analysis" }
  };
  const content = `<section class="py-20 px-6 max-w-4xl mx-auto">
    <h1 class="text-4xl font-black mb-8">L-1 <span class="text-[#d4af37]">ANALYSIS</span></h1>
    <p class="text-xl text-gray-400">سرویس تحلیل خودکار قراردادهای تجاری و مسکونی.</p>
  </section>`;
  const response = new Response(BASE_LAYOUT(content), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  return new HTMLRewriter().on('head', new SEOHandler(metadata)).transform(response);
});

router.get('/audit', async (request, env) => {
  const metadata = {
    title: 'حسابرسی حقوقی - Vakil.AI',
    description: 'بررسی جامع وضعیت حقوقی کسب‌وکار شما برای پیشگیری از دعاوی.',
    schema: { "@context": "https://schema.org", "@type": "Service", "name": "Legal Audit" }
  };
  const content = `<section class="py-20 px-6 max-w-4xl mx-auto">
    <h1 class="text-4xl font-black mb-8">L-2 <span class="text-[#d4af37]">AUDIT</span></h1>
    <p class="text-xl text-gray-400">حسابرسی و انطباق حقوقی برای استارتاپ‌ها و شرکت‌ها.</p>
  </section>`;
  const response = new Response(BASE_LAYOUT(content), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  return new HTMLRewriter().on('head', new SEOHandler(metadata)).transform(response);
});

router.get('/strategy', async (request, env) => {
    const metadata = {
      title: 'استراتژی حقوقی - Vakil.AI',
      description: 'طراحی نقشه راه حقوقی برای پرونده‌های پیچیده و مذاکرات حساس.',
      schema: { "@context": "https://schema.org", "@type": "Service", "name": "Legal Strategy" }
    };
    const content = `<section class="py-20 px-6 max-w-4xl mx-auto">
      <h1 class="text-4xl font-black mb-8">L-3 <span class="text-[#d4af37]">STRATEGY</span></h1>
      <p class="text-xl text-gray-400">طراحی سناریوهای برد در دعاوی و مذاکرات تجاری.</p>
    </section>`;
    const response = new Response(BASE_LAYOUT(content), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new HTMLRewriter().on('head', new SEOHandler(metadata)).transform(response);
});

router.get('/engineering', async (request, env) => {
    const metadata = {
      title: 'مهندسی حقوقی - Vakil.AI',
      description: 'ساختاربندی مجدد قراردادها و فرآیندهای حقوقی با متدولوژی‌های مدرن.',
      schema: { "@context": "https://schema.org", "@type": "Service", "name": "Legal Engineering" }
    };
    const content = `<section class="py-20 px-6 max-w-4xl mx-auto">
      <h1 class="text-4xl font-black mb-8">L-4 <span class="text-[#d4af37]">ENGINEERING</span></h1>
      <p class="text-xl text-gray-400">تحول دیجیتال فرآیندهای حقوقی سازمان شما.</p>
    </section>`;
    const response = new Response(BASE_LAYOUT(content), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new HTMLRewriter().on('head', new SEOHandler(metadata)).transform(response);
});

router.get('/dashboard', async (request, env) => {
    const authError = await authMiddleware(request, env);
    if (authError) return authError;

    const content = `<section class="py-20 px-6 max-w-6xl mx-auto">
        <h1 class="text-4xl font-black mb-12">داشبورد <span class="text-[#d4af37]">کاربری</span></h1>
        <div class="grid md:grid-cols-2 gap-8">
            <div class="bg-white/5 p-8 rounded-3xl border border-white/10">
                <h3 class="text-xl font-bold mb-4">وضعیت اشتراک</h3>
                <p class="text-[#d4af37] text-2xl font-black">پلن حرفه‌ای (PRO)</p>
            </div>
        </div>
    </section>`;
    const response = new Response(BASE_LAYOUT(content), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new HTMLRewriter().on('head', new SEOHandler({ title: 'داشبورد کاربری - Vakil.AI' })).transform(response);
});

router.get('/chat', () => Response.redirect('https://t.me/VakilAi_Bot', 302));

router.post('/api/auth/login', async (request, env) => {
    const { email } = await request.json();
    if (!email) return new Response('Email required', { status: 400 });

    // Mock OTP/Magic Link logic
    const token = env.JWT_SECRET; // Simplification for demo
    return new Response(JSON.stringify({ token, message: 'Login successful' }), {
        headers: { 'Content-Type': 'application/json' }
    });
});

// Admin Seed Route (Protected)
router.get('/admin/seed', async (request, env) => {
    const authError = await authMiddleware(request, env);
    if (authError) return authError;

    await env.DB.prepare("INSERT OR REPLACE INTO blog_posts (id, slug, title, summary, content, category, is_published, published_at) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))")
        .bind(crypto.randomUUID(), 'future-of-law', 'آینده وکالت در عصر هوش مصنوعی', 'بررسی نقش ابزارهای AI در تسهیل فرآیندهای قضایی...', 'متن کامل مقاله در مورد آینده وکالت...', 'هوش مصنوعی')
        .run();

    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))")
        .bind('knowledge_base', JSON.stringify([{q: 'چگونه از تحلیل قرارداد هوشمند استفاده کنم؟', a: 'کافیست تصویر قرارداد خود را در ربات تلگرام آپلود کنید تا سیستم مین‌های حقوقی را شناسایی کند.'}]))
        .run();

    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))")
        .bind('site_config', JSON.stringify({ phone: '09016807808' }))
        .run();

    return new Response('Seeded successfully');
});

router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  async fetch(request, env, ctx) {
    const response = await router.handle(request, env, ctx);
    return request.addSecurityHeaders ? request.addSecurityHeaders(response) : response;
  },
};
