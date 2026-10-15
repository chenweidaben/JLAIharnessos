/**
 * 健澜科技 jlmedaios - M151-B UI 无障碍对比度修复验证 BFF 路由
 *
 * GET /api/v1/admin/ui/accessibility/verify
 *  - auth: true + requirePermissionCode('system:ui:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin / 体验负责人可读）；
 *  - 返回：修复色板（fixContrastIssues()）+ 合规复验（verifyContrastCompliance()），
 *    两份结果均来自本模块纯函数的确定性运算，不连数据库、不读 DOM；
 *  - 【质量补齐与新场景】针对 M150-D 暴露的两处对比度违规（#4A90D9 / #8C8C8C）
 *    给出「旧色→新色」修复映射与 WCAG AA 复验结论。
 *
 * 生产安全加固：
 *  - 只读聚合结果，不含任何 PII；
 *  - 采集失败返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何写副作用，不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  fixContrastIssues,
  verifyContrastCompliance,
  type ComplianceResult,
  type FixedPalette,
} from '../aggregators/accessibilityFixAggregator';

/** 路由聚合返回体 */
export interface AccessibilityVerifyView {
  /** 修复后的 VI 色板（旧色→新色 + 前后对比度） */
  palette: FixedPalette;
  /** 修复后色板的 WCAG AA 合规复验结果 */
  compliance: ComplianceResult;
  /** 报告生成时间戳（epoch ms） */
  generatedAt: number;
}

export const accessibilityVerifyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/ui/accessibility/verify',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:ui:view');
      if (denied) return denied;
      try {
        // 【M151-B】纯函数即调即算：修复映射 + 合规复验一次出报告
        const view: AccessibilityVerifyView = {
          palette: fixContrastIssues(),
          compliance: verifyContrastCompliance(),
          generatedAt: Date.now(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '无障碍对比度修复验证数据生成失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
