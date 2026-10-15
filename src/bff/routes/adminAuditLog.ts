/**
 * 健澜科技 jlmedaios - M123-A 数据访问审计日志路由
 *
 * 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）与国家数据安全
 * 要求：医务人员对患者敏感数据的每一次访问都必须留痕可溯。
 *
 *  - GET /api/v1/admin/audit/logs   数据访问审计查询（仅 admin 角色）
 *      取近期窗口 -> 纯函数 queryAuditLogs 按条件过滤 -> maskDataAccessLog 出参脱敏。
 *
 * 生产安全加固：
 *  - requireRole(c, 'admin')：未登录 401、非管理员 403，审计日志不对普通角色开放；
 *  - 出参经 maskDataAccessLog 脱敏，患者号中段、IP 末段不回传明文；
 *  - 只查近期窗口（RECENT_LIMIT 条）并倒序返回，避免全表扫描拖垮看板。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  maskDataAccessLog,
  queryAuditLogs,
  type DataAccessLog,
  type DataAccessLogFilter,
} from '../aggregators/auditLogAggregator';

/** 近期窗口：默认只取最近 500 条，纯函数层在此窗口内再做条件过滤 */
const RECENT_LIMIT = 500;

/**
 * GET /api/v1/admin/audit/logs
 * query：staffId / staffRole / action / resourceType / patientId / startTime / endTime
 */
async function handleList(c: Ctx): Promise<Response> {
  // 生产安全加固：仅 admin 可查审计日志；其余一律 403
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const filters: DataAccessLogFilter = {
    staffId: c.query.get('staffId') ?? undefined,
    staffRole: c.query.get('staffRole') ?? undefined,
    action: c.query.get('action') ?? undefined,
    resourceType: c.query.get('resourceType') ?? undefined,
    patientId: c.query.get('patientId') ?? undefined,
    startTime: c.query.get('startTime') ?? undefined,
    endTime: c.query.get('endTime') ?? undefined,
  };

  try {
    const db = getDb();
    // 配合 idx_data_access_log_accessed：近期窗口倒序拉取
    const rows = await db`
      SELECT
        id             AS "id",
        staff_id       AS "staffId",
        staff_role     AS "staffRole",
        action         AS "action",
        resource_type  AS "resourceType",
        resource_id    AS "resourceId",
        patient_id     AS "patientId",
        accessed_at    AS "accessedAt",
        ip_address     AS "ipAddress"
      FROM medmuse.data_access_log
      ORDER BY accessed_at DESC
      LIMIT ${RECENT_LIMIT}
    `;

    const logs = (rows as unknown as Array<Omit<DataAccessLog, 'accessedAt'> & { accessedAt: unknown }>).map(
      (r) => ({
        id: Number(r.id),
        staffId: r.staffId ?? '',
        staffRole: r.staffRole ?? '',
        action: r.action ?? '',
        resourceType: r.resourceType ?? '',
        resourceId: r.resourceId ?? '',
        patientId: r.patientId ?? '',
        // pg 返回时间戳为 Date 对象，统一归一为 ISO 字符串，保证纯函数比较一致
        accessedAt:
          r.accessedAt instanceof Date ? r.accessedAt.toISOString() : String(r.accessedAt ?? ''),
        ipAddress: r.ipAddress ?? '',
      }),
    );

    // 纯函数过滤（单测覆盖），窗口内再按条件收敛
    const filtered = queryAuditLogs(filters, logs);
    // 生产安全加固：出参脱敏后再返回
    return json(ok({ total: filtered.length, items: filtered.map(maskDataAccessLog) }));
  } catch (err) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '审计日志查询失败'),
      500,
    );
  }
}

export const adminAuditLogRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/audit/logs',
    auth: true,
    handle: handleList,
  },
];
