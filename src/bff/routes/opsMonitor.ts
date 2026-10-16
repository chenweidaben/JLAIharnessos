/**
 * 健澜科技 jlmedaios - M168-D 系统运维智能化（智能运维）BFF 路由
 *
 * 【AI深化与智能运营】
 *
 * GET /api/v1/admin/ops/monitoring
 *  - auth: true + requirePermissionCode('system:ops:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回：智能监控快照（buildIntelligentMonitoring）+
 *    异常检测结果（detectAnomaly）+
 *    智能告警（generateOpsAlert）+
 *    自动修复建议（autoRemediate）四组数据；
 *  - 纯函数聚合，无数据库副作用，不暴露 SQL 文本与 PII。
 *
 * 生产安全加固：
 *  - 只读聚合结果，修复建议为「建议 + 预期收益 + 回滚预案」，不直接执行变更高风险操作；
 *  - 仅 GET，无任何状态变更副作用；
 *  - 异常时返回 500 结构化错误信封，不返回 HTML 错误页。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  autoRemediate,
  buildIntelligentMonitoring,
  buildOpsHistoryBaseline,
  detectAnomaly,
  generateOpsAlert,
} from '../aggregators/opsMonitorAggregator';

/** 路由聚合返回体 */
export interface OpsMonitorView {
  monitoring: ReturnType<typeof buildIntelligentMonitoring>;
  anomalies: ReturnType<typeof detectAnomaly>;
  alerts: Array<ReturnType<typeof generateOpsAlert>>;
  remediations: Array<ReturnType<typeof autoRemediate>>;
}

export const opsMonitorRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/ops/monitoring',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:ops:view');
      if (denied) return denied;
      try {
        const monitoring = buildIntelligentMonitoring();
        const history = buildOpsHistoryBaseline();
        const anomalies = detectAnomaly(monitoring, history);
        const view: OpsMonitorView = {
          monitoring,
          anomalies,
          alerts: anomalies.map(generateOpsAlert),
          remediations: anomalies.map(autoRemediate),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '智能运维数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
