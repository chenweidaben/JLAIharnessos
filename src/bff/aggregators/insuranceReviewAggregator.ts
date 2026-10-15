/**
 * 健澜科技 jlmedaios - 医保结算智能审核（事后结算 · 建议级）
 *
 * 【核心业务深化】对一张已生成的医保结算单（收费明细 + 患者信息）跑确定性纯函数审核，
 * 输出「费用测算 + 问题项建议」。与事前处方审核（insuranceAuditAggregator，high 即拦截）
 * 不同，本模块面向结算后复盘：**所有结论均为「建议」，不阻断结算、不直接拒付**，
 * 最终是否调整由医保办人工确认（needManualConfirm 恒为 true）。
 *
 * 审核维度（五条规则）：
 *  1. 甲/乙/丙类药品分类核对（drug.class_missing / drug.yi_ratio_missing）；
 *  2. 医保目录匹配（drug.bing_in_catalog：丙类却计入目录内，与政策矛盾）；
 *  3. 自费项目占比（selfpay.ratio_high：自费占比超过警戒线提示核查）；
 *  4. 重复收费（billing.duplicate：同项目同日多条）；
 *  5. 超标准收费（billing.over_standard：单价超过医保最高限价，超额建议剔除/自费）。
 *
 * 费用测算口径（确定性、无 I/O）：
 *  - 总金额 totalAmount = Σ 单价 × 数量；
 *  - 统筹纳入基数 insuranceBase：甲类 100%、乙类 (1−先自付比例)、丙类/目录外 0%，
 *    且受医保最高限价封顶；
 *  - 自费金额 selfPayAmount = 总金额 − 统筹纳入基数；
 *  - 自付比例 selfPayRatio = 自费金额 / 总金额。
 *
 * 医疗定位：本模块为结算合规辅助，不替代医保经办机构清算；纯函数、无 I/O、确定性。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 建议严重度：low < medium < high；本模块不做拦截，仅用于排序与标红 */
export type Severity = 'low' | 'medium' | 'high';

/** 药品医保分类：甲类全额纳入、乙类先自付一部分、丙类全自费 */
export type DrugClass = '甲类' | '乙类' | '丙类';

/** 一条结算收费明细（药品 / 检查 / 检验 / 治疗 / 耗材等） */
export interface SettlementItem {
  /** 项目 / 医保编码 */
  itemCode: string;
  /** 项目名称 */
  itemName: string;
  /** 收费类别：药品 / 检查 / 检验 / 治疗 / 耗材 ... */
  category: string;
  /** 药品类的医保分类（甲/乙/丙）；非药品可缺省 */
  drugClass?: DrugClass;
  /** 单价（元） */
  unitPrice: number;
  /** 数量 */
  quantity: number;
  /** 收费时间（ISO 或 YYYY-MM-DD），用于「同日」重复判断 */
  billedAt: string;
  /** 是否在医保目录内 */
  inCatalog: boolean;
  /** 医保最高限价（元）；缺省则不做超标准判断 */
  standardPrice?: number;
  /** 乙类先自付比例（0~1，如 0.1 表示先自付 10%）；缺省按默认 10% */
  selfPayRatio?: number;
}

/** 患者信息（纯数据；姓名等 PII 由调用方脱敏，本函数不落库） */
export interface PatientInfo {
  patientId?: string;
  /** 参保类型：职工 / 居民 ... */
  insuranceType?: string;
  /** 诊断列表（预留，供后续限定支付规则扩展） */
  diagnoses?: string[];
}

/** 一条审核问题（建议项） */
export interface ReviewIssue {
  /** 规则编码 */
  rule: string;
  severity: Severity;
  /** 检查维度中文名：甲乙丙分类 / 目录匹配 / 自费占比 / 重复收费 / 超标准收费 */
  dimension: string;
  itemCode: string;
  itemName: string;
  /** 问题说明 */
  detail: string;
  /** 建议调整（人工确认后执行） */
  suggestion: string;
  /** 建议核减金额（元）；无可核减项缺省 */
  suggestedDeduct?: number;
}

/** 审核结果（建议级，需人工确认） */
export interface ReviewResult {
  settlementId?: string;
  /** 总金额（元） */
  totalAmount: number;
  /** 统筹纳入基数（元） */
  insuranceBase: number;
  /** 自费金额（元） */
  selfPayAmount: number;
  /** 自费占比（0~1） */
  selfPayRatio: number;
  issueCount: number;
  /** 最高严重度；无问题为 none */
  maxSeverity: Severity | 'none';
  /** 【核心业务深化】审核结果恒为建议，必须经医保办人工确认后方可调整 */
  needManualConfirm: true;
  issues: ReviewIssue[];
  /** 一句话结论 */
  summary: string;
}

// ---------------------------------------------------------------------------
// 常量与工具
// ---------------------------------------------------------------------------

/** 乙类药品默认先自付比例（10%），实际以当地医保政策为准 */
export const DEFAULT_YI_SELF_PAY_RATIO = 0.1;

/** 自费占比警戒线：超过即提示核查 */
export const SELFPAY_RATIO_WARN = 0.3;

/** 金额保留两位小数 */
function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** 比例保留四位小数（用于占比） */
function r4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/** 从 billedAt 提取 YYYY-MM-DD；非法返回 null */
function dayOf(billedAt: string): string | null {
  const day = String(billedAt ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

// ---------------------------------------------------------------------------
// 纯函数：医保结算智能审核
// ---------------------------------------------------------------------------

/**
 * 【核心业务深化】对一张结算单跑「费用测算 + 五条审核规则」。
 * 纯函数、无 I/O；items 为空 / 非法安全返回零金额空结果，不抛错。
 * 所有 issues 均为建议，needManualConfirm 恒为 true。
 */
export function reviewInsuranceSettlement(
  items: SettlementItem[] | null | undefined,
  patientInfo: PatientInfo | null | undefined,
  settlementId?: string,
): ReviewResult {
  const result: ReviewResult = {
    totalAmount: 0,
    insuranceBase: 0,
    selfPayAmount: 0,
    selfPayRatio: 0,
    issueCount: 0,
    maxSeverity: 'none',
    needManualConfirm: true,
    issues: [],
    summary: '',
  };
  if (settlementId) result.settlementId = settlementId;
  // patientInfo 预留（参保类型/诊断），当前口径不改变费用测算，仅显式接收以固定签名
  void patientInfo;

  const list = Array.isArray(items)
    ? items.filter(
        (it) =>
          it &&
          typeof it.itemCode === 'string' &&
          it.itemCode.trim().length > 0 &&
          typeof it.unitPrice === 'number' &&
          typeof it.quantity === 'number' &&
          it.unitPrice >= 0 &&
          it.quantity >= 0,
      )
    : [];

  if (list.length === 0) {
    result.summary = '无有效结算明细，无需审核。';
    return result;
  }

  let totalAmount = 0;
  let insuranceBase = 0;

  for (const it of list) {
    const amount = r2(it.unitPrice * it.quantity);
    totalAmount = r2(totalAmount + amount);

    // —— 统筹纳入基数测算（按甲/乙/丙与目录内外）——
    let payable = 0;
    const isDrug = it.category === '药品';

    if (isDrug) {
      if (!it.drugClass) {
        // 规则 1a：药品未标注甲乙丙分类
        result.issues.push({
          rule: 'drug.class_missing',
          severity: 'low',
          dimension: '甲乙丙分类',
          itemCode: it.itemCode,
          itemName: it.itemName,
          detail: `药品「${it.itemName}」(${it.itemCode}) 未标注甲/乙/丙医保分类`,
          suggestion: '请补录药品医保分类后重新结算；暂按全自费处理，不纳入统筹基数',
          suggestedDeduct: amount,
        });
        payable = 0;
      } else if (it.drugClass === '甲类') {
        payable = amount;
      } else if (it.drugClass === '乙类') {
        const ratio =
          typeof it.selfPayRatio === 'number' && it.selfPayRatio >= 0 && it.selfPayRatio <= 1
            ? it.selfPayRatio
            : DEFAULT_YI_SELF_PAY_RATIO;
        payable = r2(amount * (1 - ratio));
        if (typeof it.selfPayRatio !== 'number') {
          // 规则 1b：乙类缺先自付比例
          result.issues.push({
            rule: 'drug.yi_ratio_missing',
            severity: 'low',
            dimension: '甲乙丙分类',
            itemCode: it.itemCode,
            itemName: it.itemName,
            detail: `乙类药品「${it.itemName}」未录入先自付比例，暂按默认 ${r4(
              DEFAULT_YI_SELF_PAY_RATIO * 100,
            )}% 测算`,
            suggestion: '请按当地医保政策核对乙类先自付比例，避免统筹基数偏差',
          });
        }
      } else {
        // 丙类：全自费
        payable = 0;
        // 规则 2：丙类却标记为目录内，与政策矛盾
        if (it.inCatalog) {
          result.issues.push({
            rule: 'drug.bing_in_catalog',
            severity: 'medium',
            dimension: '目录匹配',
            itemCode: it.itemCode,
            itemName: it.itemName,
            detail: `丙类药品「${it.itemName}」(${it.itemCode}) 被标记为目录内，丙类应全自费`,
            suggestion: '丙类药品不纳入统筹基数，请核对目录标记，超额部分由患者自费',
          });
        }
      }
    } else {
      // 非药品：目录内纳入，目录外全自费（目录外不单独报错，统一计入自费占比）
      payable = it.inCatalog ? amount : 0;
    }

    // —— 规则 5：超标准收费（单价 > 医保最高限价）——
    if (
      typeof it.standardPrice === 'number' &&
      it.standardPrice > 0 &&
      it.unitPrice > it.standardPrice
    ) {
      const over = r2((it.unitPrice - it.standardPrice) * it.quantity);
      result.issues.push({
        rule: 'billing.over_standard',
        severity: 'medium',
        dimension: '超标准收费',
        itemCode: it.itemCode,
        itemName: it.itemName,
        detail: `单价 ${it.unitPrice} 元 超过医保最高限价 ${it.standardPrice} 元，超额 ${over} 元`,
        suggestion: `超额 ${over} 元建议剔除或改自费，不纳入统筹基数`,
        suggestedDeduct: over,
      });
      // 统筹纳入部分按限价封顶
      payable = Math.min(payable, r2(it.standardPrice * it.quantity));
    }

    insuranceBase = r2(insuranceBase + Math.max(0, payable));
  }

  // —— 规则 4：重复收费（同 itemCode 同日多条）——
  const groups = new Map<string, { name: string; day: string; count: number }>();
  for (const it of list) {
    const day = dayOf(it.billedAt);
    if (!day) continue;
    const key = `${it.itemCode}@${day}`;
    const g = groups.get(key) ?? { name: it.itemName, day, count: 0 };
    g.count += 1;
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    if (g.count > 1) {
      result.issues.push({
        rule: 'billing.duplicate',
        severity: 'low',
        dimension: '重复收费',
        itemCode: '',
        itemName: g.name,
        detail: `同日（${g.day}）项目「${g.name}」重复计费 ${g.count} 条`,
        suggestion: '请核对是否存在分解收费或重复录入，剔除多余条目后重新结算',
      });
    }
  }

  // —— 汇总费用 ——
  const selfPayAmount = r2(totalAmount - insuranceBase);
  const selfPayRatio = totalAmount > 0 ? r4(selfPayAmount / totalAmount) : 0;

  // —— 规则 3：自费占比过高 ——
  if (selfPayRatio > SELFPAY_RATIO_WARN) {
    result.issues.push({
      rule: 'selfpay.ratio_high',
      severity: 'medium',
      dimension: '自费占比',
      itemCode: '',
      itemName: '结算单',
      detail: `本次结算自费占比 ${(selfPayRatio * 100).toFixed(1)}%，超过 ${(
        SELFPAY_RATIO_WARN * 100
      ).toFixed(0)}% 警戒线`,
      suggestion: '请核查是否存在过度自费项目或目录外用药，必要时向患者告知并确认知情同意',
    });
  }

  result.totalAmount = totalAmount;
  result.insuranceBase = insuranceBase;
  result.selfPayAmount = selfPayAmount;
  result.selfPayRatio = selfPayRatio;
  result.issueCount = result.issues.length;

  // 最高严重度
  let top: Severity | 'none' = 'none';
  for (const iss of result.issues) {
    if (top === 'none' || SEVERITY_RANK[iss.severity] > SEVERITY_RANK[top as Severity]) {
      top = iss.severity;
    }
  }
  result.maxSeverity = top;

  result.summary = `本次结算总金额 ${totalAmount.toFixed(2)} 元，统筹纳入基数 ${insuranceBase.toFixed(
    2,
  )} 元，自费 ${selfPayAmount.toFixed(2)} 元（占比 ${(selfPayRatio * 100).toFixed(1)}%）；共识别 ${
    result.issueCount
  } 条建议项，需医保办人工确认后调整。`;

  return result;
}
