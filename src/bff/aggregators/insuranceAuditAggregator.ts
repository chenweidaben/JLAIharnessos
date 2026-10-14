/**
 * 健澜科技 jlmedaios - 医保事前智能审核规则引擎（事前审核规则库）
 *
 * 对待结算处方/收费明细跑确定性纯函数规则，输出命中规则列表与整体风险等级：
 *  - 超医保目录（catalog.out_of_catalog）：项目编码不在医保目录 -> high（事前拦截，医保不予支付）；
 *  - 限定支付（payment.limited_indication）：目录内但限定适应症，当前诊断不满足 -> medium（需补证明/自费）；
 *  - 重复收费（billing.duplicate_same_day）：同类别同日超过合理次数 -> low（提醒核对，不拦截）。
 *
 * 医疗定位：本模块为「事前」合规提醒，不直接阻断诊疗；high 仅表示该笔医保不予支付，
 * 最终支付/拒付以医保经办机构清算为准。纯函数、无 I/O、确定性。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 风险等级：low < medium < high；high 视为事前拦截 */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 一条收费明细（药品/检查/检验/治疗/耗材等） */
export interface AuditItem {
  /** 项目/医保编码 */
  itemCode: string;
  /** 项目名称 */
  itemName: string;
  /** 收费类别：药品 / 检查 / 检验 / 治疗 / 耗材 ... */
  category: string;
  /** 开立时间（ISO 时间或日期 YYYY-MM-DD），用于「同日」判断 */
  billedAt: string;
  /** 明细级诊断（可选，缺省取处方级 diagnoses） */
  diagnoses?: string[];
}

/** 待审核处方（纯数据，无 I/O） */
export interface Prescription {
  visitId?: string;
  patientId?: string;
  /** 处方级主诊断（诊断名列表） */
  diagnoses?: string[];
  /** 本次处方收费明细 */
  items: AuditItem[];
}

/** 医保目录条目 */
export interface CatalogEntry {
  /** 限定支付适应症：仅当诊断命中其中之一时方可医保支付；空/缺省=无限定 */
  limitedIndications?: string[];
}

/** 规则库配置（目录 + 重复收费阈值） */
export interface AuditRules {
  /** 医保目录：itemCode -> 目录条目 */
  catalog: Record<string, CatalogEntry>;
  /** 重复收费：同类别同日允许的最大次数，超过即命中；默认 2 */
  duplicateSameDayLimit?: number;
}

/** 一条命中 */
export interface AuditHit {
  /** 规则编码 */
  rule: string;
  level: RiskLevel;
  /** 中文类别：超医保目录 / 限定支付适应症不符 / 重复收费 */
  category: string;
  itemCode: string;
  itemName: string;
  /** 命中说明 */
  detail: string;
  /** 处置建议 */
  suggestion: string;
}

/** 审核结果 */
export interface AuditResult {
  visitId?: string;
  /** 整体风险等级：取命中中最高级；无命中 low */
  riskLevel: RiskLevel;
  hitCount: number;
  /** high 即事前拦截（医保不予支付） */
  blocked: boolean;
  hits: AuditHit[];
}

// ---------------------------------------------------------------------------
// 内置示例规则库
// ---------------------------------------------------------------------------

/**
 * 内置示例目录（仅演示三条规则，生产应由医保局/院内目录下发）。
 *  - Y001：甲类药品，无限定支付；
 *  - Y002：限定支付（抗肿瘤靶向药，限肺腺癌/结直肠癌）；
 *  - Y003：乙类检查，无限定。
 * 目录外编码（如 X999）即触发「超医保目录」。
 */
export const SAMPLE_RULES: AuditRules = {
  catalog: {
    Y001: { limitedIndications: [] },
    Y002: { limitedIndications: ['肺腺癌', '结直肠癌'] },
    Y003: { limitedIndications: [] },
  },
  duplicateSameDayLimit: 2,
};

// ---------------------------------------------------------------------------
// 纯函数规则引擎
// ---------------------------------------------------------------------------

const RISK_RANK: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };

function emptyResult(visitId?: string): AuditResult {
  const r: AuditResult = { riskLevel: 'low', hitCount: 0, blocked: false, hits: [] };
  if (visitId) r.visitId = visitId;
  return r;
}

/** 从 billedAt 提取 YYYY-MM-DD；非法返回 null */
function dayOf(billedAt: string): string | null {
  const day = String(billedAt ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/**
 * 事前审核：对一条处方跑「超目录 / 限定支付 / 重复收费」三条规则。
 * 纯函数、无 I/O；处方或 items 为空/非法安全返回 low 空结果，不抛错。
 */
export function auditPrescription(
  rx: Prescription | null | undefined,
  rules: AuditRules,
): AuditResult {
  if (!rx || !Array.isArray(rx.items)) return emptyResult(rx?.visitId);

  const catalog = rules?.catalog ?? {};
  const dupLimit = rules?.duplicateSameDayLimit ?? 2;
  const rxDiags = Array.isArray(rx.diagnoses) ? rx.diagnoses.filter((d) => typeof d === 'string') : [];
  const items = rx.items.filter(
    (it) => it && typeof it.itemCode === 'string' && it.itemCode.trim().length > 0,
  );
  if (items.length === 0) return emptyResult(rx.visitId);

  const result = emptyResult(rx.visitId);

  // 规则 1/2：逐项目
  for (const it of items) {
    const entry = catalog[it.itemCode];

    // 规则 1：超医保目录 -> high
    if (!entry) {
      result.hits.push({
        rule: 'catalog.out_of_catalog',
        level: 'high',
        category: '超医保目录',
        itemCode: it.itemCode,
        itemName: it.itemName,
        detail: `项目「${it.itemName}」(${it.itemCode}) 不在医保目录内`,
        suggestion: '该项目医保不予支付，请核对编码或改为自费项目',
      });
      continue;
    }

    // 规则 2：限定支付（适应症不符）-> medium
    const limited = Array.isArray(entry.limitedIndications) ? entry.limitedIndications : [];
    if (limited.length > 0) {
      const itemDiags = Array.isArray(it.diagnoses)
        ? it.diagnoses.filter((d) => typeof d === 'string')
        : [];
      const diags = [...rxDiags, ...itemDiags];
      const matched = limited.some((ind) => diags.some((d) => d.includes(ind)));
      if (!matched) {
        result.hits.push({
          rule: 'payment.limited_indication',
          level: 'medium',
          category: '限定支付适应症不符',
          itemCode: it.itemCode,
          itemName: it.itemName,
          detail: `项目「${it.itemName}」仅限${limited.join('、')}等适应症医保支付，当前诊断不符`,
          suggestion: '请补充符合限定支付的诊断证明，否则按自费结算',
        });
      }
    }
  }

  // 规则 3：同类别同日多次收费 -> low
  const groups = new Map<string, { category: string; day: string; count: number }>();
  for (const it of items) {
    const day = dayOf(it.billedAt);
    if (!day) continue;
    const key = `${it.category}@${day}`;
    const g = groups.get(key) ?? { category: it.category, day, count: 0 };
    g.count += 1;
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    if (g.count > dupLimit) {
      result.hits.push({
        rule: 'billing.duplicate_same_day',
        level: 'low',
        category: '重复收费',
        itemCode: '',
        itemName: `${g.category}类`,
        detail: `同日（${g.day}）${g.category}类项目共 ${g.count} 次，超过当日 ${dupLimit} 次合理上限`,
        suggestion: '请核对是否存在重复计费或分解收费，剔除多余条目',
      });
    }
  }

  // 汇总风险等级
  let top: RiskLevel = 'low';
  for (const h of result.hits) {
    if (RISK_RANK[h.level] > RISK_RANK[top]) top = h.level;
  }
  result.riskLevel = top;
  result.hitCount = result.hits.length;
  result.blocked = top === 'high';
  return result;
}
