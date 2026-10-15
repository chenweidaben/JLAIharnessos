/**
 * 健澜科技 jlmedaios - M136-A 错误脱敏自检路由（管理端测试工具）
 *
 * GET /api/v1/admin/test/security（仅 admin）
 *
 * 行为约定（生产就绪质量门禁）：
 *  - 不发起任何真实 HTTP / DB 请求；
 *  - 复用 securityBaselineCheck 跑五项基线核查，其中「错误信息不泄露」一项
 *    由 M135-D 的 warn（黄）升级为 pass（绿）——依据是 runErrorMaskingSelfTest()
 *    在生产模式下跑完全部样本均无内部细节泄露；
 *  - 额外返回 errorMasking 自检块：逐样本展示原始错误 → 生产环境客户端实际收到的文案；
 *  - 非 admin 401/403 与既有路由一致（依赖宪法第三章 requireRole）；
 *  - 返回结构与 web/src/pages/admin/test/Security/index.tsx 对齐。
 *
 * 持续优化：后续可把自检样本做成可配置（从 config 注入对抗用例）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  generateSecurityReport,
  securityBaselineCheck,
  type CheckResult,
} from '../aggregators/securityBaselineAggregator';
import { runErrorMaskingSelfTest } from '../aggregators/errorSanitizerAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

/** 被核查目标基地址（从请求推导，仅记录进报告头，不发起出站请求） */
function resolveBaseUrl(c: Ctx): string {
  const url = c.req.url ?? '';
  if (/^https?:\/\//i.test(url)) {
    try {
      return new URL(url).origin;
    } catch {
      /* fallthrough */
    }
  }
  const host = c.req.headers.get('host');
  return host ? `http://${host}` : 'http://localhost';
}

/**
 * 把基线结果中的「错误信息不泄露」项升级为绿色。
 * M136-A 整改后，生产模式下 5xx 统一返回「系统繁忙，请稍后重试」，
 * 401/403/404 保持明确，堆栈 / SQL / 物理路径不下发客户端——自检全绿。
 */
function upgradeErrorDisclosureToPass(results: CheckResult[]): CheckResult[] {
  const selfTest = runErrorMaskingSelfTest();
  return results.map((r) => {
    if (r.id !== 'error-disclosure') return r;
    return {
      ...r,
      status: 'pass',
      detail: selfTest.green
        ? '生产环境 5xx 统一返回「系统繁忙，请稍后重试」；401/403/404 保持明确语义；堆栈/SQL/物理路径仅写服务端日志。'
        : `整改未完全生效：${selfTest.total - selfTest.passed}/${selfTest.total} 样本仍泄露内部细节。`,
      evidence: `M136-A 自检 ${selfTest.passed}/${selfTest.total} 通过：` +
        selfTest.samples
          .map((s) => `[${s.status}] ${s.label} → "${s.prodMessage}"`)
          .join('；'),
      recommendation: '保持现状：新增错误类型必须经 sanitizeErrorForClient 序列化后方可下发。',
    };
  });
}

export const errorSanitizerRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/test/security',
    handle: (c: Ctx) => {
      // 非 admin：未登录 401，非 admin 403（依赖宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const baseUrl = resolveBaseUrl(c);
      const rawResults = securityBaselineCheck(baseUrl);
      const results = upgradeErrorDisclosureToPass(rawResults);
      const report = generateSecurityReport(results, baseUrl, new Date().toISOString());
      const errorMasking = runErrorMaskingSelfTest();

      return json(
        ok({
          ...report,
          errorMasking,
        }),
      );
    },
    auth: true,
  },
];
