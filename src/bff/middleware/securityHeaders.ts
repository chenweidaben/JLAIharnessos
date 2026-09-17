/**
 * 健澜科技数智医院智能体 - BFF 安全响应头中间件
 *
 * 等保三级 / OWASP 推荐安全头：
 *  - X-Content-Type-Options: nosniff
 *  - X-Frame-Options: DENY（防点击劫持）
 *  - Referrer-Policy: no-referrer
 *  - Content-Security-Policy：限制脚本/样式/源
 *  - Strict-Transport-Security（仅 HTTPS 下生效）
 *  - X-XSS-Protection（旧浏览器兜底）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'X-XSS-Protection': '1; mode=block',
  // CSP：BFF 仅返回 JSON，限制最严格
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

/** 给 Response 附加安全头（在返回前调用） */
export function withSecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  // HSTS 仅在 HTTPS 下有意义，开发环境 HTTP 不强制
  if (process.env.HTTPS === 'true' || process.env.APP_ENV === 'prod') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
