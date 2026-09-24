/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 前端运行时全局配置（DEMO_MODE 开关 / API 与 WebSocket 基址）
 *
 * 约定：
 *  - VITE_DEMO_MODE=1  → 演示模式：顶部展示醒目水印，所有 API fallback 到 web/src/mock/ 本地数据，
 *                        数据不持久化；控制台 console.warn 提示。
 *  - VITE_DEMO_MODE=0  → 真实模式（默认）：直连 BFF（/api/v1），API 失败时显式报错，绝不静默返回假数据。
 */

/** 是否为演示模式（'1' 开启；缺省/其他值均视为真实模式） */
export const isDemoMode: boolean = import.meta.env.VITE_DEMO_MODE === '1';

/** BFF REST 基址：开发态由 Vite 代理到 8080；生产为完整域名 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/** WebSocket 基址（/ws/chat，连接时自动附加 ?token=） */
export const WS_URL: string =
  import.meta.env.VITE_WS_URL ?? 'ws://127.0.0.1:5173/ws/chat';

/** 全局默认请求超时（毫秒） */
export const API_TIMEOUT_MS: number = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30_000);

// 演示模式下仅提示一次，避免刷屏
if (isDemoMode && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn(
    '%c[健澜科技] 当前为演示模式（VITE_DEMO_MODE=1）：数据来自本地 Mock，不持久化，请勿用于真实业务。',
    'color:#fa8c16;font-weight:bold;',
  );
}
