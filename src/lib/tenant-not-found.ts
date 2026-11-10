/**
 * The friendly 404 for a host that is not an active storefront.
 *
 * Middleware runs before React, so this response cannot use the app's
 * components. It is a tiny self-contained page with no scripts, no external
 * assets and no stack trace — exactly what an unknown or reserved slug should
 * see. The same message is rendered by `src/app/not-found.tsx` when the tenant
 * API itself answers `404 Tenant Not Found`.
 */

const HTML = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>المتجر غير موجود | Store not found</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #fbf3ea;
        color: #201a16;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif;
      }
      .card {
        width: 100%;
        max-width: 460px;
        border: 1px solid #eadfd4;
        border-radius: 28px;
        background: #fff;
        padding: 44px 28px;
        text-align: center;
        box-shadow: 0 30px 60px -40px rgba(32, 26, 22, 0.45);
      }
      .mark {
        width: 64px;
        height: 64px;
        margin: 0 auto 22px;
        display: grid;
        place-items: center;
        border-radius: 30%;
        background: #e8452c;
        color: #fbf3ea;
        font-size: 28px;
        font-weight: 800;
      }
      .code { margin: 0; color: #e8452c; font-size: 44px; font-weight: 800; letter-spacing: 0.04em; }
      h1 { margin: 8px 0 0; font-size: 22px; line-height: 1.4; }
      p { margin: 12px auto 0; max-width: 34ch; color: #7a6c61; font-size: 14px; line-height: 1.9; }
      .en { direction: ltr; font-size: 13px; }
      a {
        display: inline-block;
        margin-top: 26px;
        border-radius: 999px;
        background: #e8452c;
        color: #fff;
        padding: 12px 22px;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="mark" aria-hidden="true">N</div>
      <p class="code">404</p>
      <h1>المتجر غير موجود</h1>
      <p>العنوان ده مش مرتبط بمتجر نشط على ناوي أوردرز. تأكد من الرابط أو تواصل مع المطعم.</p>
      <p class="en">This address doesn't point to an active Nawy Orders store. Check the link or contact the restaurant.</p>
      <a href="https://nawyorders.com">ناوي أوردرز · Nawy Orders</a>
    </main>
  </body>
</html>`;

export function tenantNotFoundResponse(): Response {
  return new Response(HTML, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
