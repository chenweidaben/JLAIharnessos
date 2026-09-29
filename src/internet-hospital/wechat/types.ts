/**
 * 健澜科技 jlmedaios - 微信小程序登录提供方契约（M3-J）
 *
 * 小程序 wx.login() 获得临时 code，后端用 code 调用微信
 * jscode2session 换取 openid / unionid / session_key。
 *
 * 提供方可插拔：本地演示（明确标注）/ 真实微信 API。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 微信会话信息 */
export interface WechatSession {
  /** 用户在小程序的唯一标识 */
  openid: string;
  /** 用户在开放平台的唯一标识（绑定开放平台时返回） */
  unionid?: string;
  /** 会话密钥（用于解密前端加密数据，不应下发） */
  sessionKey?: string;
}

/** 微信登录提供方 */
export interface WechatLoginProvider {
  /** 提供方名称 */
  readonly name: string;
  /** 是否本地演示 */
  readonly isDemo: boolean;
  /** 用临时 code 换取微信会话 */
  code2Session(code: string): Promise<WechatSession>;
}
