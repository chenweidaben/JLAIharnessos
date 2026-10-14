/**
 * 健澜科技 jlmedaios - 电子签名留痕路由
 *
 * POST /api/v1/e-sign/log  写入一条签名留痕（操作人取登录态，不信客户端传值）
 * GET  /api/v1/e-sign/log?bizType=&bizId=  查询某业务单据的留痕列表
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { getDb } from '../../db/pool.js';
import { buildSignRecord } from '../signing/eSign';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

interface ESignLogRow {
  id: string;
  bizType: string;
  bizId: string;
  operatorId: string;
  contentHash: string;
  signedAt: string;
  clientIp: string | null;
}

function mapRow(r: Record<string, unknown>): ESignLogRow {
  return {
    id: r.id as string,
    bizType: r.biz_type as string,
    bizId: r.biz_id as string,
    operatorId: r.operator_id as string,
    contentHash: r.content_hash as string,
    signedAt: (r.signed_at as Date | string).toString(),
    clientIp: (r.client_ip as string | null) ?? null,
  };
}

async function insertLog(input: {
  bizType: string;
  bizId: string;
  operatorId: string;
  contentHash: string;
  clientIp: string | null;
}): Promise<ESignLogRow> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.e_sign_log (biz_type, biz_id, operator_id, content_hash, client_ip)
    VALUES (${input.bizType}, ${input.bizId}, ${input.operatorId}, ${input.contentHash}, ${input.clientIp})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

async function listLogs(bizType: string, bizId: string): Promise<ESignLogRow[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM clinical.e_sign_log
    WHERE biz_type = ${bizType} AND biz_id = ${bizId}
    ORDER BY signed_at DESC
  `;
  return rows.map(mapRow);
}

export const eSignRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/e-sign/log',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const body = (await c.body()) as Record<string, unknown>;
      const bizType = typeof body.bizType === 'string' ? body.bizType.trim() : '';
      const bizId = typeof body.bizId === 'string' ? body.bizId.trim() : '';
      const content = typeof body.content === 'string' ? body.content : '';
      if (!bizType || !bizId || !content) {
        return json(fail(ErrorCode.BAD_REQUEST, 'bizType / bizId / content 不能为空'), 400);
      }
      const record = buildSignRecord({ bizType, bizId, operatorId: c.user.id, content });
      if (isDemo) {
        return json(ok({ ...record, id: null, clientIp: c.clientIp }, 'ok(demo)'));
      }
      try {
        const row = await insertLog({ ...record, clientIp: c.clientIp });
        return json(ok(row));
      } catch (e) {
        return json(fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '留痕失败'), 500);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/e-sign/log',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const bizType = c.query.get('bizType') ?? '';
      const bizId = c.query.get('bizId') ?? '';
      if (!bizType || !bizId) {
        return json(fail(ErrorCode.BAD_REQUEST, '需要 bizType 与 bizId 查询参数'), 400);
      }
      if (isDemo) return json(ok([]));
      try {
        return json(ok(await listLogs(bizType, bizId)));
      } catch (e) {
        return json(fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '查询失败'), 500);
      }
    },
  },
];
