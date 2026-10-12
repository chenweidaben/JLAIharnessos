/**
 * 健澜科技 jlmedaios - 预约号生成纯函数（M19-C）
 *
 * 确定性前缀 + 时间戳 + 随机后缀。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export function makeAppointmentId(now: Date = new Date(), rand: () => string = () => Math.random().toString(36).slice(2, 8)): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `APT-${y}${m}${d}${hh}${mm}${ss}-${rand()}`;
}
