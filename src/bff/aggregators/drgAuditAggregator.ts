/**
 * 健澜科技 jlmedaios - DRG/DIP 智能审核规则引擎（事中/事后批量审核）
 *
 * 在「事前处方审核」（insuranceAuditAggregator）之外，面向「出院结算/DRG 入组」场景，
 * 对一次住院（visit）跑 22 条确定性纯函数规则，覆盖：
 *   超医保目录、限定支付、超支付限价、重复收费、打包重复、分解住院、低标入院、
 *   缺主诊断、高套分值、诊断手术不匹配、有手术无诊断、超限用药、抗菌无感染、
 *   重点监控药无适应症、重复检验、不合理高值耗材、耗材超量、性别/年龄不符、
 *   超长住院、短住院日费用畸高等。
 *
 * 设计要点：
 *  - 纯函数、无 I/O、确定性；任何非法输入安全降级为空命中，绝不抛错；
 *  - 规则元数据集中在 {@link DRG_AUDIT_RULES} 常量数组（可配置、可持久化），
 *    路由层据此暴露规则库；阈值集中在 {@link DrgAuditConfig}，生产可由
 *    医保局/院内规则下发覆盖，预留 DB 持久化接口（见文件尾 TODO）；
 *  - 命中输出规则编码 + 风险等级 + 中文类别 + 明细 + 处置建议；
 *  - 整体风险取命中最高级；high 视为医保不予支付/退回重议。
 *
 * 医疗定位：本模块为合规提醒与疑点筛查，最终支付/拒付以医保经办机构清算为准。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 风险等级：low < medium < high；high 视为退回/不予支付 */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 收费项目类别 */
export type ItemCategory = '药品' | '检查' | '检验' | '治疗' | '耗材' | string;

/** 一条收费明细 */
export interface AuditItem {
  /** 项目/医保编码 */
  itemCode: string;
  /** 项目名称 */
  itemName: string;
  /** 收费类别 */
  category: ItemCategory;
  /** 收费日期（YYYY-MM-DD 或 ISO） */
  billedAt: string;
  /** 数量（药品日剂量、耗材个数等，缺省按 1） */
  quantity?: number;
  /** 单价（元） */
  unitPrice?: number;
  /** 药品子类：antibacterial 抗菌药 / monitoring 重点监控药 */
  drugClass?: 'antibacterial' | 'monitoring';
  /** 明细级诊断（缺省取就诊级 diagnoses） */
  diagnoses?: string[];
}

/** 手术/操作 */
export interface Procedure {
  /** 操作编码 */
  code: string;
  /** 操作名称 */
  name: string;
  /** 操作日期 */
  performedAt?: string;
}

/** 既往住院（用于分解住院识别） */
export interface PriorAdmission {
  visitId?: string;
  /** 上次出院日期 YYYY-MM-DD */
  dischargeAt: string;
  /** 上次主诊断 */
  principalDiagnosis: string;
}

/** 待审核住院就诊（纯数据，无 I/O） */
export interface DrgAuditVisit {
  visitId?: string;
  patientId?: string;
  /** 年龄（岁） */
  age?: number;
  /** 性别：M 男 / F 女 */
  sex?: 'M' | 'F';
  /** 入院日期 YYYY-MM-DD */
  admissionAt?: string;
  /** 主诊断 */
  principalDiagnosis?: string;
  /** 其他诊断列表 */
  diagnoses?: string[];
  /** 手术/操作列表 */
  procedures?: Procedure[];
  /** 实际住院天数 */
  losDays?: number;
  /** 总费用（元） */
  totalCost?: number;
  /** 收费明细 */
  items?: AuditItem[];
  /** 既往住院史 */
  priorAdmissions?: PriorAdmission[];
}

/** 医保目录条目 */
export interface CatalogEntry {
  /** 限定支付适应症：诊断命中其一方可支付；空/缺省=无限定 */
  limitedIndications?: string[];
}

/**
 * 规则阈值配置（全部可选，内置合理默认值）。
 * 生产环境应由医保局/院内规则库下发，可整体替换；此处预留 DB 持久化接口。
 */
export interface DrgAuditConfig {
  /** 医保目录：itemCode -> 目录条目 */
  catalog: Record<string, CatalogEntry>;
  /** 超限价：itemCode -> 医保最高支付单价（元） */
  priceCap?: Record<string, number>;
  /** 同类别同日重复收费上限（超过即命中），默认 2 */
  duplicateSameDayLimit?: number;
  /** 分解住院窗口（天），默认 15 */
  readmissionWindowDays?: number;
  /** 低标入院：住院天数 <= 该值且费用 <= 阈值，默认 2 */
  lowStandardLosDays?: number;
  /** 低标入院费用阈值（元），默认 2000 */
  lowStandardCost?: number;
  /** 重复检验窗口（天），默认 7 */
  labRepeatWindowDays?: number;
  /** 超长住院基准天数，默认 30 */
  losBenchmarkDays?: number;
  /** 耗材数量合理上限（个），默认 3 */
  consumableQtyLimit?: number;
  /** 短住院日（天）费用畸高判定天数，默认 3 */
  shortLosDays?: number;
  /** 短住院日费用畸高阈值（元），默认 50000 */
  shortLosCost?: number;
  /** 性别受限项目：itemCode -> 要求性别 */
  sexRestrictedItems?: Record<string, 'M' | 'F'>;
  /** 年龄受限项目：itemCode -> { min?, max? }（岁） */
  ageRestrictedItems?: Record<string, { min?: number; max?: number }>;
  /** 高值耗材编码列表（需有对应手术方可合理使用） */
  highValueConsumables?: string[];
  /** 重点监控药品编码列表（需有对应适应症诊断） */
  restrictedDrugs?: string[];
  /** 药品日剂量上限：itemCode -> 当日最大数量 */
  drugDailyDoseLimit?: Record<string, number>;
  /** 手术-诊断匹配：操作编码 -> 期望诊断关键词列表 */
  procedureDxExpect?: Record<string, string[]>;
  /** 重症/CC/MCC 关键词（用于高套分值筛查） */
  severeDxKeywords?: string[];
  /** 高套分值：重症诊断但费用低于该值（元）视为疑点，默认 10000 */
  upcodingCostThreshold?: number;
}

/** 规则元数据（规则库常量数组元素） */
export interface RuleDefinition {
  /** 规则编码（命中里的 rule 字段） */
  code: string;
  /** 中文规则名 */
  name: string;
  /** 业务类别 */
  category: string;
  /** 默认风险等级 */
  riskLevel: RiskLevel;
  /** 是否启用 */
  enabled: boolean;
  /** 规则说明 */
  description: string;
  /** 处置建议 */
  suggestion: string;
}

/** 一条命中 */
export interface DrgAuditHit {
  /** 规则编码 */
  rule: string;
  level: RiskLevel;
  /** 中文类别 */
  category: string;
  /** 关联项目编码（就诊级规则可为空串） */
  itemCode: string;
  /** 关联项目/对象名称 */
  itemName: string;
  /** 命中说明 */
  detail: string;
  /** 处置建议 */
  suggestion: string;
}

/** 单次就诊审核结果 */
export interface DrgAuditResult {
  visitId?: string;
  /** 整体风险等级：命中最高级；无命中 low */
  riskLevel: RiskLevel;
  hitCount: number;
  /** high 即退回/不予支付 */
  blocked: boolean;
  hits: DrgAuditHit[];
}

/** 命中率统计 */
export interface HitRateStats {
  /** 审核就诊总数 */
  totalVisits: number;
  /** 至少命中一条的就诊数 */
  hitVisits: number;
  /** 命中率 0..1 */
  hitRate: number;
  /** 按规则：命中次数 + 涉及就诊数 */
  byRule: Record<string, { hits: number; visitsHit: number }>;
  /** 按风险等级计数（就诊数，取整体风险） */
  byLevel: Record<RiskLevel, number>;
}

// ---------------------------------------------------------------------------
// 内置规则库常量（可配置、可被 DB 规则库覆盖）
// ---------------------------------------------------------------------------

/**
 * DRG/DIP 审核规则库（22 条）。
 * 生产环境应从 DB/医保局下发加载；此处为内置默认规则集。
 * 注意：enabled=false 的规则不会进入 evaluateRules 输出。
 */
export const DRG_AUDIT_RULES: readonly RuleDefinition[] = [
  { code: 'catalog.out_of_catalog', name: '超医保目录', category: '目录合规', riskLevel: 'high', enabled: true, description: '收费项目编码不在医保目录内，医保不予支付', suggestion: '核对项目编码或改为自费项目' },
  { code: 'payment.limited_indication', name: '限定支付不符', category: '目录合规', riskLevel: 'medium', enabled: true, description: '目录内但限定适应症，当前诊断不满足', suggestion: '补充限定支付诊断证明，否则按自费结算' },
  { code: 'payment.price_cap_exceed', name: '超医保支付限价', category: '目录合规', riskLevel: 'high', enabled: true, description: '项目单价超过医保最高支付限价', suggestion: '核对定价，超限价部分需自费或调价' },
  { code: 'billing.duplicate_same_day', name: '同日重复收费', category: '收费合规', riskLevel: 'low', enabled: true, description: '同类别同日收费次数超过合理上限', suggestion: '核对是否重复计费/分解收费，剔除多余条目' },
  { code: 'billing.package_duplicate', name: '打包项目重复计费', category: '收费合规', riskLevel: 'low', enabled: true, description: '已按打包/定额计费的项目又单独计费', suggestion: '取消重复的单项计费，避免打包内拆分收费' },
  { code: 'admission.decomposition', name: '分解住院', category: '入组合规', riskLevel: 'high', enabled: true, description: '窗口期内同主诊断再次入院，疑分解住院', suggestion: '合并本次与上次住院，或说明再入院合理性' },
  { code: 'admission.low_standard', name: '低标入院', category: '入组合规', riskLevel: 'medium', enabled: true, description: '住院天数短且总费用低，达入院标准存疑', suggestion: '核查入院指征，必要时转为门诊或说明理由' },
  { code: 'admission.missing_principal_dx', name: '缺主诊断', category: '数据质量', riskLevel: 'medium', enabled: true, description: '出院就诊未填写主诊断，无法入组', suggestion: '补录主诊断后方可结算/入组' },
  { code: 'drg.upcoding', name: '高套分值', category: '入组合规', riskLevel: 'high', enabled: true, description: '填报重症/CC/MCC 诊断但无对应费用支撑', suggestion: '核查诊断依据与费用，下调不成立的重症编码' },
  { code: 'drg.dx_proc_mismatch', name: '诊断手术不匹配', category: '入组合规', riskLevel: 'medium', enabled: true, description: '手术/操作与主诊断无对应关系', suggestion: '核对主诊断与手术操作，纠正错填编码' },
  { code: 'procedure.without_diagnosis', name: '有手术无诊断', category: '入组合规', riskLevel: 'medium', enabled: true, description: '存在手术/操作但无任何诊断支撑', suggestion: '补充与操作对应的诊断' },
  { code: 'drug.overlimit_dose', name: '超限用药', category: '用药合规', riskLevel: 'medium', enabled: true, description: '药品当日总量超过规定上限', suggestion: '核对手册剂量，调整用法用量' },
  { code: 'drug.antibacterial_no_infection', name: '抗菌药无感染诊断', category: '用药合规', riskLevel: 'medium', enabled: true, description: '使用抗菌药物但无感染类诊断', suggestion: '补充感染诊断/病原学依据，或停用抗菌药' },
  { code: 'drug.restricted_no_indication', name: '重点监控药无适应症', category: '用药合规', riskLevel: 'medium', enabled: true, description: '使用重点监控药品但无对应适应症诊断', suggestion: '核实用药指征，补充诊断或停用' },
  { code: 'lab.duplicate_test', name: '重复检验', category: '检查检验', riskLevel: 'low', enabled: true, description: '同一检验项目在窗口期内重复开具', suggestion: '核对检验结果，避免重复送检' },
  { code: 'consumable.unreasonable', name: '不合理高值耗材', category: '耗材合规', riskLevel: 'medium', enabled: true, description: '使用高值耗材但无对应手术操作', suggestion: '核查耗材使用合理性与关联手术' },
  { code: 'consumable.qty_exceed', name: '耗材数量超量', category: '耗材合规', riskLevel: 'low', enabled: true, description: '耗材数量超过合理上限', suggestion: '核对术中实际用量，剔除多计数量' },
  { code: 'item.sex_mismatch', name: '性别与项目不符', category: '诊疗合规', riskLevel: 'medium', enabled: true, description: '收费项目与患者性别医学不符', suggestion: '核对患者性别或项目编码，纠正错收' },
  { code: 'item.age_mismatch', name: '年龄与项目不符', category: '诊疗合规', riskLevel: 'low', enabled: true, description: '收费项目适用年龄与患者年龄不符', suggestion: '核对适用人群，纠正项目/年龄' },
  { code: 'los.excess', name: '超长住院', category: '入组合规', riskLevel: 'low', enabled: true, description: '住院天数超过同病种基准天数', suggestion: '核查延期住院理由，办理出院或说明并发症' },
  { code: 'visit.short_los_high_cost', name: '短住院日费用畸高', category: '收费合规', riskLevel: 'medium', enabled: true, description: '住院天数很短但总费用异常偏高', suggestion: '核查费用结构，排除分解/虚记费用' },
  { code: 'billing.day_duplicate_procedure', name: '同日重复操作', category: '收费合规', riskLevel: 'low', enabled: true, description: '同一手术/操作同日重复计费', suggestion: '核对操作记录，剔除同日重复计费' },
] as const;

// ---------------------------------------------------------------------------
// 内置示例配置（演示用；生产由规则库下发）
// ---------------------------------------------------------------------------

/**
 * 内置示例配置。目录内编码 Y001..Y005；目录外（如 X999）触发「超医保目录」。
 * 数值仅用于演示，覆盖真实业务应替换为院内/医保局参数。
 */
export const SAMPLE_DRG_CONFIG: DrgAuditConfig = {
  catalog: {
    Y001: { limitedIndications: [] },
    Y002: { limitedIndications: ['肺腺癌', '结直肠癌'] },
    Y003: { limitedIndications: [] },
    Y004: { limitedIndications: [] },
    Y005: { limitedIndications: [] },
  },
  priceCap: { Y004: 500 },
  duplicateSameDayLimit: 2,
  readmissionWindowDays: 15,
  lowStandardLosDays: 2,
  lowStandardCost: 2000,
  labRepeatWindowDays: 7,
  losBenchmarkDays: 30,
  consumableQtyLimit: 3,
  shortLosDays: 3,
  shortLosCost: 50000,
  sexRestrictedItems: { G001: 'F' },
  ageRestrictedItems: { N001: { min: 0, max: 1 } },
  highValueConsumables: ['C001'],
  restrictedDrugs: ['R001'],
  drugDailyDoseLimit: { Y001: 3 },
  procedureDxExpect: { P001: ['阑尾炎'] },
  severeDxKeywords: ['脓毒症', '重症', '休克'],
  upcodingCostThreshold: 10000,
};

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

const RISK_RANK: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };

/** 从日期串取 YYYY-MM-DD；非法返回 null */
function dayOf(d: string | undefined | null): string | null {
  const s = String(d ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** 两个 YYYY-MM-DD 相差天数（b - a）；任一侧非法返回 null */
function diffDays(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / 86_400_000);
}

/** 诊断列表（去空字符串） */
function diagList(v: DrgAuditVisit): string[] {
  const arr = Array.isArray(v.diagnoses) ? v.diagnoses : [];
  return arr.filter((d): d is string => typeof d === 'string' && d.trim().length > 0);
}

/** 判断诊断列表中是否包含任一关键词（子串匹配） */
function diagHitAny(diags: string[], keywords: readonly string[]): boolean {
  return keywords.some((k) => diags.some((d) => d.includes(k)));
}

/** 取启用规则编码集合 */
function enabledRuleCodes(configRules?: readonly RuleDefinition[]): Set<string> {
  const defs = configRules ?? DRG_AUDIT_RULES;
  return new Set(defs.filter((r) => r.enabled).map((r) => r.code));
}

// ---------------------------------------------------------------------------
// 纯函数规则引擎
// ---------------------------------------------------------------------------

/**
 * 对一次住院跑全部启用规则，返回命中列表与整体风险等级。
 * 纯函数、无 I/O；输入为 null/undefined/非法时安全返回 low 空结果，不抛错。
 *
 * @param visit 待审核住院就诊（纯数据）
 * @param config 规则阈值配置；缺省字段取内置默认值
 * @param rules  可选规则定义集（缺省用内置 {@link DRG_AUDIT_RULES}）
 */
export function evaluateRules(
  visit: DrgAuditVisit | null | undefined,
  config: DrgAuditConfig,
  rules?: readonly RuleDefinition[],
): DrgAuditResult {
  const out: DrgAuditResult = { riskLevel: 'low', hitCount: 0, blocked: false, hits: [] };
  if (visit && visit.visitId) out.visitId = visit.visitId;
  if (!visit) return out;

  const enabled = enabledRuleCodes(rules);
  const push = (rule: string, level: RiskLevel, category: string, itemCode: string, itemName: string, detail: string, suggestion: string): void => {
    if (!enabled.has(rule)) return;
    out.hits.push({ rule, level, category, itemCode, itemName, detail, suggestion });
  };

  const catalog = config?.catalog ?? {};
  const items = Array.isArray(visit.items)
    ? visit.items.filter((it) => it && typeof it.itemCode === 'string' && it.itemCode.trim().length > 0)
    : [];
  const procedures = Array.isArray(visit.procedures) ? visit.procedures.filter((p) => p && typeof p.code === 'string') : [];
  const diags = diagList(visit);
  const principal = typeof visit.principalDiagnosis === 'string' ? visit.principalDiagnosis : '';
  const allDiags = principal ? [principal, ...diags] : diags;

  // —— 项目级规则：超目录 / 限定支付 / 超限价 / 超限用药 / 性别年龄 / 耗材 ——
  for (const it of items) {
    const entry = catalog[it.itemCode];

    // 1. 超医保目录 -> high
    if (!entry) {
      push('catalog.out_of_catalog', 'high', '目录合规', it.itemCode, it.itemName,
        `项目「${it.itemName}」(${it.itemCode}) 不在医保目录内`, '该项目医保不予支付，请核对编码或改为自费项目');
      continue;
    }

    // 2. 限定支付不符 -> medium
    const limited = Array.isArray(entry.limitedIndications) ? entry.limitedIndications : [];
    if (limited.length > 0) {
      const itemDiags = Array.isArray(it.diagnoses) ? it.diagnoses.filter((d): d is string => typeof d === 'string') : [];
      const d = [...allDiags, ...itemDiags];
      if (!diagHitAny(d, limited)) {
        push('payment.limited_indication', 'medium', '目录合规', it.itemCode, it.itemName,
          `项目「${it.itemName}」仅限${limited.join('、')}等适应症医保支付，当前诊断不符`,
          '请补充符合限定支付的诊断证明，否则按自费结算');
      }
    }

    // 3. 超医保支付限价 -> high
    const cap = config.priceCap?.[it.itemCode];
    if (typeof cap === 'number' && typeof it.unitPrice === 'number' && it.unitPrice > cap) {
      push('payment.price_cap_exceed', 'high', '目录合规', it.itemCode, it.itemName,
        `项目「${it.itemName}」单价 ${it.unitPrice} 元，超过医保限价 ${cap} 元`,
        '超限价部分需自费或调整定价');
    }

    // 12. 超限用药（药品当日总量超上限）-> medium
    const doseLimit = config.drugDailyDoseLimit?.[it.itemCode];
    if (typeof doseLimit === 'number' && typeof it.quantity === 'number' && it.quantity > doseLimit) {
      push('drug.overlimit_dose', 'medium', '用药合规', it.itemCode, it.itemName,
        `药品「${it.itemName}」当日总量 ${it.quantity}，超过日上限 ${doseLimit}`,
        '请核对手册剂量并调整用法用量');
    }

    // 18. 性别与项目不符 -> medium
    const needSex = config.sexRestrictedItems?.[it.itemCode];
    if (needSex && visit.sex && visit.sex !== needSex) {
      push('item.sex_mismatch', 'medium', '诊疗合规', it.itemCode, it.itemName,
        `项目「${it.itemName}」限${needSex === 'F' ? '女' : '男'}性，患者性别为${visit.sex === 'F' ? '女' : '男'}`,
        '核对患者性别或项目编码，纠正错收');
    }

    // 19. 年龄与项目不符 -> low
    const ageRule = config.ageRestrictedItems?.[it.itemCode];
    if (ageRule && typeof visit.age === 'number') {
      const tooYoung = typeof ageRule.min === 'number' && visit.age < ageRule.min;
      const tooOld = typeof ageRule.max === 'number' && visit.age > ageRule.max;
      if (tooYoung || tooOld) {
        push('item.age_mismatch', 'low', '诊疗合规', it.itemCode, it.itemName,
          `项目「${it.itemName}」适用年龄 ${ageRule.min ?? '*'}~${ageRule.max ?? '*'} 岁，患者 ${visit.age} 岁`,
          '核对适用人群，纠正项目或年龄');
      }
    }

    // 16. 高值耗材无对应手术 -> medium
    const isHvc = (config.highValueConsumables ?? []).includes(it.itemCode);
    if (isHvc && procedures.length === 0) {
      push('consumable.unreasonable', 'medium', '耗材合规', it.itemCode, it.itemName,
        `高值耗材「${it.itemName}」无对应手术/操作`, '核查耗材使用合理性与关联手术');
    }

    // 17. 耗材数量超量 -> low
    if (it.category === '耗材' && typeof it.quantity === 'number' && it.quantity > (config.consumableQtyLimit ?? 3)) {
      push('consumable.qty_exceed', 'low', '耗材合规', it.itemCode, it.itemName,
        `耗材「${it.itemName}」数量 ${it.quantity}，超过合理上限 ${config.consumableQtyLimit ?? 3}`,
        '核对术中实际用量，剔除多计数量');
    }
  }

  // 13/14. 抗菌药/重点监控药无对应诊断 -> medium（就诊级扫描 item）
  const hasInfection = diagHitAny(allDiags, ['感染', '肺炎', '脓肿', '脓', '发热']);
  for (const it of items) {
    if (it.drugClass === 'antibacterial' && !hasInfection) {
      push('drug.antibacterial_no_infection', 'medium', '用药合规', it.itemCode, it.itemName,
        `使用抗菌药「${it.itemName}」但无感染类诊断`, '补充感染诊断/病原学依据，或停用抗菌药');
    }
    if ((config.restrictedDrugs ?? []).includes(it.itemCode)) {
      const itemDiags = Array.isArray(it.diagnoses) ? it.diagnoses.filter((d): d is string => typeof d === 'string') : [];
      if (!diagHitAny([...allDiags, ...itemDiags], ['肿瘤', '高血压', '糖尿病'])) {
        push('drug.restricted_no_indication', 'medium', '用药合规', it.itemCode, it.itemName,
          `重点监控药「${it.itemName}」无对应适应症诊断`, '核实用药指征，补充诊断或停用');
      }
    }
  }

  // 4. 同类别同日重复收费 -> low
  const dupLimit = config.duplicateSameDayLimit ?? 2;
  const dayCat = new Map<string, { category: string; day: string; count: number }>();
  for (const it of items) {
    const day = dayOf(it.billedAt);
    if (!day) continue;
    const key = `${it.category}@${day}`;
    const g = dayCat.get(key) ?? { category: it.category, day, count: 0 };
    g.count += 1;
    dayCat.set(key, g);
  }
  for (const g of dayCat.values()) {
    if (g.count > dupLimit) {
      push('billing.duplicate_same_day', 'low', '收费合规', '', `${g.category}类`,
        `同日（${g.day}）${g.category}类项目共 ${g.count} 次，超过当日 ${dupLimit} 次合理上限`,
        '核对是否存在重复计费或分解收费，剔除多余条目');
    }
  }

  // 5. 打包项目重复计费：同编码同日既是「打包/治疗」又单独计 2 次以上 -> low
  const sameCodeDay = new Map<string, { code: string; name: string; day: string; count: number }>();
  for (const it of items) {
    const day = dayOf(it.billedAt);
    if (!day) continue;
    const key = `${it.itemCode}@${day}`;
    const g = sameCodeDay.get(key) ?? { code: it.itemCode, name: it.itemName, day, count: 0 };
    g.count += 1;
    sameCodeDay.set(key, g);
  }
  for (const g of sameCodeDay.values()) {
    if (g.count >= 3) {
      push('billing.package_duplicate', 'low', '收费合规', g.code, g.name,
        `项目「${g.name}」同日（${g.day}）计费 ${g.count} 次，疑打包内拆分重复计费`,
        '取消重复的单项计费，避免打包内拆分收费');
    }
  }

  // 15. 重复检验：同一检验项目窗口内重复 -> low
  const labByCode = new Map<string, { name: string; days: string[] }>();
  for (const it of items) {
    if (it.category !== '检验') continue;
    const day = dayOf(it.billedAt);
    if (!day) continue;
    const e = labByCode.get(it.itemCode) ?? { name: it.itemName, days: [] };
    e.days.push(day);
    labByCode.set(it.itemCode, e);
  }
  const window = config.labRepeatWindowDays ?? 7;
  for (const e of labByCode.values()) {
    e.days.sort();
    for (let i = 1; i < e.days.length; i += 1) {
      const gap = diffDays(e.days[i - 1], e.days[i]);
      if (gap !== null && gap <= window) {
        push('lab.duplicate_test', 'low', '检查检验', '', e.name,
          `检验「${e.name}」在 ${e.days[i - 1]} 与 ${e.days[i]}（间隔 ${gap} 天 ≤ ${window} 天）重复开具`,
          '核对检验结果，避免重复送检');
        break;
      }
    }
  }

  // 22. 同日重复操作 -> low
  const procDay = new Map<string, { name: string; day: string; count: number }>();
  for (const p of procedures) {
    const day = dayOf(p.performedAt);
    if (!day) continue;
    const key = `${p.code}@${day}`;
    const g = procDay.get(key) ?? { name: p.name, day, count: 0 };
    g.count += 1;
    procDay.set(key, g);
  }
  for (const g of procDay.values()) {
    if (g.count > 1) {
      push('billing.day_duplicate_procedure', 'low', '收费合规', '', g.name,
        `操作「${g.name}」同日（${g.day}）计费 ${g.count} 次`,
        '核对操作记录，剔除同日重复计费');
    }
  }

  // 8. 缺主诊断 -> medium
  if (!principal) {
    push('admission.missing_principal_dx', 'medium', '数据质量', '', '主诊断',
      '出院就诊未填写主诊断，无法进行 DRG/DIP 入组', '补录主诊断后方可结算/入组');
  }

  // 11. 有手术但无任何诊断 -> medium
  if (procedures.length > 0 && allDiags.length === 0) {
    push('procedure.without_diagnosis', 'medium', '入组合规', '', procedures[0]?.name ?? '手术',
      `存在手术/操作「${procedures[0]?.name ?? ''}」但无任何诊断支撑`, '补充与操作对应的诊断');
  }

  // 10. 手术-诊断不匹配 -> medium
  const expectMap = config.procedureDxExpect ?? {};
  for (const p of procedures) {
    const expects = expectMap[p.code];
    if (!expects || expects.length === 0) continue;
    if (!diagHitAny(allDiags, expects)) {
      push('drg.dx_proc_mismatch', 'medium', '入组合规', p.code, p.name,
        `操作「${p.name}」期望诊断含${expects.join('、')}，当前诊断不符`,
        '核对主诊断与手术操作，纠正错填编码');
    }
  }

  // 9. 高套分值：重症诊断但费用无支撑 -> high
  const severeKw = config.severeDxKeywords ?? ['脓毒症', '重症', '休克'];
  const cost = typeof visit.totalCost === 'number' ? visit.totalCost : NaN;
  if (principal && diagHitAny([principal, ...diags], severeKw)) {
    const thr = config.upcodingCostThreshold ?? 10000;
    if (!Number.isNaN(cost) && cost < thr) {
      push('drg.upcoding', 'high', '入组合规', '', principal,
        `主诊断「${principal}」属重症/CC/MCC 范畴，但总费用 ${cost} 元低于支撑阈值 ${thr} 元`,
        '核查诊断依据与费用，下调不成立的重症编码');
    }
  }

  // 6. 分解住院：窗口期同主诊断再入院 -> high
  const admitDay = dayOf(visit.admissionAt);
  const readmitWindow = config.readmissionWindowDays ?? 15;
  if (principal && admitDay) {
    for (const pa of visit.priorAdmissions ?? []) {
      const gap = diffDays(dayOf(pa.dischargeAt), admitDay);
      if (gap !== null && gap >= 0 && gap <= readmitWindow && pa.principalDiagnosis === principal) {
        push('admission.decomposition', 'high', '入组合规', '', principal,
          `上次出院（${pa.dischargeAt}）后 ${gap} 天（≤ ${readmitWindow} 天）以同主诊断「${principal}」再次入院`,
          '合并本次与上次住院，或说明再入院合理性');
      }
    }
  }

  // 7. 低标入院：住院天数短且费用低 -> medium
  const los = typeof visit.losDays === 'number' ? visit.losDays : NaN;
  const lowLos = config.lowStandardLosDays ?? 2;
  const lowCost = config.lowStandardCost ?? 2000;
  if (!Number.isNaN(los) && los <= lowLos && !Number.isNaN(cost) && cost <= lowCost && procedures.length === 0) {
    push('admission.low_standard', 'medium', '入组合规', '', `住院${los}天`,
      `住院 ${los} 天（≤ ${lowLos} 天）、总费用 ${cost} 元（≤ ${lowCost} 元）且无手术，入院指征存疑`,
      '核查入院指征，必要时转门诊或说明理由');
  }

  // 20. 超长住院 -> low
  const bench = config.losBenchmarkDays ?? 30;
  if (!Number.isNaN(los) && los > bench) {
    push('los.excess', 'low', '入组合规', '', `住院${los}天`,
      `住院 ${los} 天，超过基准 ${bench} 天`, '核查延期住院理由，办理出院或说明并发症');
  }

  // 21. 短住院日费用畸高 -> medium
  const shortDays = config.shortLosDays ?? 3;
  const shortCost = config.shortLosCost ?? 50000;
  if (!Number.isNaN(los) && los <= shortDays && !Number.isNaN(cost) && cost > shortCost) {
    push('visit.short_los_high_cost', 'medium', '收费合规', '', `住院${los}天`,
      `住院仅 ${los} 天但总费用达 ${cost} 元（> ${shortCost} 元），费用结构异常`,
      '核查费用结构，排除分解/虚记费用');
  }

  // 汇总整体风险
  let top: RiskLevel = 'low';
  for (const h of out.hits) {
    if (RISK_RANK[h.level] > RISK_RANK[top]) top = h.level;
  }
  out.riskLevel = top;
  out.hitCount = out.hits.length;
  out.blocked = top === 'high';
  return out;
}

/**
 * 批量审核：对多例就诊逐条跑 {@link evaluateRules}。纯函数。
 *
 * @param visits 就诊列表
 * @param config 规则配置
 * @param rules  可选规则定义集
 */
export function auditBatch(
  visits: DrgAuditVisit[] | null | undefined,
  config: DrgAuditConfig,
  rules?: readonly RuleDefinition[],
): DrgAuditResult[] {
  if (!Array.isArray(visits)) return [];
  return visits.map((v) => evaluateRules(v, config, rules));
}

/**
 * 命中率统计：给定一批审核结果，输出总就诊数、命中就诊数、命中率，
 * 以及按规则、按风险等级的分布。纯函数。
 *
 * @param results 批量审核结果列表
 */
export function hitRateStats(results: DrgAuditResult[] | null | undefined): HitRateStats {
  const empty: HitRateStats = {
    totalVisits: 0,
    hitVisits: 0,
    hitRate: 0,
    byRule: {},
    byLevel: { low: 0, medium: 0, high: 0 },
  };
  if (!Array.isArray(results) || results.length === 0) return empty;

  const byRule: Record<string, { hits: number; visitsHit: number }> = {};
  const byLevel: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  let hitVisits = 0;

  for (const r of results) {
    byLevel[r.riskLevel] += 1;
    if (r.hitCount > 0) hitVisits += 1;
    const seenRules = new Set<string>();
    for (const h of r.hits) {
      const e = byRule[h.rule] ?? { hits: 0, visitsHit: 0 };
      e.hits += 1;
      if (!seenRules.has(h.rule)) {
        e.visitsHit += 1;
        seenRules.add(h.rule);
      }
      byRule[h.rule] = e;
    }
  }

  return {
    totalVisits: results.length,
    hitVisits,
    hitRate: Number((hitVisits / results.length).toFixed(4)),
    byRule,
    byLevel,
  };
}
