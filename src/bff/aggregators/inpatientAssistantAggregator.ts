/**
 * 健澜科技 jlmedaios - 住院医生智能助手聚合器（M120-B）
 *   （依据宪法第七章：公民的人格尊严不受侵犯，医疗机构应当尊重患者并依法保护隐私）
 *
 * 纯函数核心（可单测、不触库、不依赖时钟）：
 *  - buildInpatientAssistant(doctorId, patientId, wardId, data)
 *      输入在院患者当日体征 / 检验 / 诊断 / 合并症 / 相似历史病例，
 *      输出 { trend, similarCases, riskAlert, suggestions }：
 *        trend        —— 病情走向（好转 / 平稳 / 恶化）一句话 + 最新关键体征；
 *        similarCases —— 院内相似历史病例 Top-N（脱敏院内号 + 转归 + 参考启示）；
 *        riskAlert    —— 风险分级（none/low/medium/high）+ 命中风险项 + 摘要；
 *        suggestions  —— 面向住院医生的下一步建议（按优先级排序，附证据）。
 *
 * 隐私：仅使用院内脱敏 patientId / 临床标签，不输出姓名 / 身份证号 / 床号明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 单个体征记录点 */
export interface AssistantVitalPoint {
  /** 记录时间（ISO 8601） */
  time: string;
  /** 体温（℃） */
  temperatureC?: number;
  /** 心率（次/分） */
  heartRate?: number;
  /** 收缩压（mmHg） */
  systolicBp?: number;
  /** 舒张压（mmHg） */
  diastolicBp?: number;
  /** 血氧饱和度（%） */
  spo2?: number;
  /** 呼吸频率（次/分） */
  respiratoryRate?: number;
}

/** 单次检验结果 */
export interface AssistantLab {
  /** 项目编码（WBC / K+ / CRP …） */
  code: string;
  /** 项目中文名 */
  name: string;
  /** 结果值 */
  value: number;
  /** 单位 */
  unit: string;
  /** 检验旗标：N 正常 / H 偏高 / L 偏低 / HH 危急高 / LL 危急低 */
  flag?: 'N' | 'H' | 'L' | 'HH' | 'LL';
}

/** 院内相似历史病例（输入侧，均为脱敏数据） */
export interface SimilarCaseInput {
  /** 脱敏院内 patientId */
  patientId: string;
  /** 主诊断 */
  diagnosis: string;
  /** 实际住院天数 */
  losDays: number;
  /** 转归 */
  outcome: 'improved' | 'unchanged' | 'deteriorated';
  /** 与当前患者的相似度（0~1，越大越像） */
  matchScore: number;
}

/** 聚合器入参：一名在院患者当日的全部上下文 */
export interface InpatientAssistantData {
  /** 主诊断文本 */
  diagnosis: string;
  /** 年龄（岁） */
  age: number;
  /** 合并症列表（如「高血压」「2 型糖尿病」） */
  comorbidities: string[];
  /** 当日体征序列（按时间可乱序，聚合器内部排序） */
  vitals: AssistantVitalPoint[];
  /** 当日检验结果 */
  labs: AssistantLab[];
  /** 院内相似历史病例 */
  similarCases: SimilarCaseInput[];
}

/* ----------------------------- 输出类型 ----------------------------- */

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';
export type TrendDirection = 'improving' | 'stable' | 'worsening';

export interface TrendOut {
  /** 病情走向 */
  direction: TrendDirection;
  /** 一句话病情摘要（面向住院医生） */
  summary: string;
  /** 最新关键体征快照 */
  keySigns: Array<{ label: string; value: string }>;
}

export interface SimilarCaseOut extends SimilarCaseInput {
  /** 面向当前医生的参考启示 */
  takeaway: string;
}

export interface RiskItem {
  /** 风险码：fever / tachycardia / hypotension / hypoxemia / tachypnea / criticalLab / abnormalLab */
  code: string;
  level: Exclude<RiskLevel, 'none'>;
  message: string;
}

export interface RiskAlertOut {
  level: RiskLevel;
  items: RiskItem[];
  /** 一句话风险摘要 */
  summary: string;
}

export interface Suggestion {
  type: 'order' | 'review' | 'monitor' | 'consult';
  priority: 'low' | 'medium' | 'high';
  text: string;
  /** 触发该建议的证据（可追溯到具体体征 / 检验 / 相似病例） */
  evidence: string;
}

export interface InpatientAssistantResult {
  trend: TrendOut;
  similarCases: SimilarCaseOut[];
  riskAlert: RiskAlertOut;
  suggestions: Suggestion[];
}

/* ----------------------------- 风险阈值 ----------------------------- */

const LEVEL_RANK: Record<RiskLevel, number> = { none: 0, low: 1, medium: 2, high: 3 };

function maxLevel(a: RiskLevel, b: Exclude<RiskLevel, 'none'>): Exclude<RiskLevel, 'none'> {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? (a as Exclude<RiskLevel, 'none'>) : b;
}

/** 扫描体征序列，输出命中的风险项（同类风险只保留最严重一档） */
function detectVitalRisks(vitals: AssistantVitalPoint[]): RiskItem[] {
  const items: RiskItem[] = [];
  if (vitals.length === 0) return items;

  const temps = vitals.map((v) => v.temperatureC).filter((n): n is number => typeof n === 'number');
  const hrs = vitals.map((v) => v.heartRate).filter((n): n is number => typeof n === 'number');
  const sbps = vitals.map((v) => v.systolicBp).filter((n): n is number => typeof n === 'number');
  const spos = vitals.map((v) => v.spo2).filter((n): n is number => typeof n === 'number');
  const rrs = vitals.map((v) => v.respiratoryRate).filter((n): n is number => typeof n === 'number');

  const maxTemp = Math.max(...temps);
  if (temps.length > 0 && maxTemp >= 38.5) {
    items.push({ code: 'fever', level: 'high', message: `高热 ${maxTemp.toFixed(1)}℃，存在脓毒症/感染加重风险` });
  } else if (temps.length > 0 && maxTemp >= 37.3) {
    items.push({ code: 'fever', level: 'medium', message: `低热 ${maxTemp.toFixed(1)}℃，需观察热型变化` });
  }

  const maxHr = Math.max(...hrs);
  if (hrs.length > 0 && maxHr >= 120) {
    items.push({ code: 'tachycardia', level: 'high', message: `心动过速 ${maxHr} 次/分，需排查心律失常/心衰/容量不足` });
  } else if (hrs.length > 0 && maxHr >= 100) {
    items.push({ code: 'tachycardia', level: 'medium', message: `心率偏快 ${maxHr} 次/分，持续关注` });
  }

  const minSbp = Math.min(...sbps);
  if (sbps.length > 0 && minSbp < 90) {
    items.push({ code: 'hypotension', level: 'high', message: `低血压 收缩压 ${minSbp} mmHg，存在灌注不足风险` });
  } else if (sbps.length > 0 && minSbp < 100) {
    items.push({ code: 'hypotension', level: 'medium', message: `血压偏低 收缩压 ${minSbp} mmHg，注意出入量` });
  }

  const minSpo2 = Math.min(...spos);
  if (spos.length > 0 && minSpo2 <= 90) {
    items.push({ code: 'hypoxemia', level: 'high', message: `低氧血症 SpO₂ ${minSpo2}%，需立即氧疗评估` });
  } else if (spos.length > 0 && minSpo2 <= 94) {
    items.push({ code: 'hypoxemia', level: 'medium', message: `血氧偏低 SpO₂ ${minSpo2}%，加强监测` });
  }

  const maxRr = Math.max(...rrs);
  if (rrs.length > 0 && maxRr >= 24) {
    items.push({ code: 'tachypnea', level: 'high', message: `呼吸急促 ${maxRr} 次/分，警惕呼吸功能恶化` });
  } else if (rrs.length > 0 && maxRr >= 20) {
    items.push({ code: 'tachypnea', level: 'medium', message: `呼吸偏快 ${maxRr} 次/分，观察辅助呼吸肌动用情况` });
  }

  return items;
}

/** 扫描检验结果，危急值 HH/LL 记 high，H/L 记 medium */
function detectLabRisks(labs: AssistantLab[]): RiskItem[] {
  const items: RiskItem[] = [];
  for (const lab of labs) {
    if (lab.flag === 'HH' || lab.flag === 'LL') {
      items.push({
        code: 'criticalLab',
        level: 'high',
        message: `危急值 ${lab.name}(${lab.code})=${lab.value}${lab.unit}，旗标 ${lab.flag}`,
      });
    } else if (lab.flag === 'H' || lab.flag === 'L') {
      items.push({
        code: 'abnormalLab',
        level: 'medium',
        message: `异常 ${lab.name}(${lab.code})=${lab.value}${lab.unit}，旗标 ${lab.flag}`,
      });
    }
  }
  return items;
}

/* ----------------------------- 病情走向 ----------------------------- */

function buildTrend(vitals: AssistantVitalPoint[], riskLevel: RiskLevel): TrendOut {
  const sorted = [...vitals].sort((a, b) => a.time.localeCompare(b.time));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  let improving = 0;
  let worsening = 0;
  if (first && last) {
    if (typeof first.temperatureC === 'number' && typeof last.temperatureC === 'number') {
      if (last.temperatureC < first.temperatureC - 0.3) improving += 1;
      else if (last.temperatureC > first.temperatureC + 0.3) worsening += 1;
    }
    if (typeof first.heartRate === 'number' && typeof last.heartRate === 'number') {
      if (last.heartRate < first.heartRate - 10) improving += 1;
      else if (last.heartRate > first.heartRate + 10) worsening += 1;
    }
    if (typeof first.systolicBp === 'number' && typeof last.systolicBp === 'number') {
      if (last.systolicBp > first.systolicBp + 10) improving += 1;
      else if (last.systolicBp < first.systolicBp - 10) worsening += 1;
    }
    if (typeof first.spo2 === 'number' && typeof last.spo2 === 'number') {
      if (last.spo2 > first.spo2 + 1) improving += 1;
      else if (last.spo2 < first.spo2 - 1) worsening += 1;
    }
  }

  let direction: TrendDirection;
  if (improving - worsening >= 2) direction = 'improving';
  else if (worsening - improving >= 2) direction = 'worsening';
  else direction = 'stable';

  // 高风险未解除时，不轻易宣称「好转」，避免误导住院医生
  if (riskLevel === 'high' && direction === 'improving') direction = 'stable';
  if (riskLevel === 'high' && direction === 'stable' && worsening > improving) direction = 'worsening';

  const summary =
    direction === 'improving'
      ? '生命体征较基线整体向好，炎症与循环指标趋于平稳，可按既定诊疗路径继续推进。'
      : direction === 'worsening'
        ? '生命体征出现恶化倾向，建议立即床旁评估并加强监护，必要时启动上级会诊。'
        : '生命体征近期未见明显波动，按既定方案观察，明日复查关键指标。';

  const keySigns: Array<{ label: string; value: string }> = [];
  if (last) {
    if (typeof last.temperatureC === 'number') keySigns.push({ label: '体温', value: `${last.temperatureC.toFixed(1)}℃` });
    if (typeof last.heartRate === 'number') keySigns.push({ label: '心率', value: `${last.heartRate} 次/分` });
    if (typeof last.systolicBp === 'number' && typeof last.diastolicBp === 'number') {
      keySigns.push({ label: '血压', value: `${last.systolicBp}/${last.diastolicBp} mmHg` });
    }
    if (typeof last.spo2 === 'number') keySigns.push({ label: 'SpO₂', value: `${last.spo2}%` });
    if (typeof last.respiratoryRate === 'number') keySigns.push({ label: '呼吸', value: `${last.respiratoryRate} 次/分` });
  }

  return { direction, summary, keySigns };
}

/* ----------------------------- 相似病例 ----------------------------- */

function takeawayFor(c: SimilarCaseInput): string {
  if (c.outcome === 'improved') {
    return `同类诊断好转出院（住院 ${c.losDays} 天），其诊疗路径可参考`;
  }
  if (c.outcome === 'unchanged') {
    return `同类诊断迁延（住院 ${c.losDays} 天仍未达出院标准），注意排查并发症与合并症`;
  }
  return `同类诊断曾恶化（住院 ${c.losDays} 天转归不佳），建议提前干预、避免重走弯路`;
}

function buildSimilarCases(cases: SimilarCaseInput[]): SimilarCaseOut[] {
  return [...cases]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3)
    .map((c) => ({ ...c, takeaway: takeawayFor(c) }));
}

/* ----------------------------- 建议生成 ----------------------------- */

const PRIORITY_RANK: Record<Suggestion['priority'], number> = { high: 0, medium: 1, low: 2 };
const TYPE_RANK: Record<Suggestion['type'], number> = { order: 0, consult: 1, review: 2, monitor: 3 };

function buildSuggestions(
  risks: RiskItem[],
  labs: AssistantLab[],
  similar: SimilarCaseOut[],
  input: Pick<InpatientAssistantData, 'age' | 'comorbidities'>,
): Suggestion[] {
  const out: Suggestion[] = [];
  const has = (code: string, level?: RiskItem['level']) =>
    risks.some((r) => r.code === code && (level === undefined || r.level === level));

  if (has('fever', 'high')) {
    out.push({ type: 'order', priority: 'high', text: '急查血常规+CRP+PCT，评估感染灶，启动物理/药物降温', evidence: '体温≥38.5℃（高热）' });
  } else if (has('fever', 'medium')) {
    out.push({ type: 'monitor', priority: 'medium', text: '持续监测体温 q4h，记录热型与伴随症状', evidence: '体温 37.3~38.4℃（低热）' });
  }

  if (has('tachycardia', 'high')) {
    out.push({ type: 'order', priority: 'high', text: '急查心电图+心肌酶，排查心律失常、心衰与低容量', evidence: '心率≥120 次/分' });
  }

  if (has('hypotension', 'high')) {
    out.push({ type: 'order', priority: 'high', text: '评估容量状态，记录尿量，必要时补液/升压并复查血气', evidence: '收缩压<90 mmHg（低血压）' });
  } else if (has('hypotension', 'medium')) {
    out.push({ type: 'monitor', priority: 'medium', text: '加强血压监测，关注出入量与末梢灌注', evidence: '收缩压 90~99 mmHg（血压偏低）' });
  }

  if (has('hypoxemia', 'high')) {
    out.push({ type: 'consult', priority: 'high', text: '立即氧疗并复查动脉血气，必要时请呼吸科会诊', evidence: 'SpO₂≤90%（低氧血症）' });
  } else if (has('hypoxemia', 'medium')) {
    out.push({ type: 'monitor', priority: 'medium', text: '持续 SpO₂ 监测，备吸氧装置与气道支持物品', evidence: 'SpO₂ 91~94%（血氧偏低）' });
  }

  if (has('tachypnea', 'high')) {
    out.push({ type: 'monitor', priority: 'high', text: '观察呼吸频率与辅助呼吸肌动用情况，警惕呼衰早期表现', evidence: '呼吸频率≥24 次/分' });
  }

  for (const lab of labs) {
    if (lab.flag === 'HH' || lab.flag === 'LL') {
      out.push({
        type: 'review',
        priority: 'high',
        text: `危急值 ${lab.name}=${lab.value}${lab.unit}，立即复核标本并电话告知上级医师`,
        evidence: `检验旗标 ${lab.flag}`,
      });
    } else if (lab.flag === 'H' || lab.flag === 'L') {
      out.push({
        type: 'review',
        priority: 'medium',
        text: `复查 ${lab.name}（${lab.code}），动态观察趋势`,
        evidence: `检验旗标 ${lab.flag}（${lab.value}${lab.unit}）`,
      });
    }
  }

  const deteriorated = similar.find((c) => c.outcome === 'deteriorated' && c.matchScore >= 0.6);
  if (deteriorated) {
    out.push({
      type: 'consult',
      priority: 'medium',
      text: '院内相似病例曾转归不佳，建议今日内安排上级查房讨论并提前调整方案',
      evidence: `相似病例 ${deteriorated.patientId}（相似度 ${(deteriorated.matchScore * 100).toFixed(0)}%）`,
    });
  }

  if (input.age >= 70) {
    out.push({ type: 'monitor', priority: 'low', text: '高龄患者，落实跌倒/压疮/深静脉血栓三级预防', evidence: `年龄 ${input.age} 岁` });
  }
  if (input.comorbidities.length > 2) {
    out.push({
      type: 'review',
      priority: 'low',
      text: `合并症较多（${input.comorbidities.length} 种），核对用药相互作用与肝肾功能负担`,
      evidence: `合并症：${input.comorbidities.join('、')}`,
    });
  }

  if (out.length === 0) {
    out.push({
      type: 'order',
      priority: 'low',
      text: '暂无紧急事项，按临床路径完成今日病程记录与医嘱，明日复查关键指标',
      evidence: '当日体征/检验均在安全范围',
    });
  }

  return out.sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || TYPE_RANK[a.type] - TYPE_RANK[b.type],
  );
}

/* ------------------------------- 主入口 ------------------------------- */

/**
 * 住院医生智能助手纯函数聚合。
 *
 * @param doctorId  当班住院医师 ID（审计留痕用，函数内不产生副作用）
 * @param patientId 院内脱敏 patientId（审计留痕用）
 * @param wardId    所在病区 ID（审计留痕用）
 * @param data      当日病情上下文（体征 / 检验 / 诊断 / 合并症 / 相似病例）
 * @returns         { trend, similarCases, riskAlert, suggestions }
 */
export function buildInpatientAssistant(
  doctorId: string,
  patientId: string,
  wardId: string,
  data: InpatientAssistantData,
): InpatientAssistantResult {
  // 审计上下文仅用于日志追踪，不进入业务返回体，避免泄漏医生/病区标识
  void doctorId;
  void patientId;
  void wardId;

  const vitalRisks = detectVitalRisks(data.vitals ?? []);
  const labRisks = detectLabRisks(data.labs ?? []);
  const items = [...vitalRisks, ...labRisks];

  const level: RiskLevel = items.reduce<RiskLevel>(
    (acc, it) => (LEVEL_RANK[it.level] > LEVEL_RANK[acc] ? it.level : acc),
    'none',
  );

  const riskAlert: RiskAlertOut = {
    level,
    items,
    summary:
      level === 'high'
        ? `共 ${items.length} 项高优先级风险，需立即处理。`
        : level === 'medium'
          ? `共 ${items.length} 项需关注的异常，建议当日内处置。`
          : level === 'low'
            ? '存在轻微异常，常规随访即可。'
            : '当日体征与检验未见明显异常。',
  };

  const trend = buildTrend(data.vitals ?? [], level);
  const similarCases = buildSimilarCases(data.similarCases ?? []);
  const suggestions = buildSuggestions(items, data.labs ?? [], similarCases, {
    age: data.age ?? 0,
    comorbidities: data.comorbidities ?? [],
  });

  return { trend, similarCases, riskAlert, suggestions };
}
