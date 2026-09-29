/**
 * 健澜科技 jlmedaios - 真实微信登录提供方（M3-J）
 *
 * 调用微信 jscode2session 换取 openid/unionid/session_key：
 *  GET https://api.weixin.qq.com/sns/jscode2session
 * 凭证（WECHAT_APPID/WECHAT_SECRET）由环境变量注入，禁止硬编码；
 * 未配置或连不上时明确报错，不冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type WechatLoginProvider, type WechatSession } from './types';

export class RealWechatLoginProvider implements WechatLoginProvider {
  readonly name = 'wechat';
  readonly isDemo = false;
  private readonly appId: string;
  private readonly secret: string;

  constructor(appId: string, secret: string) {
    this.appId = appId;
    this.secret = secret;
  }

  async code2Session(code: string): Promise<WechatSession> {
    const url =
      'https://api.weixin.qq.com/sns/jscode2session' +
      `?appid=${encodeURIComponent(this.appId)}` +
      `&secret=${encodeURIComponent(this.secret)}` +
      `&js_code=${encodeURIComponent(code)}` +
      '&grant_type=authorization_code';
    const resp = await fetch(url);
    const data = (await resp.json()) as {
      openid?: string;
      unionid?: string;
      session_key?: string;
      errcode?: number;
      errmsg?: string;
    };
    if (data.errcode) {
      throw new Error(`微信 jscode2session 失败: ${data.errcode} ${data.errmsg ?? ''}`);
    }
    if (!data.openid) throw new Error('微信 jscode2session 未返回 openid');
    return {
      openid: data.openid,
      unionid: data.unionid,
      sessionKey: data.session_key,
    };
  }
}
