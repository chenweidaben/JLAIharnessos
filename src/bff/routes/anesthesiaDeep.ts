/**
 * 健澜科技 jlmedaios - M176-C 医院手术麻醉管理深化路由
 *
 *   GET /api/v1/surgery/anesthesia/deep
 *     一次性返回深度麻醉管理看板所需的全部派生数据：
 *       preop    = 术前评估汇总（ASA 分布 / 风险分层 / 高危手术清单）
 *       intraop  = 术中监测跟踪（体征极值 / 告警计数 / 出血占比）
 *       postop   = 术后恢复（PACU 时长 / 疼痛评分 / 延迟恢复）
 *       quality  = 麻醉质量（并发症率 / 死亡率 / 非计划二次插管率 / 优良率）
 *
 * 鉴权与安全：
 *   - 仅 admin 角色可读（requireRole 内部已处理 401/403）；
 *   - 只读 + 纯函数聚合，无写副作用、不写 SQL、不碰 WebSocket；
 *   - 患者仅 P-xxxx 脱敏标识，不含 PII。
 *
 * 【远期】WebSocket 麻醉机/监护仪实时推流、历史病例自学习校准阈值。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import {
  buildDeepAnesthesiaMgmt,
} from '../aggregators/anesthesiaDeepAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/**
 * GET /api/v1/surgery/anesthesia/deep
 */
async function handleDeep(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const mgmt = buildDeepAnesthesiaMgmt();
    return json(ok(mgmt));
  } catch (err) {
    const message = err instanceof Error ? err.message : '深度麻醉管理聚合失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const anesthesiaDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/surgery/anesthesia/deep',
    auth: true,
    handle: handleDeep,
  },
];
