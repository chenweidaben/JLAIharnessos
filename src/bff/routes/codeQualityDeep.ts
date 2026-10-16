/**
 * 健澜科技 jlmedaios - 深度代码质量 BFF 路由（M173-B · 质量提升与新场景）
 *
 * GET /api/v1/admin/code/deep-quality
 *  - auth: true + requirePermissionCode('system:code:quality:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回深度扫描（deepCodeQualityScan）+ 重构建议（refactorComplexFunctions）
 *    + 跨文件重复检测（detectDuplicateCode），全部由纯函数产出；
 *  - 当前内置一段「演示用样例代码库」（不含任何真实业务 PII），后续可平滑
 *    替换为扫描真实工作区源码文本，函数签名不变。
 *
 * 生产安全加固：
 *  - 仅 GET，无状态变更副作用；不读盘、不写 SQL、无新表；
 *  - 采集失败返回 500 结构化错误信封，不返回 HTML 错误页。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  deepCodeQualityScan,
  detectDuplicateCode,
  refactorComplexFunctions,
} from '../aggregators/codeQualityDeepAggregator';

/**
 * 演示样例代码库：故意埋入各类可被纯函数真实识别的问题——
 * 超圈复杂度函数、snake_case 命名、缺 JSDoc 的导出、未使用变量、重复块。
 * 仅用于 admin 面板演示纯函数能力，不代表真实源码，不含 PII。
 */
const SAMPLE_A = `
/**
 * 计算患者风险等级（带 JSDoc 的合规导出函数）
 */
export function calcRisk(score: number): string {
  if (score > 90) return 'high';
  if (score > 70) return 'medium';
  return 'low';
}

function dispatchOrder(order_type: string): void {
  let unused_local = 1;
  if (order_type === 'a') { handleA(); }
  else if (order_type === 'b') { handleB(); }
  else if (order_type === 'c') { handleC(); }
  else if (order_type === 'd') { handleD(); }
  else if (order_type === 'e') { handleE(); }
  else if (order_type === 'f') { handleF(); }
  else if (order_type === 'g') { handleG(); }
  else if (order_type === 'h') { handleH(); }
  else if (order_type === 'i') { handleI(); }
  else if (order_type === 'j') { handleJ(); }
  else { handleDefault(); }
}

export function helperWithoutDoc(): number {
  return 1;
}

class bad_style_helper {
  run(): void { /* noop */ }
}
`;

const SAMPLE_B = `
function dispatchOrder(order_type: string): void {
  if (order_type === 'a') { handleA(); }
  else if (order_type === 'b') { handleB(); }
  else if (order_type === 'c') { handleC(); }
  else if (order_type === 'd') { handleD(); }
  else if (order_type === 'e') { handleE(); }
  else if (order_type === 'f') { handleF(); }
  else if (order_type === 'g') { handleG(); }
  else { handleDefault(); }
}
`;

/**
 * GET /api/v1/admin/code/deep-quality
 * 深度代码质量（管理驾驶舱，仅 admin）。
 */
async function handleDeepQuality(c: Ctx): Promise<Response> {
  // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
  const denied = requirePermissionCode(c, 'system:code:quality:view');
  if (denied) return denied;

  try {
    const codebase = [
      { file: 'services/orderRouter.ts', code: SAMPLE_A },
      { file: 'services/orderRouterDuplicate.ts', code: SAMPLE_B },
    ];
    const scan = deepCodeQualityScan(SAMPLE_A, 'services/orderRouter.ts');
    const refactor = refactorComplexFunctions(SAMPLE_A);
    const duplicates = detectDuplicateCode(codebase);
    return json(ok({ scan, refactor, duplicates }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '深度代码质量扫描失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const codeQualityDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/code/deep-quality',
    auth: true,
    handle: handleDeepQuality,
  },
];
