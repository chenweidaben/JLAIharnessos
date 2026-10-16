/**
 * 健澜科技 jlmedaios - M167-C 信息泄露修复与日志安全 BFF 路由
 *
 * GET /api/v1/admin/security/log-verify
 *  - auth: true + requirePermissionCode('system:security:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅安全负责人 / admin 可读）；
 *  - 返回：verifyNoPIIInLog() 日志 PII 验证报告——逐行真检身份证号 / 手机号 / 银行卡号，
 *    发现项证据与行预览均已脱敏（接口本身不回显原始 PII），并附「脱敏前 → 脱敏后」修复对照；
 *  - 【安全修复与质量提升】纯函数即调即算，不连数据库、不写 SQL、不新增表。
 *
 * 生产安全加固：
 *  - 只读聚合结果，报告不含任何原始 PII；
 *  - 采集失败返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何写副作用，不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import { verifyNoPIIInLog, type LogVerifyReport } from '../aggregators/logSecurityAggregator';

/** 路由聚合返回体 */
export interface LogSecurityView {
  /** 日志 PII 验证报告（发现项证据已脱敏） */
  report: LogVerifyReport;
  /** 报告生成时间戳（epoch ms） */
  generatedAt: number;
}

export const logSecurityRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/security/log-verify',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:security:view');
      if (denied) return denied;
      try {
        // 【M167-C】纯函数即调即算：基线日志样本真检一次出报告
        const view: LogSecurityView = {
          report: verifyNoPIIInLog(),
          generatedAt: Date.now(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '日志安全验证数据生成失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
