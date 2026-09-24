/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 运行时环境变量统一读取
 */
export const env = {
  appTitle: import.meta.env.VITE_APP_TITLE ?? '健澜科技数智医院智能体',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'ws://127.0.0.1:5173/ws/chat',
  appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
  // 演示模式：VITE_DEMO_MODE=1 或兼容旧开关 VITE_MOCK_ENABLED=true 均视为开启。
  // 默认（0 / 未设置）= 真实模式，直连 BFF，不返回假数据。
  mockEnabled:
    import.meta.env.VITE_DEMO_MODE === '1' || import.meta.env.VITE_MOCK_ENABLED === 'true',
};
