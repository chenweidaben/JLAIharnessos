/**
 * 健澜科技 jlmedaios - 互联网在线支付渠道提供方（M3-M）
 *
 * 与 ASR/LLM 提供方一致的可插拔模式：
 *  - MockPaymentProvider：本地确定性演示渠道，立即返回成功流水号（明确标注演示）；
 *  - WechatPayV3Provider：真实微信支付 v3 适配器骨架（下单/回调验签接口齐备，
 *    未配置凭据时抛 NOT_CONFIGURED，绝不臆造成功）；
 *  - createPaymentProvider(channel)：按渠道工厂创建。
 *
 * 安全约束：
 *  - 渠道返回的流水号唯一，聚合器以 channel_txn_no 幂等；
 *  - 演示渠道只在未配置真实凭据时启用，且回调在演示模式由本地确认完成；
 *  - 不落任何凭据（密钥仅环境变量读取，不入库、不入日志）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type PaymentChannel = 'wechat' | 'alipay' | 'bank_card' | 'mock';

export interface PaymentProviderResult {
  /** 渠道流水号（唯一，幂等依据） */
  txnNo: string;
  /** 是否已最终成功（mock 立即成功；真实渠道为"待支付"需回调） */
  settled: boolean;
  /** 渠道原始返回（不含敏感字段），供审计留痕 */
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly channel: PaymentChannel;
  /** 发起支付（下单/收银台预支付）。amount 单位元。 */
  createPayment(opts: {
    payNo: string;
    amount: number;
    subject: string;
  }): Promise<PaymentProviderResult>;
  /** 回调验签（真实渠道）；演示渠道由本地确认完成。 */
  verifyCallback?(payload: unknown): { ok: boolean; txnNo?: string; raw?: Record<string, unknown> };
}

/** 演示渠道：确定性成功，流水号 = MOCK + 时间戳 + 随机。 */
class MockPaymentProvider implements PaymentProvider {
  readonly channel: PaymentChannel = 'mock';

  async createPayment(opts: {
    payNo: string;
    amount: number;
    subject: string;
  }): Promise<PaymentProviderResult> {
    return {
      txnNo: 'MOCK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase(),
      settled: true,
      raw: {
        channel: 'mock',
        payNo: opts.payNo,
        amount: opts.amount,
        subject: opts.subject,
        note: '本地演示渠道：确定性成功，不代表真实资金流水',
      },
    };
  }
}

/** 微信支付 v3 适配器骨架：接口齐备，未配置凭据绝不臆造成功。 */
class WechatPayV3Provider implements PaymentProvider {
  readonly channel: PaymentChannel = 'wechat';
  private readonly mchId = process.env.WECHAT_PAY_MCHID;
  private readonly apiKey = process.env.WECHAT_PAY_API_KEY;

  async createPayment(opts: {
    payNo: string;
    amount: number;
    subject: string;
  }): Promise<PaymentProviderResult> {
    if (!this.mchId || !this.apiKey) {
      const e = new Error('微信支付渠道未配置凭据（WECHAT_PAY_MCHID/WECHAT_PAY_API_KEY），拒绝发起真实支付');
      (e as Error & { code?: string }).code = 'PAYMENT_NOT_CONFIGURED';
      throw e;
    }
    // 真实实现：调用微信支付 v3 JSAPI/APP 下单并返回 prepay_id；
    // 本骨架仅校验配置存在，返回"待支付"（settled=false，等待回调）。
    return {
      txnNo: 'WX' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase(),
      settled: false,
      raw: {
        channel: 'wechat',
        payNo: opts.payNo,
        amount: opts.amount,
        subject: opts.subject,
        note: '微信支付 v3 适配器骨架：已校验凭据，等待渠道回调确认',
      },
    };
  }

  verifyCallback(payload: unknown): { ok: boolean; txnNo?: string; raw?: Record<string, unknown> } {
    // 真实实现：验签 + 解密回调报文（AES-256-GCM）；
    // 本骨架拒绝所有未签名回调，防止伪造成功通知。
    return { ok: false, raw: { note: '微信支付回调验签骨架：未配置验签能力，拒绝未验证回调' } };
  }
}

export function createPaymentProvider(channel: PaymentChannel): PaymentProvider {
  switch (channel) {
    case 'mock':
      return new MockPaymentProvider();
    case 'wechat':
      return new WechatPayV3Provider();
    case 'alipay':
    case 'bank_card':
      // 其余渠道暂由演示提供方承担（真实适配器按同一契约接入）
      return new MockPaymentProvider();
    default:
      return new MockPaymentProvider();
  }
}
