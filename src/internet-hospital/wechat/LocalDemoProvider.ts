/**
 * 健澜科技 jlmedaios - 本地演示微信登录提供方（M3-J）
 *
 * 不连接微信服务器，直接以 code 派生确定性 openid，
 * 明确标注 isDemo，仅限本地开发/演示。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type WechatLoginProvider, type WechatSession } from './types';

export class LocalDemoWechatLoginProvider implements WechatLoginProvider {
  readonly name = 'local-demo';
  readonly isDemo = true;

  async code2Session(code: string): Promise<WechatSession> {
    if (!code?.trim()) throw new Error('微信登录 code 不能为空（本地演示）');
    // 本地演示：以 demo- 前缀 + code 派生确定性 openid，避免与真实 openid 混淆
    return {
      openid: `demo-openid-${code.trim()}`,
      unionid: `demo-unionid-${code.trim()}`,
    };
  }
}
