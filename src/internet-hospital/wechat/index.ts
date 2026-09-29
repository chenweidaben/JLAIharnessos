/**
 * 健澜科技 jlmedaios - 微信登录提供方工厂（M3-J）
 *
 * 配置 WECHAT_APPID + WECHAT_SECRET：真实微信 API；
 * 未配置：本地演示（明确警告）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { LocalDemoWechatLoginProvider } from './LocalDemoProvider';
import { RealWechatLoginProvider } from './RealProvider';
import { type WechatLoginProvider } from './types';

let _provider: WechatLoginProvider | null = null;

export function createWechatLoginProvider(): WechatLoginProvider {
  const appId = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_SECRET;
  if (appId && secret) return new RealWechatLoginProvider(appId, secret);
  console.warn(
    '[internet-hospital] 未配置 WECHAT_APPID/WECHAT_SECRET，' +
      '使用本地演示微信登录（仅用于开发/演示）',
  );
  return new LocalDemoWechatLoginProvider();
}

export function getWechatLoginProvider(): WechatLoginProvider {
  if (!_provider) _provider = createWechatLoginProvider();
  return _provider;
}

export function _resetWechatLoginProvider(): void {
  _provider = null;
}
