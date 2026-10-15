/**
 * 健澜科技 jlmedaios - 医保控费智能提醒聚合器（M121-D）
 *
 * 医生开方时，在处方提交前做「事前医保合规扫描」，输出四路结构化提示，
 * 供医生右侧助手面板即时调整处方，避免事后拒付 / 违规扣款：
 *   ① complianceCheck   —— 本处方医保合规结论（pass / warning / blocked + 一句话摘要）；
 *   ② insuranceLimits  —— 命中的医保支付限制（目录外 / 限定适应症不符 / 超量 / 乙类自付）；
 *   ③ historyViolations—— 患者近期历史违规（透传 + 标记本次是否重复触发同类违规）；
 *   ④ alternatives      —— 针对不合规药品给出的医保目录内替代方案（通用名 / 低价等效）。
 *
 * 依据宪法（国家医疗保障待遇保障与基金监管精神）：
 *   - 本模块为「事前提醒」，不阻断医生处方、不改变处方审批状态；
 *     最终是否医保支付以医保经办机构清算为准，医生保留最终处方决策权（人在回路）；
 *   - 患者标识一律脱敏（张*三），输出不含身份证号 / 电话 / 医保卡号等直接标识符；
 *   - buildInsuranceComplianceAssistant 为纯函数：不读库、不发请求、不修改入参，
 *     非法输入安全降级为空数组，便于单测与前端预渲染。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 输入类型 ------------------------------- */

/** 处方内一条收费项目（药品 / 检查 / 治疗等） */
export interface PrescriptionItem {
  /** 医保编码（目录内编码，如 Y001；目录外项目传 X 开头编码） */
  itemCode: string;
  /** 项目名称（通用名优先） */
  itemName: string;
  /** 收费类别：药品 / 检查 / 检验 / 治疗 / 耗材 */
  category?: string;
  /** 数量 / 天数（用于超量规则） */
  quantity?: number;
  /** 单价（元，用于估算替代节省） */
  unitPrice?: number;
}

/** 医保目录条目（由医保局 / 院内目录下发） */
export interface CatalogEntry {
  /** 甲类 = 全额纳入报销；乙类 = 先自付一定比例再按比例报销；丙类 = 目录外自费 */
  reimburseType: '甲' | '乙' | '丙';
  /** 限定支付适应症：仅当诊断命中其中之一时方可医保支付；空 / 缺省 = 无限定 */
  limitedIndications?: string[];
  /** 单次 / 单日最大合理用量（数量阈值），超过即触发超量提醒 */
  maxQuantity?: number;
  /** 乙类先行自付比例（0~1），如 0.1 表示先自付 10% */
  selfPayRatio?: number;
}

/** 患者历史违规一条（由医保事前审核 / 既往处方透传） */
export interface HistoryViolationInput {
  /** 违规日期 YYYY-MM-DD */
  date: string;
  /** 历史处方 ID */
  prescriptionId?: string;
  /** 违规类型编码：out_of_catalog / limited_indication / over_quantity / self_pay */
  type: string;
  /** 违规说明 */
  detail: string;
  /** 涉及金额（元，可选） */
  amount?: number;
}

/** 医保目录内替代药品一条 */
export interface AlternativeInput {
  itemCode: string;
  itemName: string;
  category?: string;
  /** 选用替代的理由（目录内 / 通用名等效 / 限价更低） */
  reason: string;
  /** 估算节省金额（元），由上游按价差给出 */
  estimatedSaving?: number;
}

/** buildInsuranceComplianceAssistant 的聚合输入（任一分支缺省走空数据兜底） */
export interface InsuranceComplianceData {
  /** 处方内项目 */
  items?: PrescriptionItem[] | null;
  /** 处方诊断（诊断名列表，用于限定适应症匹配） */
  diagnoses?: string[] | null;
  /** 医保目录：itemCode -> 目录条目 */
  catalog?: Record<string, CatalogEntry> | null;
  /** 患者近期历史违规 */
  historyViolations?: HistoryViolationInput[] | null;
  /** 替代方案库：不合规 itemCode -> 替代列表 */
  alternatives?: Record<string, AlternativeInput[]> | null;
  /** 患者姓名（上游传入，聚合器内脱敏） */
  patientName?: string | null;
}

/* ------------------------------- 输出类型 ------------------------------- */

/** 合规风险级别（与 pharmacy 助手口径一致：info < warning < critical） */
export type ComplianceLevel = 'info' | 'warning' | 'critical';

/** ① 处方合规结论 */
export interface ComplianceCheck {
  /** pass = 合规可支付；warning = 有提醒但可继续；blocked = 目录外 / 重大违规需调整 */
  status: 'pass' | 'warning' | 'blocked';
  riskLevel: ComplianceLevel;
  /** 命中规则条数 */
  hitCount: number;
  /** 一句话结论 */
  summary: string;
}

/** ② 一条医保支付限制命中 */
export interface InsuranceLimit {
  /** 规则编码：out_of_catalog / limited_indication / over_quantity / self_pay */
  rule: string;
  itemCode: string;
  itemName: string;
  level: ComplianceLevel;
  /** 命中说明 */
  detail: string;
  /** 处置建议 */
  suggestion: string;
}

/** ③ 一条历史违规（已标记本次是否重复触发） */
export interface HistoryViolationItem {
  date: string;
  type: string;
  detail: string;
  amount: number | null;
  /** true = 本次处方再次触发同类违规（重复违规，重点关注） */
  repeated: boolean;
}

/** ④ 一条替代方案 */
export interface AlternativeItem {
  itemCode: string;
  itemName: string;
  category: string;
  reason: string;
  estimatedSaving: number;
}

/** buildInsuranceComplianceAssistant 的输出（严格四元组 + 脱敏患者名） */
export interface InsuranceComplianceResult {
  complianceCheck: ComplianceCheck;
  insuranceLimits: InsuranceLimit[];
  historyViolations: HistoryViolationItem[];
  alternatives: AlternativeItem[];
  /** 脱敏患者姓名，如 "张*三"；无档案时为 "待确认患者" */
  patientName: string;
}

/* ------------------------------- 纯函数 ------------------------------- */

const LEVEL_WEIGHT: Record<ComplianceLevel, number> = { info: 1, warning: 2, critical: 3 };

function maxLevel(levels: ComplianceLevel[]): ComplianceLevel {
  let best: ComplianceLevel = 'info';
  for (const l of levels) if (LEVEL_WEIGHT[l] > LEVEL_WEIGHT[best]) best = l;
  return best;
}

/**
 * 姓名脱敏（依据宪法个人信息保护精神）：只保留姓氏 + "*"，
 * "张三" → "张*"；"张建国" → "张*国"；空值返回 "待确认患者"。
 */
export function maskPatientName(raw?: string | null): string {
  const name = (raw ?? '').trim();
  if (!name) return '待确认患者';
  if (name.length <= 1) return `${name}*`;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}*${name.slice(-1)}`;
}

function normalizeItems(input: unknown): PrescriptionItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((d): d is PrescriptionItem =>
      !!d && typeof d === 'object' && typeof (d as PrescriptionItem).itemName === 'string'
        && (d as PrescriptionItem).itemName.trim().length > 0,
    )
    .map((d) => ({
      itemCode: String(d.itemCode ?? ''),
      itemName: d.itemName.trim(),
      category: typeof d.category === 'string' ? d.category : '',
      quantity: typeof d.quantity === 'number' && Number.isFinite(d.quantity) ? d.quantity : undefined,
      unitPrice: typeof d.unitPrice === 'number' && Number.isFinite(d.unitPrice) ? d.unitPrice : undefined,
    }));
}

function normalizeCatalog(input: unknown): Record<string, CatalogEntry> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out: Record<string, CatalogEntry> = {};
  for (const [code, entry] of Object.entries(input as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const reimburseType = e.reimburseType === '甲' || e.reimburseType === '乙' || e.reimburseType === '丙'
      ? e.reimburseType : '丙';
    out[code] = {
      reimburseType,
      limitedIndications: Array.isArray(e.limitedIndications) ? e.limitedIndications.map(String) : [],
      maxQuantity: typeof e.maxQuantity === 'number' ? e.maxQuantity : undefined,
      selfPayRatio: typeof e.selfPayRatio === 'number' ? e.selfPayRatio : undefined,
    };
  }
  return out;
}

/**
 * evaluateLimits：对处方逐项跑医保目录规则，输出命中的支付限制列表。
 *
 * 规则（依据国家医保药品 / 诊疗项目目录管理要求）：
 *  - 编码不在目录，或 reimburseType=丙 → critical，医保不予支付（事前提醒调整）；
 *  - 目录内但有限定适应症，且诊断不命中任何一项 → warning，需补证明或自费；
 *  - quantity 超过 maxQuantity → warning，超量开药；
 *  - 乙类且 selfPayRatio > 0 → info，提示先行自付比例。
 * 纯函数：不修改入参。
 */
export function evaluateLimits(
  items: PrescriptionItem[],
  diagnoses: string[],
  catalog: Record<string, CatalogEntry>,
): InsuranceLimit[] {
  const limits: InsuranceLimit[] = [];
  for (const item of items) {
    const entry = catalog[item.itemCode];
    // 规则 1：目录外 / 丙类
    if (!entry || entry.reimburseType === '丙') {
      limits.push({
        rule: 'out_of_catalog',
        itemCode: item.itemCode,
        itemName: item.itemName,
        level: 'critical',
        detail: `${item.itemName}（${item.itemCode || '无编码'}）不在医保目录内，医保基金不予支付`,
        suggestion: '请改用医保目录内等效药品，或向患者说明自费并签署知情同意',
      });
      continue;
    }
    // 规则 2：限定支付适应症
    if (Array.isArray(entry.limitedIndications) && entry.limitedIndications.length > 0) {
      const hit = entry.limitedIndications.some((ind) =>
        diagnoses.some((dx) => dx.includes(ind) || ind.includes(dx)),
      );
      if (!hit) {
        limits.push({
          rule: 'limited_indication',
          itemCode: item.itemCode,
          itemName: item.itemName,
          level: 'warning',
          detail: `${item.itemName} 医保限定支付适应症为「${entry.limitedIndications.join('、')}」，当前诊断不满足`,
          suggestion: '如病情确需使用，请补充相应诊断 / 证明材料；否则建议更换目录内不限定药品',
        });
      }
    }
    // 规则 3：超量
    if (typeof item.quantity === 'number' && typeof entry.maxQuantity === 'number'
      && item.quantity > entry.maxQuantity) {
      limits.push({
        rule: 'over_quantity',
        itemCode: item.itemCode,
        itemName: item.itemName,
        level: 'warning',
        detail: `${item.itemName} 本次数量 ${item.quantity}，超过医保单次合理上限 ${entry.maxQuantity}`,
        suggestion: '请核减数量至医保支付上限内，或分处方开具并说明理由',
      });
    }
    // 规则 4：乙类先行自付
    if (entry.reimburseType === '乙' && typeof entry.selfPayRatio === 'number' && entry.selfPayRatio > 0) {
      limits.push({
        rule: 'self_pay',
        itemCode: item.itemCode,
        itemName: item.itemName,
        level: 'info',
        detail: `${item.itemName} 为乙类药品，需先行自付 ${Math.round(entry.selfPayRatio * 100)}% 后再按比例报销`,
        suggestion: '向患者说明自付比例，避免结算争议',
      });
    }
  }
  return limits;
}

/**
 * buildHistoryViolations：透传历史违规，并标记本次是否重复触发同类规则。
 *
 * repeated = 本次 limits 中存在相同 rule 编码的命中（同一类违规再次发生）。
 */
export function buildHistoryViolations(
  history: HistoryViolationInput[] | null | undefined,
  currentRules: Set<string>,
): HistoryViolationItem[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h) => !!h && typeof h === 'object' && typeof (h as HistoryViolationInput).detail === 'string')
    .map((h) => ({
      date: String(h.date ?? ''),
      type: String(h.type ?? ''),
      detail: h.detail,
      amount: typeof h.amount === 'number' && Number.isFinite(h.amount) ? h.amount : null,
      repeated: currentRules.has(String(h.type ?? '')),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * buildAlternatives：针对本次不合规（critical / warning）的项目，从替代库取方案。
 *
 * 仅对命中 out_of_catalog / limited_indication 的项目推荐替代；
 * info 级（乙类自付）不推荐替代。按估算节省金额降序。
 */
export function buildAlternatives(
  limits: InsuranceLimit[],
  altLibrary: Record<string, AlternativeInput[]> | null | undefined,
): AlternativeItem[] {
  if (!altLibrary || typeof altLibrary !== 'object') return [];
  const out: AlternativeItem[] = [];
  for (const limit of limits) {
    if (limit.level === 'info') continue;
    const alts = altLibrary[limit.itemCode];
    if (!Array.isArray(alts)) continue;
    for (const a of alts) {
      if (!a || typeof a !== 'object' || typeof a.itemName !== 'string') continue;
      out.push({
        itemCode: String(a.itemCode ?? ''),
        itemName: a.itemName.trim(),
        category: typeof a.category === 'string' ? a.category : '',
        reason: String(a.reason ?? ''),
        estimatedSaving: typeof a.estimatedSaving === 'number' && Number.isFinite(a.estimatedSaving)
          ? a.estimatedSaving : 0,
      });
    }
  }
  return out.sort((a, b) => b.estimatedSaving - a.estimatedSaving);
}

/**
 * buildComplianceCheck：汇总 limits + history，得出本处方合规结论。
 *
 *  - 存在 critical（目录外）→ status=blocked，riskLevel=critical；
 *  - 仅 warning          → status=warning，riskLevel=warning；
 *  - 仅 info（乙类自付） → status=warning（需告知），riskLevel=info；
 *  - 无任何命中          → status=pass，riskLevel=info。
 */
export function buildComplianceCheck(limits: InsuranceLimit[]): ComplianceCheck {
  const critical = limits.filter((l) => l.level === 'critical').length;
  const warning = limits.filter((l) => l.level === 'warning').length;
  const info = limits.filter((l) => l.level === 'info').length;
  const riskLevel = maxLevel(limits.map((l) => l.level));

  let status: ComplianceCheck['status'] = 'pass';
  let summary = '本处方符合医保支付要求，可正常提交结算';
  if (critical > 0) {
    status = 'blocked';
    summary = `本处方含 ${critical} 项目录外 / 不予支付项目，建议调整后再提交`;
  } else if (warning > 0) {
    status = 'warning';
    summary = `本处方含 ${warning} 项医保支付提醒（限定适应症 / 超量），请核对或补充材料`;
  } else if (info > 0) {
    status = 'warning';
    summary = `本处方含 ${info} 项乙类先行自付项目，请向患者说明报销比例`;
  }
  return { status, riskLevel, hitCount: limits.length, summary };
}

/**
 * buildInsuranceComplianceAssistant：医保控费智能提醒主入口（纯函数）。
 *
 * 依据宪法：doctorId / prescriptionId / patientId 仅作调用方溯源入参，
 * 不回显进输出（患者标识最小化，姓名走 maskPatientName 脱敏）；
 * data 任一分支缺省都走空数据兜底，不抛异常。
 *
 * @param doctorId       开方医生 ID（取当前登录医生）
 * @param prescriptionId 处方 ID
 * @param patientId      患者 ID（不回显）
 * @param data           处方项目 + 诊断 + 目录 + 历史违规 + 替代库，可为 null
 */
export function buildInsuranceComplianceAssistant(
  doctorId: string,
  prescriptionId: string,
  patientId: string,
  data: InsuranceComplianceData | null | undefined,
): InsuranceComplianceResult {
  // 显式保留入参语义：doctorId / prescriptionId / patientId 供审计溯源，输出不含明文标识
  void doctorId;
  void prescriptionId;
  void patientId;

  const input = data ?? {};
  const items = normalizeItems(input.items);
  const diagnoses = Array.isArray(input.diagnoses)
    ? input.diagnoses.map((d) => String(d ?? '').trim()).filter(Boolean) : [];
  const catalog = normalizeCatalog(input.catalog);

  const limits = evaluateLimits(items, diagnoses, catalog);
  const currentRules = new Set(limits.map((l) => l.rule));
  const history = buildHistoryViolations(input.historyViolations, currentRules);
  const alternatives = buildAlternatives(limits, input.alternatives);
  const complianceCheck = buildComplianceCheck(limits);

  return {
    complianceCheck,
    insuranceLimits: limits,
    historyViolations: history,
    alternatives,
    patientName: maskPatientName(input.patientName),
  };
}

/* ----------------------------- 演示兜底 ------------------------------ */

function demoItems(): PrescriptionItem[] {
  return [
    { itemCode: 'Y002', itemName: '注射用曲妥珠单抗', category: '药品', quantity: 1, unitPrice: 5500 },
    { itemCode: 'X999', itemName: '进口营养补充剂', category: '药品', quantity: 2, unitPrice: 380 },
    { itemCode: 'Y001', itemName: '阿莫西林胶囊', category: '药品', quantity: 7, unitPrice: 12 },
  ];
}

function demoCatalog(): Record<string, CatalogEntry> {
  return {
    Y001: { reimburseType: '甲', limitedIndications: [], maxQuantity: 14 },
    Y002: { reimburseType: '乙', limitedIndications: ['肺腺癌', '胃腺癌'], maxQuantity: 1, selfPayRatio: 0.1 },
  };
}

function demoHistory(): HistoryViolationInput[] {
  return [
    { date: '2026-09-18', type: 'limited_indication', detail: '靶向药限定适应症不符', amount: 5500 },
    { date: '2026-08-02', type: 'over_quantity', detail: '抗生素超量开药 3 天', amount: 45 },
  ];
}

function demoAlternatives(): Record<string, AlternativeInput[]> {
  return {
    X999: [
      { itemCode: 'Y010', itemName: '口服复合维生素B', category: '药品', reason: '甲类目录内等效营养补充', estimatedSaving: 760 },
    ],
    Y002: [
      { itemCode: 'Y011', itemName: '注射用曲妥珠单抗（国谈仿制）', category: '药品', reason: '同通用名国谈品种，医保支付比例更高', estimatedSaving: 1200 },
    ],
  };
}

export interface InsuranceComplianceView extends InsuranceComplianceResult {
  doctorId: string;
  prescriptionId: string;
  /** true 表示当前为演示数据 */
  demo: boolean;
  updatedAt: string;
}

/**
 * listView：路由层调用入口。
 *
 * 当前为演示态：统一走 buildInsuranceComplianceAssistant 纯函数聚合内置演示数据集，
 * 保证空库可演示、不抛 5xx；后续接入真实 EMR / 医保目录 / 历史违规库时，
 * 在此处 try 查询并回退到本演示函数，纯函数与单测无需改动。
 */
export async function listView(
  doctorId: string,
  prescriptionId: string,
  patientId: string,
): Promise<InsuranceComplianceView> {
  const base = buildInsuranceComplianceAssistant(doctorId, prescriptionId, patientId, {
    items: demoItems(),
    diagnoses: ['2型糖尿病', '社区获得性肺炎'],
    catalog: demoCatalog(),
    historyViolations: demoHistory(),
    alternatives: demoAlternatives(),
    patientName: '王秀兰',
  });
  return { ...base, doctorId, prescriptionId, demo: true, updatedAt: new Date().toISOString() };
}
