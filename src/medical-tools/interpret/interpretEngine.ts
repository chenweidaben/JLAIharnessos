/**
 * 健澜科技 jlmedaios - 检查检验 AI 解读纯函数规则引擎（M12-A）
 *
 * 无 I/O、确定性：
 *  - interpretLabResults：迁移自 M3-E 的异常/危急值规则识别（HH/LL/H/L/N、严格边界、文本降级）；
 *  - computeTrends：按 item_code 做确定性趋势对比（数学在代码内完成，LLM 只加叙述）；
 *  - buildLabPrompt / buildImagingPrompt：构造 system + user 消息（含医疗安全约束）；
 *  - safeParseLlmJson：防御性解析模型输出并按视角做形状校验，失败抛 LlmShapeError。
 *
 * 医疗安全红线：AI 仅辅助，不做确定性诊断、不自主出报告；患者端不建议自行用药/停药、
 * 不做虚假保证，并给出紧急就医提示。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { LabResultRow } from '../../db/repositories/labInterpretRepo.js';

export type Audience = 'doctor' | 'patient';
export type DeepSource = 'rule' | 'llm' | 'llm_fallback';
export type LlmStatus = 'llm_ok' | 'llm_not_configured' | 'llm_error' | 'rule_only';
export type InterpretMode = 'auto' | 'rule' | 'llm';

export function asAudience(v: unknown): Audience {
  return v === 'patient' ? 'patient' : 'doctor';
}

export function asMode(v: unknown): InterpretMode {
  return v === 'rule' || v === 'llm' ? v : 'auto';
}

/* ============================ 一、规则识别（确定性） ============================ */

export interface EngineOutcome {
  itemCount: number;
  abnormalCount: number;
  criticalCount: number;
  summary: string;
  abnormalItems: Record<string, unknown>[];
  criticalItems: Record<string, unknown>[];
}

const CRITICAL_FLAGS = new Set(['HH', 'LL']);
const ABNORMAL_FLAGS = new Set(['H', 'L', 'HH', 'LL']);

/** 纯函数：根据就诊检验结果生成解读草稿（确定性，无外部依赖）。迁移自 M3-E。 */
export function interpretLabResults(results: LabResultRow[]): EngineOutcome {
  const abnormalItems: Record<string, unknown>[] = [];
  const criticalItems: Record<string, unknown>[] = [];

  for (const r of results) {
    let flag = (r.abnormalFlag ?? 'N').toUpperCase();
    // 若未给标志但有数值与参考区间，则自行判定（严格边界：等于区间内不算异常）
    if ((flag === 'N' || !flag) && r.numericValue != null) {
      const v = Number(r.numericValue);
      const lo = r.refLow != null ? Number(r.refLow) : null;
      const hi = r.refHigh != null ? Number(r.refHigh) : null;
      if (hi != null && v > hi) flag = 'H';
      else if (lo != null && v < lo) flag = 'L';
    }
    if (!ABNORMAL_FLAGS.has(flag)) continue;

    const item = {
      item: r.itemName,
      code: r.itemCode,
      value: r.value,
      unit: r.unit,
      refLow: r.refLow,
      refHigh: r.refHigh,
      flag,
    };
    abnormalItems.push(item);
    if (CRITICAL_FLAGS.has(flag) || r.isCritical) {
      criticalItems.push(item);
    }
  }

  const n = results.length;
  const abn = abnormalItems.length;
  const crit = criticalItems.length;

  const parts: string[] = [];
  parts.push(`共 ${n} 项检验，异常 ${abn} 项，其中危急值 ${crit} 项。`);
  if (crit > 0) {
    const names = criticalItems.map((c) => `${c.item}(${c.value}${c.unit ?? ''})`).join('、');
    parts.push(`危急项：${names}，建议立即复核临床并通知开单医师。`);
  } else if (abn > 0) {
    const names = abnormalItems.map((c) => `${c.item}(${c.flag})`).join('、');
    parts.push(`异常项：${names}。`);
  } else {
    parts.push('未见明显异常。');
  }
  parts.push('本结论由本地规则引擎自动生成，仅供参考，须经医师复核签名后方可采信。');

  return {
    itemCount: n,
    abnormalCount: abn,
    criticalCount: crit,
    summary: parts.join(''),
    abnormalItems,
    criticalItems,
  };
}

/** 契约命名别名：规则引擎产出。 */
export const buildLabEngineOutcome = interpretLabResults;

/* ============================ 二、确定性趋势对比 ============================ */

export type TrendDirection = 'rising' | 'falling' | 'stable' | 'no_history';

export interface TrendSourceRow {
  itemCode: string | null;
  itemName: string;
  numericValue: string | number | null;
  unit: string | null;
  resultTime: string | null;
}

export interface TrendPoint {
  code: string | null;
  name: string;
  previous: number | null;
  current: number;
  unit: string | null;
  delta: number | null;
  pct: number | null;
  direction: TrendDirection;
  resultTime: string | null;
}

export interface TrendOpts {
  /** 稳定阈值（百分比绝对值），默认 5。 */
  stablePct?: number;
}

function toNum(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 确定性趋势：对每个当前数值项，按 item_code 取该患者最近一次更早的历史结果做对比。
 * 数学全部在本函数内完成；LLM 只负责把趋势写成自然语言叙述，不参与计算。
 */
export function computeTrends(
  history: TrendSourceRow[],
  current: LabResultRow[],
  opts: TrendOpts = {},
): TrendPoint[] {
  const stablePct = opts.stablePct ?? 5;
  const points: TrendPoint[] = [];

  for (const cur of current) {
    const curVal = toNum(cur.numericValue);
    if (curVal == null || !cur.itemCode) continue;

    // 该项目、早于本次、最近一次的历史结果
    let previous: TrendSourceRow | null = null;
    for (const h of history) {
      if (!h.itemCode || h.itemCode !== cur.itemCode) continue;
      if (!h.resultTime || !cur.resultTime) continue;
      if (h.resultTime >= cur.resultTime) continue;
      if (!previous || (h.resultTime as string) > (previous.resultTime as string)) previous = h;
    }

    const prevVal = previous ? toNum(previous.numericValue) : null;

    if (prevVal == null) {
      points.push({
        code: cur.itemCode,
        name: cur.itemName,
        previous: null,
        current: curVal,
        unit: cur.unit,
        delta: null,
        pct: null,
        direction: 'no_history',
        resultTime: cur.resultTime,
      });
      continue;
    }

    const delta = curVal - prevVal;
    // previous=0 时 pct 无意义，置 null，方向退化为按 delta 判定
    const pct = prevVal !== 0 ? (delta / Math.abs(prevVal)) * 100 : null;
    let direction: TrendDirection;
    if (pct == null) {
      direction = delta > 0 ? 'rising' : delta < 0 ? 'falling' : 'stable';
    } else if (Math.abs(pct) <= stablePct) {
      direction = 'stable';
    } else {
      direction = pct > 0 ? 'rising' : 'falling';
    }
    const roundedPct = pct == null ? null : Math.round(pct * 100) / 100;

    points.push({
      code: cur.itemCode,
      name: cur.itemName,
      previous: prevVal,
      current: curVal,
      unit: cur.unit,
      delta: Math.round(delta * 10000) / 10000,
      pct: roundedPct,
      direction,
      resultTime: cur.resultTime,
    });
  }

  return points;
}

/* ============================ 三、Prompt 构造（纯函数） ============================ */

/** 患者端安全约束（同时写进 prompt 与形状校验语义）。 */
export const PATIENT_SAFETY_RULES = [
  '你正在面向患者本人解读检查结果，语气须通俗、温和、避免制造恐慌。',
  '严禁给出确定性诊断（不得说"你得了某病"），只能描述"可能与……有关""需要医生进一步确认"。',
  '严禁建议患者自行用药、停药、加量或改变治疗方案，一切用药调整须遵医嘱。',
  '严禁做虚假保证（不得说"肯定没事""一定是良性的"）。',
  '若出现危急值或需紧急处理的征象，必须明确提示"请立即前往医院/急诊就医"。',
] as const;

export interface LabPromptInput {
  patientLabel: string;
  department: string;
  ruleSummary: string;
  abnormalItems: Record<string, unknown>[];
  criticalItems: Record<string, unknown>[];
  trends: TrendPoint[];
}

export const LAB_LLM_JSON_KEYS = {
  doctor: [
    'overallImpression',
    'itemExplanations',
    'recommendations',
    'plainLanguageSummary',
  ],
  patient: ['plainLanguageSummary', 'recommendations', 'overallImpression'],
} as const;

function labSystem(audience: Audience): string {
  const base = [
    '你是杭州健澜科技 jlmedaios 医院智能体系统中的检验结果解读助手，服务于严谨的临床医师。',
    '仅依据用户提供的、来自医院真实数据库的检验结果与确定性趋势做解释；不得编造不存在的数值、诊断或药品。',
    '你输出的是"AI 辅助解读草稿"，不是诊断结论，须经医师复核签名后方可归档。',
    '必须严格输出一个 JSON 对象，不要输出任何解释或 markdown 正文，键固定为：',
  ];
  if (audience === 'patient') {
    base.push(...PATIENT_SAFETY_RULES);
    base.push(JSON.stringify(['plainLanguageSummary', 'recommendations', 'overallImpression']));
    base.push('plainLanguageSummary 为面向患者的通俗总结（字符串）；overallImpression 为温和的方向性提示（字符串，不得确诊）；recommendations 为数组，元素形如 {"level":"high|medium|low","text":"..."}。');
  } else {
    base.push(JSON.stringify(['overallImpression', 'itemExplanations', 'recommendations', 'plainLanguageSummary']));
    base.push('overallImpression 为医生端整体印象（参考方向，非确诊，字符串）；itemExplanations 为逐项解释数组，元素形如 {"code":"...","item":"...","meaning":"..."}；recommendations 为分级建议数组，元素形如 {"level":"high|medium|low","text":"..."}；plainLanguageSummary 为可向患者转述的通俗版（字符串）。');
  }
  return base.join('\n');
}

export function buildLabPrompt(input: LabPromptInput, audience: Audience): { system: string; user: string } {
  const user = [
    `就诊科室：${input.department}`,
    input.patientLabel ? `患者：${input.patientLabel}` : '',
    `规则引擎结论：${input.ruleSummary}`,
    `异常项：${JSON.stringify(input.abnormalItems)}`,
    `危急项：${JSON.stringify(input.criticalItems)}`,
    `确定性趋势（已由系统计算，仅据此叙述，不要重新计算）：${JSON.stringify(input.trends)}`,
    audience === 'patient'
      ? '请面向患者本人输出通俗解读，并遵守安全约束。'
      : '请输出医生端结构化解读。',
  ]
    .filter(Boolean)
    .join('\n');
  return { system: labSystem(audience), user };
}

export interface ImagingPromptInput {
  patientLabel: string;
  department: string;
  modality: string | null;
  examName: string;
  bodyPart: string | null;
  findings: string | null;
  impression: string | null;
}

export const IMAGING_LLM_JSON_KEYS = {
  doctor: ['explainedFindings', 'overallDirection', 'recommendations', 'plainLanguageSummary'],
  patient: ['plainLanguageSummary', 'recommendations', 'overallDirection'],
} as const;

function imagingSystem(audience: Audience): string {
  const base = [
    '你是杭州健澜科技 jlmedaios 医院智能体系统中的影像报告解读助手。',
    '仅依据用户提供的、来自医院已发布影像报告的所见与印象做解释；不得编造影像征象或诊断。',
    '你输出的是"AI 辅助解读草稿"，不是诊断结论，须经医师复核签名后方可归档。',
    '必须严格输出一个 JSON 对象，不要输出任何解释或 markdown 正文。',
  ];
  if (audience === 'patient') {
    base.push(...PATIENT_SAFETY_RULES);
    base.push('键固定为：', JSON.stringify(['plainLanguageSummary', 'recommendations', 'overallDirection']));
    base.push('overallDirection 为温和的方向性提示（不得确诊）；recommendations 元素形如 {"level":"high|medium|low","text":"..."}。');
  } else {
    base.push('键固定为：', JSON.stringify(['explainedFindings', 'overallDirection', 'recommendations', 'plainLanguageSummary']));
    base.push('explainedFindings 为逐项影像所见解释数组，元素形如 {"finding":"...","explanation":"..."}；overallDirection 为可能方向（非诊断）；recommendations 为分级建议数组；plainLanguageSummary 为患者通俗版。');
  }
  return base.join('\n');
}

export function buildImagingPrompt(
  input: ImagingPromptInput,
  audience: Audience,
): { system: string; user: string } {
  const user = [
    `科室：${input.department}`,
    input.patientLabel ? `患者：${input.patientLabel}` : '',
    `检查方式：${input.modality ?? '未注明'} / ${input.examName}${input.bodyPart ? ' / ' + input.bodyPart : ''}`,
    `报告所见：${input.findings ?? '（无）'}`,
    `报告印象：${input.impression ?? '（无）'}`,
    audience === 'patient' ? '请面向患者本人输出通俗解读，并遵守安全约束。' : '请输出医生端结构化解读。',
  ]
    .filter(Boolean)
    .join('\n');
  return { system: imagingSystem(audience), user };
}

/* ============================ 四、防御性 JSON 解析与形状校验 ============================ */

export class LlmShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmShapeError';
  }
}

/** 从可能被 ```json 包裹的模型输出中提取 JSON 对象文本。 */
export function extractJsonText(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new LlmShapeError('模型输出中未找到 JSON 对象');
  return text.slice(start, end + 1);
}

/** 形状约束：required 列出必需键与期望类型。 */
export interface ShapeField {
  key: string;
  type: 'string' | 'array';
}

/** 防御性解析：去围栏、取首尾花括号、按视角校验必需字段；缺失/类型不符抛 LlmShapeError。 */
export function safeParseLlmJson(raw: string, required: ShapeField[]): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(raw));
  } catch (err) {
    if (err instanceof LlmShapeError) throw err;
    throw new LlmShapeError('模型输出无法解析为结构化 JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new LlmShapeError('模型输出不是 JSON 对象');
  }
  const obj = parsed as Record<string, unknown>;
  for (const f of required) {
    const v = obj[f.key];
    if (v == null) throw new LlmShapeError(`缺少必需字段 ${f.key}`);
    if (f.type === 'string') {
      if (typeof v !== 'string') throw new LlmShapeError(`字段 ${f.key} 不是字符串`);
    } else if (f.type === 'array') {
      if (!Array.isArray(v)) throw new LlmShapeError(`字段 ${f.key} 不是数组`);
    }
  }
  return obj;
}

/* ------------------------- 五、按视角的类型化解构 ------------------------- */

export interface LabLlmOutput {
  overallImpression: string;
  itemExplanations: Record<string, unknown>[];
  recommendations: { level: string; text: string }[];
  plainLanguageSummary: string;
}

function asRecs(v: unknown): { level: string; text: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      level: typeof x.level === 'string' ? x.level : 'medium',
      text: typeof x.text === 'string' ? x.text : '',
    }))
    .filter((x) => x.text.length > 0);
}

export function parseLabLlmOutput(raw: string, audience: Audience): LabLlmOutput {
  const required: ShapeField[] =
    audience === 'patient'
      ? [{ key: 'plainLanguageSummary', type: 'string' }, { key: 'recommendations', type: 'array' }]
      : [
          { key: 'overallImpression', type: 'string' },
          { key: 'itemExplanations', type: 'array' },
          { key: 'recommendations', type: 'array' },
          { key: 'plainLanguageSummary', type: 'string' },
        ];
  const obj = safeParseLlmJson(raw, required);
  return {
    overallImpression: typeof obj.overallImpression === 'string' ? obj.overallImpression : '',
    itemExplanations: Array.isArray(obj.itemExplanations) ? (obj.itemExplanations as Record<string, unknown>[]) : [],
    recommendations: asRecs(obj.recommendations),
    plainLanguageSummary: typeof obj.plainLanguageSummary === 'string' ? obj.plainLanguageSummary : '',
  };
}

export interface ImagingLlmOutput {
  explainedFindings: Record<string, unknown>[];
  overallDirection: string;
  recommendations: { level: string; text: string }[];
  plainLanguageSummary: string;
}

export function parseImagingLlmOutput(raw: string, audience: Audience): ImagingLlmOutput {
  const required: ShapeField[] =
    audience === 'patient'
      ? [{ key: 'plainLanguageSummary', type: 'string' }, { key: 'recommendations', type: 'array' }]
      : [
          { key: 'explainedFindings', type: 'array' },
          { key: 'overallDirection', type: 'string' },
          { key: 'recommendations', type: 'array' },
          { key: 'plainLanguageSummary', type: 'string' },
        ];
  const obj = safeParseLlmJson(raw, required);
  return {
    explainedFindings: Array.isArray(obj.explainedFindings)
      ? (obj.explainedFindings as Record<string, unknown>[])
      : [],
    overallDirection: typeof obj.overallDirection === 'string' ? obj.overallDirection : '',
    recommendations: asRecs(obj.recommendations),
    plainLanguageSummary: typeof obj.plainLanguageSummary === 'string' ? obj.plainLanguageSummary : '',
  };
}
