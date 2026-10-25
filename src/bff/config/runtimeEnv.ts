/**
 * 统一运行环境判定（生产 fail-closed 共用）。
 *
 * 背景：JWT 密钥、字段加密密钥、数据库连接串、演示模式短路等安全判定此前分散在
 * 各中间件内重复实现，口径容易漂移。本模块集中提供：
 *  - isProductionEnv()：是否生产环境（NODE_ENV=production）；
 *  - isDemoModeEnabled()：是否开启演示模式（DEMO_MODE=1/true）；
 *  - assertProductionNotDemoMode()：生产环境禁止演示模式，启动即拒绝。
 *
 * 演示模式（演示账号短路、跳过 jti 会话校验、跳过审计落库、不连 PostgreSQL）
 * 仅允许本地开发与测试环境；生产环境误配 DEMO_MODE=1 必须 fail-closed。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 是否生产环境（NODE_ENV 缺省按 development 处理）。 */
export function isProductionEnv(): boolean {
  return (process.env.NODE_ENV ?? 'development') === 'production';
}

/** 是否开启演示模式（接受 '1' / 'true'，大小写不敏感由调用侧约定，此处与既有口径保持一致）。 */
export function isDemoModeEnabled(): boolean {
  const v = process.env.DEMO_MODE;
  return v === '1' || v === 'true';
}

/**
 * 生产环境禁止开启演示模式：启动路径调用本函数，命中即抛错退出，
 * 不绑定端口、不进入请求循环，避免 demo admin 短路与会话/审计旁路生效。
 */
export function assertProductionNotDemoMode(): void {
  if (isProductionEnv() && isDemoModeEnabled()) {
    throw new Error(
      '[security] 生产环境禁止开启 DEMO_MODE：演示模式（演示账号 / 跳过会话校验 / 跳过审计落库）仅允许本地开发与测试环境使用',
    );
  }
}
