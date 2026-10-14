/**
 * 健澜科技 jlmedaios - 电子签名留痕写库（业务主流程挂载点共用）
 *
 * 与纯函数模块 ../signing/eSign.ts 配合：buildSignRecord 负责摘要组装，
 * 本模块负责把记录写入 clinical.e_sign_log。
 *
 * 挂载约定：
 *  - 必须在业务主流程「写库成功（事务已提交）之后」调用，绝不并入临床事务，
 *    避免留痕写入失败回滚主业务；
 *  - 调用方一律 try/catch，失败仅 console.warn，不阻断主流程；
 *  - 本函数自身不吞异常，便于调用方统一降级。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { getDb } from '../../db/pool.js';
import { buildSignRecord } from './eSign.js';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

export interface ESignLogInput {
  /** 业务类型：note / order_audit / prescription_audit */
  bizType: string;
  /** 业务单据 id（uuid） */
  bizId: string;
  /** 操作人 id（uuid），取登录态，不信客户端 */
  operatorId: string;
  /** 被签署的原始内容（仅用于计算摘要，不落库） */
  content: string;
  /** 可选来源 IP，仅审计用 */
  clientIp?: string | null;
}

/**
 * 组装并写入一条签名留痕。
 * DEMO_MODE 下不落库（与 routes/eSign.ts 行为一致）；
 * 真实库写入失败时向上抛出，由调用方 try/catch 降级为 console.warn。
 */
export async function writeESignLog(input: ESignLogInput): Promise<void> {
  if (!input.bizType || !input.bizId || !input.operatorId) return;
  if (isDemo) return;
  const record = buildSignRecord({
    bizType: input.bizType,
    bizId: input.bizId,
    operatorId: input.operatorId,
    content: input.content ?? '',
  });
  const db = getDb();
  await db`
    INSERT INTO clinical.e_sign_log (biz_type, biz_id, operator_id, content_hash, client_ip)
    VALUES (${record.bizType}, ${record.bizId}, ${record.operatorId}, ${record.contentHash}, ${input.clientIp ?? null})
  `;
}
