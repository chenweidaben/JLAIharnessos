/**
 * 健澜科技 jlmedaios - 家属代办授权范围（纯函数，M3-Q）
 *
 * 无 I/O，确定性：授权范围的规范化与校验。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

/** 授权范围编码（与迁移 71 注释一致）。 */
export const DELEGATION_SCOPES = {
  booking: { code: 'booking', label: '预约挂号/退号', risk: 'low' },
  consultation: { code: 'consultation', label: '在线问诊/查阅病历', risk: 'low' },
  report: { code: 'report', label: '查阅检查检验报告', risk: 'low' },
  medication: { code: 'medication', label: '处方续方/药品配送', risk: 'medium' },
  payment: { code: 'payment', label: '在线支付/退费', risk: 'high' },
} as const;

export type DelegationScopeCode =
  (typeof DELEGATION_SCOPES)[keyof typeof DELEGATION_SCOPES]['code'];

export const VALID_SCOPE_CODES: string[] = Object.values(DELEGATION_SCOPES).map(
  (s) => s.code,
);

const HIGH_RISK_SCOPES: string[] = Object.values(DELEGATION_SCOPES)
  .filter((s) => s.risk === 'high')
  .map((s) => s.code);

/**
 * 规范化授权范围：去重、过滤非法编码，保持稳定顺序。
 * 返回 { scopes, invalid }。
 */
export function normalizeScopes(input: unknown): {
  scopes: string[];
  invalid: string[];
} {
  const raw = Array.isArray(input) ? input : [];
  const validSet = new Set(VALID_SCOPE_CODES);
  const seen = new Set<string>();
  const scopes: string[] = [];
  const invalid: string[] = [];
  for (const item of raw) {
    const code = String(item);
    if (validSet.has(code)) {
      if (!seen.has(code)) {
        seen.add(code);
        scopes.push(code);
      }
    } else {
      invalid.push(code);
    }
  }
  // 按 VALID_SCOPE_CODES 固定顺序输出
  scopes.sort(
    (a, b) => VALID_SCOPE_CODES.indexOf(a) - VALID_SCOPE_CODES.indexOf(b),
  );
  return { scopes, invalid };
}

/** 是否含高风险授权（支付/退费）——需更强认证与二次确认。 */
export function hasHighRiskScope(scopes: string[]): boolean {
  return scopes.some((s) => HIGH_RISK_SCOPES.includes(s));
}

/** 校验：授权范围不能为空（撤销场景除外）。 */
export function assertNonEmpty(scopes: string[]): boolean {
  return scopes.length > 0;
}
