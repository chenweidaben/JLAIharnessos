/**
 * 健澜科技 jlmedaios - 电子签名留痕（纯函数）
 *
 * 内容哈希 + 记录组装，不触碰数据库、不依赖运行时状态，便于单测。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { createHash } from 'node:crypto';

/** 计算内容的 SHA-256 摘要（小写 hex）。同输入永远同输出。 */
export function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export interface SignRecordInput {
  /** 业务类型：note / order / prescription ... */
  bizType: string;
  /** 业务单据 id（uuid） */
  bizId: string;
  /** 操作人 id（uuid） */
  operatorId: string;
  /** 被签署的原始内容（仅用于计算摘要，不落库） */
  content: string;
}

/** 完整留痕对象（对应 clinical.e_sign_log 的可写入字段）。 */
export interface SignRecord {
  bizType: string;
  bizId: string;
  operatorId: string;
  contentHash: string;
  signedAt: string;
}

/**
 * 组装一条签名留痕：对内容求 SHA-256，附时间戳。
 * @param now 可注入时钟，便于测试；默认取当前时间。
 */
export function buildSignRecord(input: SignRecordInput, now: Date = new Date()): SignRecord {
  const { bizType, bizId, operatorId, content } = input;
  return {
    bizType,
    bizId,
    operatorId,
    contentHash: sha256Hex(content),
    signedAt: now.toISOString(),
  };
}
