/**
 * 健澜科技 jlmedaios - 实名认证提供方工厂（M3-J）
 *
 * 按环境变量选择提供方：
 *  - 配置 REALNAME_PROVIDER_URL + REALNAME_API_KEY：第三方持证提供方；
 *  - 未配置：本地演示提供方（明确警告，仅限开发/演示）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { LocalDemoRealnameProvider } from './LocalDemoProvider';
import { ThirdPartyRealnameProvider } from './ThirdPartyProvider';
import { type RealnameProvider } from './types';

let _provider: RealnameProvider | null = null;

/** 创建实名认证提供方（不缓存，测试用） */
export function createRealnameProvider(): RealnameProvider {
  const url = process.env.REALNAME_PROVIDER_URL;
  const apiKey = process.env.REALNAME_API_KEY;
  if (url && apiKey) {
    return new ThirdPartyRealnameProvider({
      url,
      apiKey,
      timeoutMs: Number(process.env.REALNAME_TIMEOUT_MS ?? 10_000),
      name: process.env.REALNAME_PROVIDER_NAME ?? 'third-party',
    });
  }
  console.warn(
    '[internet-hospital] 未配置 REALNAME_PROVIDER_URL/REALNAME_API_KEY，' +
      '使用本地演示实名认证（仅用于开发/演示，不具备真实法律效力）',
  );
  return new LocalDemoRealnameProvider();
}

/** 获取实名认证提供方（单例） */
export function getRealnameProvider(): RealnameProvider {
  if (!_provider) _provider = createRealnameProvider();
  return _provider;
}

/** 重置单例（测试用） */
export function _resetRealnameProvider(): void {
  _provider = null;
}
