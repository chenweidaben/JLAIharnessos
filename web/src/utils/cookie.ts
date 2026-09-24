/**
 * 健澜科技 jlmedaios - Cookie 读取工具
 *
 * 仅提供只读访问，用于读取服务端下发的非 HttpOnly Cookie（如 csrf-token）。
 * 不写入、不枚举敏感会话 Cookie。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 读取指定名称的 Cookie 值；不存在时返回空字符串（兼容 SSR/非浏览器环境） */
export function getCookie(name: string): string {
  if (typeof document === 'undefined' || !document.cookie) return '';
  const encoded = encodeURIComponent(name);
  const segments = document.cookie.split(';');
  for (const raw of segments) {
    const seg = raw.trim();
    if (seg.startsWith(`${encoded}=`)) {
      return decodeURIComponent(seg.slice(encoded.length + 1));
    }
  }
  return '';
}

/** 读取服务端登录时下发的 CSRF Token（双重提交 Cookie 模式） */
export function getCsrfToken(): string {
  return getCookie('csrf-token');
}
