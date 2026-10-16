/**
 * 健澜科技 jlmedaios - CDSS 临床决策支持深化 · 规则引擎聚合器（M165-A）
 *
 * 「CDSS与运营精细化」——CDSS 告警不能太多，否则医生会忽略（告警疲劳）。
 * 本模块把 CDSS 从「有警必报」升级为「少而准、可运营」的提醒系统：
 *   - buildCDSSEngine(patientContext, orderContext)  装配引擎：按上下文裁剪适用规则集（纯函数）；
 *   - evaluateCDSSRules(patientContext, rules)      规则求值：命中即产原始告警（纯函数）；
 *   - prioritizeCDSSAlerts(alerts)                  优先级排序 + 同优先级去重合并，
 *                                                    超量低优先级告警压制，防告警疲劳（纯函数）；
 *   - trackCDSSAdoption(alertId, action)            医生处置闭环：采纳/驳回/忽略/升级（纯函数）。
 *
 * 规则覆盖四大类：
 *   drug_review   药物审核：剂量异常 / 相互作用 / 禁忌症 / 重复用药；
 *   lab_imaging   检查检验建议：漏查 / 多查 / 时机；
 *   diagnosis     诊断提示：鉴别 / 红旗 / 罕见病；
 *   treatment     治疗方案：指南推荐 / 路径偏离 / 并发症。
 *
 * 优先级：red 红(致命阻断) > orange 橙(强烈建议) > yellow 黄(提示) > blue 蓝(仅供参考)。
 * 全部派生数值由确定性逻辑算出，不触 DB、不触网络，便于单测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型定义                                                             */
/* ------------------------------------------------------------------ */

/** 规则大类 */
export type CDSSRuleType = 'drug_review' | 'lab_imaging' | 'diagnosis' | 'treatment';

/** 告警优先级：红 > 橙 > 黄 > 蓝 */
export type CDSSPriority = 'red' | 'orange' | 'yellow' | 'blue';

/** 医生对告警的处置动作 */
export type CDSSAdoptionAction = 'accepted' | 'overridden' | 'dismissed' | 'escalated';

/** 患者上下文（求值输入） */
export interface CDSSPatientContext {
  /** 患者唯一标识 */
  patientId: string;
  /** 年龄（岁） */
  age: number;
  /** 性别 */
  gender: 'M' | 'F';
  /** 体重（kg，剂量折算用） */
  weightKg?: number;
  /** 已有诊断（中文名或 ICD 关键词） */
  diagnoses: string[];
  /** 登记过敏药品 */
  allergies: string[];
  /** 当前在用药 */
  activeDrugs: string[];
  /** 近期已做检验项目（多查/漏查判断用） */
  recentLabs: string[];
  /** 当前症状 */
  symptoms: string[];
}

/** 一条医嘱 */
export interface CDSSOrder {
  orderId: string;
  category: 'drug' | 'lab' | 'imaging';
  /** 通用名 / 检验项名 */
  name: string;
  /** 单次剂量（mg） */
  dosageMg?: number;
  /** 每日频次 */
  freqPerDay?: number;
}

/** 医嘱上下文（求值输入） */
export interface CDSSOrderContext {
  orders: CDSSOrder[];
  /** 关联临床路径（路径偏离判断用） */
  pathwayId?: string;
}

/** 规则条件类型（引擎按 kind 解释 condition，声明式，禁止拼 SQL） */
export type CDSSConditionKind =
  | 'drug_single_dose'
  | 'drug_daily_dose'
  | 'drug_interaction'
  | 'drug_contraindication'
  | 'drug_duplicate'
  | 'lab_missing'
  | 'lab_redundant'
  | 'dx_red_flag'
  | 'dx_differential'
  | 'dx_rare'
  | 'tx_guideline'
  | 'tx_pathway_deviation'
  | 'tx_complication';

/** 一条 CDSS 规则（与 medmuse.cdss_rule 对齐） */
export interface CDSSRule {
  /** 规则编码（对应 rule_code） */
  ruleId: string;
  ruleType: CDSSRuleType;
  /** 子类：剂量异常/相互作用/... */
  subType: string;
  name: string;
  description: string;
  priority: CDSSPriority;
  conditionKind: CDSSConditionKind;
  /** 声明式条件参数 */
  condition: Record<string, unknown>;
}

/** 一条告警 */
export interface CDSSAlert {
  /** 告警唯一标识（采纳跟踪关联键） */
  alertId: string;
  ruleId: string;
  ruleType: CDSSRuleType;
  subType: string;
  priority: CDSSPriority;
  priorityLabel: string;
  title: string;
  message: string;
  suggestedAction: string;
  /** 关联医嘱/患者对象 */
  relatedTo: string[];
  /** 去重合并键：同优先级 + 同键合并为一条 */
  dedupKey: string;
  /** 被合并进来的同源告警数（合并后 > 1 表示已收敛） */
  mergedCount: number;
}

/** buildCDSSEngine 返回：可用规则集 + 患者事实快照 */
export interface CDSSEngine {
  patientId: string;
  builtAt: string;
  /** 本次适用规则（按上下文裁剪后） */
  applicableRules: CDSSRule[];
  /** 事实快照：供前端与运营看板展示 */
  facts: {
    drugOrderCount: number;
    labOrderCount: number;
    diagnosisCount: number;
    activeDrugCount: number;
    allergyCount: number;
  };
}

/** prioritizeCDSSAlerts 返回：排序合并后的告警 + 被压制统计 */
export interface CDSSAlertBundle {
  /** 真正弹给医生的告警（已排序、已合并、已截断） */
  alerts: CDSSAlert[];
  /** 因告警疲劳治理被压制（未弹窗）的告警数 */
  suppressedCount: number;
  /** 各优先级原始命中数（运营大盘） */
  byPriority: Record<CDSSPriority, number>;
}

/** trackCDSSAdoption 返回：一条处置记录 */
export interface CDSSAdoptionRecord {
  alertId: string;
  action: CDSSAdoptionAction;
  actedAt: string;
  /** 是否算「有效闭环」：采纳/驳回/升级均为闭环，忽略不算 */
  acknowledged: boolean;
}

/* ------------------------------------------------------------------ */
/* 错误类型                                                             */
/* ------------------------------------------------------------------ */

export class CDSSEngineError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CDSSEngineError';
  }
}

const badRequest = (m: string) => new CDSSEngineError(400, 'BAD_REQUEST', m);

/* ------------------------------------------------------------------ */
/* 常量                                                                 */
/* ------------------------------------------------------------------ */

/** 优先级权重：红=0（最高）> 橙 > 黄 > 蓝 */
export const PRIORITY_RANK: Record<CDSSPriority, number> = {
  red: 0,
  orange: 1,
  yellow: 2,
  blue: 3,
};

export const PRIORITY_LABEL: Record<CDSSPriority, string> = {
  red: '红·致命阻断',
  orange: '橙·强烈建议',
  yellow: '黄·提示',
  blue: '蓝·仅供参考',
};

/** 单次 evaluate 最多弹窗条数：超过则低优先级告警被压制（告警疲劳红线） */
export const CDSS_MAX_SURFACE_ALERTS = 5;

/* ------------------------------------------------------------------ */
/* 内建规则目录（与 332-cdss-deep.sql 种子对齐；执行期进程内派生）         */
/* ------------------------------------------------------------------ */

export const CDSS_RULE_CATALOG: CDSSRule[] = [
  // —— 药物审核 · 剂量异常 ——
  {
    ruleId: 'DRUG-DOSE-001',
    ruleType: 'drug_review',
    subType: '剂量异常',
    name: '单次剂量超安全上限',
    description: '开嘱剂量超过药品说明书单次最大剂量，需二次确认或驳回。',
    priority: 'red',
    conditionKind: 'drug_single_dose',
    condition: { maxSingleMg: 2000 },
  },
  {
    ruleId: 'DRUG-DOSE-002',
    ruleType: 'drug_review',
    subType: '剂量异常',
    name: '每日剂量超安全上限',
    description: '按频次折算每日总量超安全上限，老年患者需按体重复核。',
    priority: 'orange',
    conditionKind: 'drug_daily_dose',
    condition: { maxDailyMg: 4000 },
  },
  // —— 药物审核 · 相互作用 ——
  {
    ruleId: 'DRUG-INT-001',
    ruleType: 'drug_review',
    subType: '相互作用',
    name: '高危药物相互作用',
    description: '当前用药存在已知高危相互作用组合，叠加出血/横纹肌溶解风险。',
    priority: 'red',
    conditionKind: 'drug_interaction',
    condition: {
      pairs: [
        ['warfarin', 'aspirin'],
        ['simvastatin', 'clarithromycin'],
      ],
    },
  },
  // —— 药物审核 · 禁忌症 ——
  {
    ruleId: 'DRUG-CONTRA-001',
    ruleType: 'drug_review',
    subType: '禁忌症',
    name: '过敏史冲突',
    description: '拟用药品与患者登记过敏史冲突，严禁开具。',
    priority: 'red',
    conditionKind: 'drug_contraindication',
    condition: {},
  },
  // —— 药物审核 · 重复用药 ——
  {
    ruleId: 'DRUG-DUP-001',
    ruleType: 'drug_review',
    subType: '重复用药',
    name: '同通用名重复开嘱',
    description: '同一通用名药品本次医嘱出现两条及以上，属重复用药。',
    priority: 'orange',
    conditionKind: 'drug_duplicate',
    condition: { minCount: 2 },
  },
  // —— 检查检验 · 漏查 ——
  {
    ruleId: 'LAB-MISS-001',
    ruleType: 'lab_imaging',
    subType: '漏查',
    name: '诊断必需检验漏开',
    description: '对应诊断路径的关键检验尚未开具。',
    priority: 'yellow',
    conditionKind: 'lab_missing',
    condition: { diagnoses: ['肺炎'], requiredLabs: ['血常规', 'CRP'] },
  },
  // —— 检查检验 · 多查 ——
  {
    ruleId: 'LAB-REDUN-001',
    ruleType: 'lab_imaging',
    subType: '多查',
    name: '短期重复检验',
    description: '该检验近期已做，无病情变化不建议短期内重复。',
    priority: 'blue',
    conditionKind: 'lab_redundant',
    condition: {},
  },
  // —— 诊断提示 · 红旗 ——
  {
    ruleId: 'DX-RED-001',
    ruleType: 'diagnosis',
    subType: '红旗',
    name: '红旗症状需紧急处置',
    description: '症状组合提示高危红旗，需立即升级处置。',
    priority: 'red',
    conditionKind: 'dx_red_flag',
    condition: { all: ['chest_pain'], any: ['diaphoresis', 'dyspnea'] },
  },
  // —— 诊断提示 · 鉴别 ——
  {
    ruleId: 'DX-DIFF-001',
    ruleType: 'diagnosis',
    subType: '鉴别',
    name: '鉴别诊断提示',
    description: '症状不典型，建议列入鉴别诊断清单。',
    priority: 'yellow',
    conditionKind: 'dx_differential',
    condition: { symptomsAny: ['fever', 'cough'], candidates: ['肺结核', '肺癌'] },
  },
  // —— 治疗方案 · 指南推荐 ——
  {
    ruleId: 'TX-GUIDE-001',
    ruleType: 'treatment',
    subType: '指南推荐',
    name: '指南推荐治疗未落地',
    description: '按最新路径，该诊断应首选的指南推荐方案未出现在医嘱中。',
    priority: 'blue',
    conditionKind: 'tx_guideline',
    condition: { diagnoses: ['高血压'], expectedDrugs: ['amlodipine', 'losartan'] },
  },
];

/* ------------------------------------------------------------------ */
/* 工具                                                                 */
/* ------------------------------------------------------------------ */

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function includesKeyword(list: string[], keyword: string): boolean {
  const k = normalize(keyword);
  return list.some((item) => normalize(item).includes(k));
}

function makeAlertId(ruleId: string, relatedTo: string[]): string {
  // 确定性派生：同规则同对象同次求值产出同一 alertId，便于采纳跟踪幂等
  const seed = `${ruleId}:${relatedTo.join('|')}`;
  let h = 7;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return `al_${ruleId}_${Math.abs(h).toString(36)}`;
}

/* ------------------------------------------------------------------ */
/* 1) buildCDSSEngine —— 装配引擎：按上下文裁剪适用规则集（纯函数）        */
/* ------------------------------------------------------------------ */

/**
 * 装配 CDSS 引擎：
 *   - 校验患者上下文必填项；
 *   - 按医嘱/患者事实裁剪适用规则：无药品医嘱则药物类规则不参与本次求值，
 *     避免对无关规则空转刷告警（告警疲劳治理第一步：先少算）。
 */
export function buildCDSSEngine(
  patientContext: CDSSPatientContext,
  orderContext: CDSSOrderContext,
): CDSSEngine {
  if (!patientContext || typeof patientContext.patientId !== 'string' || !patientContext.patientId) {
    throw badRequest('patientContext.patientId 为必填项');
  }
  const orders = Array.isArray(orderContext?.orders) ? orderContext.orders : [];
  const drugOrders = orders.filter((o) => o.category === 'drug');
  const labOrders = orders.filter((o) => o.category === 'lab');
  const diagnoses = Array.isArray(patientContext.diagnoses) ? patientContext.diagnoses : [];
  const activeDrugs = Array.isArray(patientContext.activeDrugs) ? patientContext.activeDrugs : [];

  // 规则适用性裁剪：药物类规则仅当本次有药品医嘱或在用药时参与；
  // 检验类规则当有诊断或检验医嘱时参与；诊断/治疗类当有诊断或症状时参与。
  const hasDrugContext = drugOrders.length > 0 || activeDrugs.length > 0;
  const hasLabContext = diagnoses.length > 0 || labOrders.length > 0;
  const hasClinicalContext = diagnoses.length > 0 || patientContext.symptoms.length > 0;

  const applicableRules = CDSS_RULE_CATALOG.filter((rule) => {
    if (rule.ruleType === 'drug_review') return hasDrugContext;
    if (rule.ruleType === 'lab_imaging') return hasLabContext;
    if (rule.ruleType === 'diagnosis') return hasClinicalContext;
    // treatment
    return diagnoses.length > 0;
  });

  return {
    patientId: patientContext.patientId,
    builtAt: new Date().toISOString(),
    applicableRules,
    facts: {
      drugOrderCount: drugOrders.length,
      labOrderCount: labOrders.length,
      diagnosisCount: diagnoses.length,
      activeDrugCount: activeDrugs.length,
      allergyCount: patientContext.allergies?.length ?? 0,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 2) evaluateCDSSRules —— 规则求值：命中产原始告警（纯函数）             */
/* ------------------------------------------------------------------ */

function evaluateRule(
  rule: CDSSRule,
  patient: CDSSPatientContext,
  orders: CDSSOrder[],
): CDSSAlert[] {
  const out: CDSSAlert[] = [];
  const drugOrders = orders.filter((o) => o.category === 'drug');
  const diagnoses = patient.diagnoses ?? [];
  const allergies = patient.allergies ?? [];
  const activeDrugs = patient.activeDrugs ?? [];
  const recentLabs = patient.recentLabs ?? [];
  const symptoms = patient.symptoms ?? [];

  const push = (message: string, suggestedAction: string, relatedTo: string[], dedupKey: string) => {
    out.push({
      alertId: makeAlertId(rule.ruleId, relatedTo),
      ruleId: rule.ruleId,
      ruleType: rule.ruleType,
      subType: rule.subType,
      priority: rule.priority,
      priorityLabel: PRIORITY_LABEL[rule.priority],
      title: rule.name,
      message,
      suggestedAction,
      relatedTo,
      dedupKey: `${rule.ruleType}:${rule.subType}:${dedupKey}`,
      mergedCount: 1,
    });
  };

  switch (rule.conditionKind) {
    // —— 单次剂量超限 ——
    case 'drug_single_dose': {
      const max = Number(rule.condition.maxSingleMg ?? Infinity);
      for (const o of drugOrders) {
        if (typeof o.dosageMg === 'number' && o.dosageMg > max) {
          push(
            `药品「${o.name}」单次剂量 ${o.dosageMg}mg 超安全上限 ${max}mg。`,
            '请复核药品通用名与单次剂量，超量需上级医师双签。',
            [o.orderId, o.name],
            `single:${o.name}`,
          );
        }
      }
      break;
    }
    // —— 每日剂量超限 ——
    case 'drug_daily_dose': {
      const max = Number(rule.condition.maxDailyMg ?? Infinity);
      for (const o of drugOrders) {
        const daily = (o.dosageMg ?? 0) * (o.freqPerDay ?? 1);
        if (daily > max) {
          push(
            `药品「${o.name}」按每日 ${o.freqPerDay ?? 1} 次折算日总量 ${Math.round(daily)}mg，超安全上限 ${max}mg。`,
            '请复核频次或按体重（' + (patient.weightKg ?? '未知') + 'kg）重新折算。',
            [o.orderId, o.name],
            `daily:${o.name}`,
          );
        }
      }
      break;
    }
    // —— 高危相互作用（在用药 × 新开药品） ——
    case 'drug_interaction': {
      const pairs = (rule.condition.pairs as string[][]) ?? [];
      const allDrugs = new Set([...drugOrders.map((o) => normalize(o.name)), ...activeDrugs.map(normalize)]);
      for (const [a, b] of pairs) {
        if (allDrugs.has(normalize(a)) && allDrugs.has(normalize(b))) {
          push(
            `「${a}」与「${b}」存在高危相互作用，当前同时在列。`,
            '请评估是否调整其中一种用药或加强监测（INR/肌酶等）。',
            [a, b],
            `pair:${a}+${b}`,
          );
        }
      }
      break;
    }
    // —— 过敏史冲突 ——
    case 'drug_contraindication': {
      for (const o of drugOrders) {
        const hit = allergies.some((al) => normalize(o.name).includes(normalize(al)));
        if (hit) {
          push(
            `药品「${o.name}」与患者登记过敏史直接冲突。`,
            '立即撤单并换用替代药品，必要时上报不良反应。',
            [o.orderId, o.name],
            `allergy:${o.name}`,
          );
        }
      }
      break;
    }
    // —— 重复用药 ——
    case 'drug_duplicate': {
      const minCount = Number(rule.condition.minCount ?? 2);
      const byName = new Map<string, CDSSOrder[]>();
      for (const o of drugOrders) {
        const key = normalize(o.name);
        byName.set(key, [...(byName.get(key) ?? []), o]);
      }
      for (const [name, list] of byName) {
        if (list.length >= minCount) {
          push(
            `通用名「${name}」本次医嘱出现 ${list.length} 条，疑似重复用药。`,
            '请确认是否不同剂型或给药途径，否则合并为一条。',
            list.map((o) => o.orderId),
            `dup:${name}`,
          );
        }
      }
      break;
    }
    // —— 漏查 ——
    case 'lab_missing': {
      const diagHits = (rule.condition.diagnoses as string[]) ?? [];
      const required = (rule.condition.requiredLabs as string[]) ?? [];
      const matchedDiag = diagHits.some((d) => includesKeyword(diagnoses, d));
      if (!matchedDiag) break;
      const orderedLabNames = orders.filter((o) => o.category === 'lab').map((o) => o.name);
      for (const lab of required) {
        const done =
          recentLabs.some((r) => includesKeyword([r], lab)) ||
          orderedLabNames.some((r) => includesKeyword([r], lab));
        if (!done) {
          push(
            `诊断「${diagHits.join('/')}」路径上的关键检验「${lab}」尚未开具。`,
            `建议补开 ${lab}，作为诊断与疗效基线。`,
            [...diagHits, lab],
            `miss:${lab}`,
          );
        }
      }
      break;
    }
    // —— 多查（短期已做） ——
    case 'lab_redundant': {
      for (const o of orders.filter((x) => x.category === 'lab')) {
        if (recentLabs.some((r) => normalize(r) === normalize(o.name))) {
          push(
            `检验「${o.name}」近期已完成，无病情变化不建议短期内重复。`,
            '如确有病情变化需复查，请在备注中写明指征。',
            [o.orderId, o.name],
            `redun:${o.name}`,
          );
        }
      }
      break;
    }
    // —— 红旗症状 ——
    case 'dx_red_flag': {
      const all = (rule.condition.all as string[]) ?? [];
      const any = (rule.condition.any as string[]) ?? [];
      const allHit = all.every((s) => symptoms.includes(s));
      const anyHit = any.some((s) => symptoms.includes(s));
      if (allHit && anyHit) {
        push(
          `症状组合（${all.join('+')} 伴 ${any.filter((s) => symptoms.includes(s)).join('/')}）符合红旗表现。`,
          '立即启动急诊/上级医师评估，勿按普通门诊流程处理。',
          all,
          'redflag:chest',
        );
      }
      break;
    }
    // —— 鉴别诊断 ——
    case 'dx_differential': {
      const symAny = (rule.condition.symptomsAny as string[]) ?? [];
      const candidates = (rule.condition.candidates as string[]) ?? [];
      if (symAny.some((s) => symptoms.includes(s))) {
        push(
          `症状不典型，建议鉴别诊断纳入：${candidates.join('、')}。`,
          '在现病史中补充鉴别依据，必要时安排排查检验。',
          candidates,
          'diff:fevercough',
        );
      }
      break;
    }
    // —— 指南推荐未落地 ——
    case 'tx_guideline': {
      const diagHits = (rule.condition.diagnoses as string[]) ?? [];
      const expected = (rule.condition.expectedDrugs as string[]) ?? [];
      const matchedDiag = diagHits.some((d) => includesKeyword(diagnoses, d));
      if (!matchedDiag) break;
      const current = new Set([...drugOrders.map((o) => normalize(o.name)), ...activeDrugs.map(normalize)]);
      const covered = expected.some((e) => current.has(normalize(e)));
      if (!covered) {
        push(
          `诊断「${diagHits.join('/')}」指南首选方案（${expected.join('/')}）当前未使用。`,
          '评估禁忌后优先选用指南推荐药品，避免路径偏离扣分。',
          [...diagHits, ...expected],
          `guide:${diagHits.join('')}`,
        );
      }
      break;
    }
    default:
      // 其余子类（时机/罕见病/路径偏离/并发症）占位目录，本期按不命中处理
      break;
  }

  return out;
}

/**
 * evaluateCDSSRules —— 对患者上下文逐条求规则，返回原始告警列表（未排序未合并）。
 */
export function evaluateCDSSRules(
  patientContext: CDSSPatientContext,
  rules: CDSSRule[],
  orderContext: CDSSOrderContext = { orders: [] },
): CDSSAlert[] {
  if (!patientContext) throw badRequest('patientContext 不能为空');
  const list = Array.isArray(rules) ? rules : [];
  const orders = Array.isArray(orderContext?.orders) ? orderContext.orders : [];
  const alerts: CDSSAlert[] = [];
  for (const rule of list) {
    alerts.push(...evaluateRule(rule, patientContext, orders));
  }
  return alerts;
}

/* ------------------------------------------------------------------ */
/* 3) prioritizeCDSSAlerts —— 排序 + 同优先级去重合并 + 超量压制（纯函数） */
/* ------------------------------------------------------------------ */

/**
 * 告警疲劳治理核心：
 *   1. 按 红>橙>黄>蓝 排序；
 *   2. 同优先级 + 同 dedupKey 合并为一条（relatedTo 并集，mergedCount 计数）；
 *   3. 合并后超过 CDSS_MAX_SURFACE_ALERTS 时，排在后面的低优先级告警被压制，
 *      只计数不弹窗——医生一次看到的永远是最该先处理的那几条。
 */
export function prioritizeCDSSAlerts(alerts: CDSSAlert[]): CDSSAlertBundle {
  const list = Array.isArray(alerts) ? alerts : [];

  const byPriority: Record<CDSSPriority, number> = { red: 0, orange: 0, yellow: 0, blue: 0 };
  for (const a of list) byPriority[a.priority] += 1;

  // 1) 排序：优先级升序（红=0 在前）；同优先级按 alertId 稳定
  const sorted = [...list].sort((x, y) => {
    const d = PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority];
    return d !== 0 ? d : x.alertId.localeCompare(y.alertId);
  });

  // 2) 同优先级 + 同 dedupKey 合并
  const merged: CDSSAlert[] = [];
  const mergeIndex = new Map<string, number>();
  for (const a of sorted) {
    const key = `${a.priority}::${a.dedupKey}`;
    const idx = mergeIndex.get(key);
    if (idx === undefined) {
      mergeIndex.set(key, merged.length);
      merged.push({ ...a, relatedTo: [...a.relatedTo] });
    } else {
      const target = merged[idx]!;
      target.mergedCount += 1;
      for (const r of a.relatedTo) {
        if (!target.relatedTo.includes(r)) target.relatedTo.push(r);
      }
    }
  }

  // 3) 超量压制：只弹窗前 N 条，其余计入 suppressedCount
  const surface = merged.slice(0, CDSS_MAX_SURFACE_ALERTS);
  const suppressedCount = merged.length - surface.length;

  return { alerts: surface, suppressedCount, byPriority };
}

/* ------------------------------------------------------------------ */
/* 4) trackCDSSAdoption —— 医生处置闭环（纯函数）                        */
/* ------------------------------------------------------------------ */

/**
 * trackCDSSAdoption —— 把医生对某条告警的处置落为一条采纳记录。
 * accepted/overridden/escalated 视为有效闭环；dismissed（忽略）不算闭环，
 * 用于运营看板计算「告警忽略率」，反向淘汰低质规则。
 */
export function trackCDSSAdoption(alertId: string, action: CDSSAdoptionAction): CDSSAdoptionRecord {
  if (!alertId || typeof alertId !== 'string') {
    throw badRequest('alertId 为必填项');
  }
  const valid: CDSSAdoptionAction[] = ['accepted', 'overridden', 'dismissed', 'escalated'];
  if (!valid.includes(action)) {
    throw badRequest(`action 必须是 ${valid.join('/')} 之一`);
  }
  return {
    alertId,
    action,
    actedAt: new Date().toISOString(),
    acknowledged: action !== 'dismissed',
  };
}
