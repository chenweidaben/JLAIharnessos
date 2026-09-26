/**
 * 健澜科技 jlmedaios - 急诊分诊评分与分级（M1-B1）
 *
 * 医疗级、确定性、可单测的纯函数模块。包含：
 *  - NEWS2（英国皇家医师学会国家早期预警评分，标准量表 1）；
 *  - GCS（格拉斯哥昏迷量表，E/V/M + 总分，3–15）；
 *  - 卒中量表：FAST（面/臂/语/时间）+ LAMS（洛杉矶运动量表，0–5，LVO 筛查）；
 *  - 主诉关键词分级 + 客观体征规则分级（规则引擎给出确定性基线）；
 *  - 分诊综合评分（生命体征分 + 主诉分 + 疼痛加分）。
 *
 * 严谨性：
 *  - 最终分级由分诊护士确认；AI 仅给建议。本模块的规则引擎不依赖 AI，
 *    即使 AI 不可用也能给出可解释的建议级别与依据；
 *  - 客观危急体征“就高不就低”，避免漏判濒危患者。
 *
 * 依据：急诊预检分诊专家共识（2018）四级分诊；Royal College of Physicians
 *   NEWS2（2017）；胸痛中心 D-to-B≤90min、卒中中心 D-to-CT≤25min / D-to-N≤60min。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

/* ============================== 类型 ============================== */

/** 简化意识（ACVPU 中的 A/V/P/U；C 混淆并入 verbal 处理） */
export type Consciousness = 'alert' | 'verbal' | 'pain' | 'unresponsive';

/** 分诊生命体征入参（均可选，缺失不参与判分） */
export interface TriageVitals {
  temperature?: number | null; // 体温 ℃
  pulse?: number | null; // 脉搏 次/分
  respiration?: number | null; // 呼吸 次/分
  systolic?: number | null; // 收缩压 mmHg
  diastolic?: number | null; // 舒张压 mmHg
  spo2?: number | null; // 血氧饱和度 %
  consciousness?: Consciousness | null;
  painScore?: number | null; // NRS 0–10
  supplementalO2?: boolean | null; // 是否吸氧
}

/** GCS 分项 */
export interface GcsComponents {
  eye: number; // 1–4
  verbal: number; // 1–5
  motor: number; // 1–6
}

/** 卒中量表入参 */
export interface StrokeScaleInput {
  fastFace?: boolean | null; // 口角歪斜
  fastArm?: boolean | null; // 单侧肢体无力
  fastSpeech?: boolean | null; // 言语不清
  lamsFace?: number | null; // 0–1
  lamsArm?: number | null; // 0–2
  lamsGrip?: number | null; // 0–2
}

/** 完整分诊评估入参 */
export interface TriageAssessmentInput {
  vitals: TriageVitals;
  gcs?: GcsComponents | null;
  stroke?: StrokeScaleInput | null;
  chiefComplaint?: string | null;
  /** 明确的心搏/呼吸骤停、CPR 中（最高优先级） */
  cardiacArrest?: boolean | null;
  /** 明确的严重创伤/大出血等灾难体征 */
  catastrophe?: boolean | null;
}

/** 分诊级别 1–4 */
export type TriageLevel = 1 | 2 | 3 | 4;

/* ============================== NEWS2 ============================== */

export interface News2Result {
  score: number;
  /** 各项得分（便于展示与解释） */
  breakdown: Record<string, number>;
  /** 临床风险分层 */
  risk: 'low' | 'medium' | 'high';
  /** 是否存在单项 3 分（NEWS2 规定需升级响应） */
  singleParameterThree: boolean;
}

/**
 * NEWS2 标准量表 1 评分。
 * 参考 RCP NEWS2 标准决策表。
 */
export function news2(v: TriageVitals): News2Result {
  const breakdown: Record<string, number> = {
    respiration: 0,
    spo2: 0,
    o2: 0,
    temperature: 0,
    systolic: 0,
    pulse: 0,
    consciousness: 0,
  };

  // 呼吸频率
  const r = v.respiration;
  if (r != null) {
    if (r <= 8) breakdown.respiration = 3;
    else if (r <= 11) breakdown.respiration = 1;
    else if (r <= 20) breakdown.respiration = 0;
    else if (r <= 24) breakdown.respiration = 2;
    else breakdown.respiration = 3;
  }

  // 血氧饱和度（量表 1）
  const s = v.spo2;
  if (s != null) {
    if (s <= 91) breakdown.spo2 = 3;
    else if (s <= 93) breakdown.spo2 = 2;
    else if (s <= 95) breakdown.spo2 = 1;
    else breakdown.spo2 = 0;
  }

  // 是否吸氧
  if (v.supplementalO2) breakdown.o2 = 2;

  // 体温
  const t = v.temperature;
  if (t != null) {
    if (t <= 35.0) breakdown.temperature = 3;
    else if (t <= 36.0) breakdown.temperature = 1;
    else if (t <= 38.0) breakdown.temperature = 0;
    else if (t <= 39.0) breakdown.temperature = 1;
    else breakdown.temperature = 2;
  }

  // 收缩压
  const sbp = v.systolic;
  if (sbp != null) {
    if (sbp <= 90) breakdown.systolic = 3;
    else if (sbp <= 100) breakdown.systolic = 2;
    else if (sbp <= 110) breakdown.systolic = 1;
    else if (sbp <= 219) breakdown.systolic = 0;
    else breakdown.systolic = 3;
  }

  // 心率
  const p = v.pulse;
  if (p != null) {
    if (p <= 40) breakdown.pulse = 3;
    else if (p <= 50) breakdown.pulse = 1;
    else if (p <= 90) breakdown.pulse = 0;
    else if (p <= 110) breakdown.pulse = 1;
    else if (p <= 130) breakdown.pulse = 2;
    else breakdown.pulse = 3;
  }

  // 意识（A=0；C/V/P/U 均为 3）
  if (v.consciousness && v.consciousness !== 'alert') breakdown.consciousness = 3;

  const values = Object.values(breakdown);
  const score = values.reduce((a, b) => a + b, 0);
  const singleParameterThree = values.includes(3);
  const risk: News2Result['risk'] =
    score >= 7 ? 'high' : score >= 5 || singleParameterThree ? 'medium' : 'low';

  return { score, breakdown, risk, singleParameterThree };
}

/* =============================== GCS =============================== */

export type GcsSeverity = 'severe' | 'moderate' | 'mild';

export interface GcsResult {
  total: number;
  eye: number;
  verbal: number;
  motor: number;
  severity: GcsSeverity;
}

/** 由 E/V/M 计算 GCS 总分与严重程度 */
export function gcs(c: GcsComponents): GcsResult {
  const eye = clamp(Math.round(c.eye), 1, 4);
  const verbal = clamp(Math.round(c.verbal), 1, 5);
  const motor = clamp(Math.round(c.motor), 1, 6);
  const total = eye + verbal + motor;
  const severity: GcsSeverity = total <= 8 ? 'severe' : total <= 12 ? 'moderate' : 'mild';
  return { total, eye, verbal, motor, severity };
}

/**
 * 由简化意识推断默认 GCS 分项（当未单独采集 E/V/M 时的合理缺省）。
 * 仅用于缺省估算，精确分级应以实际 GCS 评分为准。
 */
export function defaultGcsFromConsciousness(c: Consciousness | null | undefined): GcsResult {
  switch (c) {
    case 'unresponsive':
      return gcs({ eye: 1, verbal: 1, motor: 2 }); // 6 分，重度
    case 'pain':
      return gcs({ eye: 2, verbal: 2, motor: 4 }); // 8 分，重度临界
    case 'verbal':
      return gcs({ eye: 3, verbal: 3, motor: 6 }); // 12 分，中度
    case 'alert':
    default:
      return gcs({ eye: 4, verbal: 5, motor: 6 }); // 15 分，正常
  }
}

/* ============================ 卒中量表 ============================= */

export interface LamsResult {
  total: number;
  face: number;
  arm: number;
  grip: number;
  /** 大血管闭塞（LVO）可能性 */
  lvoLikelihood: 'high' | 'possible' | 'low';
}

/** LAMS 洛杉矶运动量表（0–5），≥4 高度提示 LVO */
export function lams(input: StrokeScaleInput): LamsResult {
  const face = clampNum(input.lamsFace, 0, 1);
  const arm = clampNum(input.lamsArm, 0, 2);
  const grip = clampNum(input.lamsGrip, 0, 2);
  const total = face + arm + grip;
  const lvoLikelihood: LamsResult['lvoLikelihood'] =
    total >= 4 ? 'high' : total >= 1 ? 'possible' : 'low';
  return { total, face, arm, grip, lvoLikelihood };
}

export interface FastResult {
  face: boolean;
  arm: boolean;
  speech: boolean;
  /** 任一阳性 → 疑似卒中 */
  positive: boolean;
}

/** FAST 卒中初筛 */
export function fast(input: StrokeScaleInput): FastResult {
  const face = input.fastFace === true;
  const arm = input.fastArm === true;
  const speech = input.fastSpeech === true;
  return { face, arm, speech, positive: face || arm || speech };
}

/* ======================== 主诉关键词分级 =========================== */

/** 主诉关键词 → 级别（按严重程度分组，命中即返回该组级别） */
const COMPLAINT_KEYWORDS: Array<{ level: TriageLevel; words: string[] }> = [
  {
    level: 1,
    words: [
      '心跳骤停', '心搏骤停', '呼吸骤停', '骤停', '心肺复苏', 'cpr', '昏迷', '休克',
      '大咯血', '大呕血', '大出血', '持续抽搐', '抽搐不止', '溺水', '电击', '雷击',
      '重度烧伤', '窒息', '新生儿窒息', '紫绀', '全身发绀',
    ],
  },
  {
    level: 2,
    words: [
      '胸痛', '胸闷', '胸口痛', '呼吸困难', '喘憋', '喘不上气', '气促', '意识',
      '偏瘫', '半身不遂', '口角歪斜', '口角歪斜', '言语不清', '说话不清', '肢体无力',
      '严重过敏', '全身风团', '喉头紧', '喉头水肿', '呕血', '咯血', '便血',
      '剧烈腹痛', '腹痛剧烈', '癫痫', '孕妇出血', '阴道大量出血', '疑似中毒', '意识模糊',
    ],
  },
  {
    level: 3,
    words: [
      '高热', '高烧', '发热', '发烧', '呕吐', '腹泻', '腹痛', '头痛', '头晕',
      '外伤', '烫伤', '扭伤', '割伤', '少量出血', '尿痛', '腰痛', '胸闷(轻)',
    ],
  },
  {
    level: 4,
    words: [
      '感冒', '咳嗽', '咽痛', '喉咙痛', '鼻塞', '慢性病复诊', '复诊', '换药',
      '拆线', '轻微', '皮疹(轻)', '咨询', '开药',
    ],
  },
];

/** 由主诉关键词推断级别；无命中返回 4（就低，交由客观体征决定是否升级） */
export function complaintLevel(text: string | null | undefined): TriageLevel {
  if (!text) return 4;
  const q = text.toLowerCase();
  for (const group of COMPLAINT_KEYWORDS) {
    if (group.words.some((w) => q.includes(w.toLowerCase()))) return group.level;
  }
  return 4;
}

/* ========================= 规则引擎分级 ============================ */

export interface RuleLevelResult {
  level: TriageLevel;
  /** 命中的客观依据（用于生成分诊依据与解释） */
  objectiveReasons: string[];
  complaintLevel: TriageLevel;
}

/**
 * 规则引擎：由客观体征 + 主诉给出确定性建议级别（就高不就低）。
 * 不依赖 AI，是 AI 不可用时的安全基线。
 */
export function ruleSuggestedLevel(input: TriageAssessmentInput): RuleLevelResult {
  const v = input.vitals;
  const reasons: string[] = [];
  const n = news2(v);
  const cLevel = complaintLevel(input.chiefComplaint);

  // GCS（优先使用实测；否则由意识推断缺省）
  let g: GcsResult | null = null;
  if (input.gcs) g = gcs(input.gcs);
  else if (v.consciousness) g = defaultGcsFromConsciousness(v.consciousness);

  // 卒中量表
  const stroke = input.stroke ?? {};
  const f = fast(stroke);
  const l = lams(stroke);

  /* ---- Ⅰ级 濒危（立即） ---- */
  const level1: string[] = [];
  if (input.cardiacArrest) level1.push('心搏/呼吸骤停，CPR 中');
  if (v.spo2 != null && v.spo2 <= 85) level1.push(`SpO₂ ${v.spo2}%≤85%，严重低氧`);
  if (input.catastrophe) level1.push('严重创伤/大出血等灾难体征');
  if (g && g.total <= 6) level1.push(`GCS ${g.total}≤6，深昏迷`);
  if (g && g.total <= 8 && ((v.spo2 != null && v.spo2 <= 92) || (v.systolic != null && v.systolic <= 90))) {
    level1.push(`GCS ${g.total}≤8 合并低氧/低血压，生命体征不稳定`);
  }
  if (v.systolic != null && v.systolic <= 80 && v.consciousness && v.consciousness !== 'alert') {
    level1.push(`收缩压 ${v.systolic}≤80mmHg 合并意识障碍，休克`);
  }
  if (n.score >= 12) level1.push(`NEWS2 ${n.score}≥12，极端危重`);
  if (level1.length > 0) return { level: 1, objectiveReasons: level1, complaintLevel: cLevel };

  /* ---- Ⅱ级 危重（≤10min） ---- */
  const level2: string[] = [];
  if (n.score >= 7) level2.push(`NEWS2 ${n.score}≥7，高危`);
  if (g && g.total >= 9 && g.total <= 12) level2.push(`GCS ${g.total}，中度意识障碍`);
  if (l.total >= 4) level2.push(`LAMS ${l.total}≥4，高度提示大血管闭塞`);
  if (v.spo2 != null && v.spo2 <= 92) level2.push(`SpO₂ ${v.spo2}%，低氧`);
  if (v.systolic != null && v.systolic <= 90) level2.push(`收缩压 ${v.systolic}≤90mmHg，低血压`);
  if (v.consciousness && v.consciousness !== 'alert') {
    level2.push(`意识 ${consciousnessLabel(v.consciousness)}，非清醒`);
  }
  if (f.positive) level2.push('FAST 阳性，疑似急性卒中');
  if (level2.length > 0) {
    // 主诉若为 Ⅰ 级则就高
    if (cLevel === 1) return { level: 1, objectiveReasons: [`主诉提示濒危：${input.chiefComplaint}`], complaintLevel: cLevel };
    return { level: 2, objectiveReasons: level2, complaintLevel: cLevel };
  }

  /* ---- Ⅲ级 急症（≤30min） ---- */
  const level3: string[] = [];
  if (n.score >= 5) level3.push(`NEWS2 ${n.score}，中危`);
  if (g && g.total >= 13 && g.total <= 14) level3.push(`GCS ${g.total}，轻度意识改变`);
  if (v.temperature != null && v.temperature >= 39) level3.push(`体温 ${v.temperature}≥39℃，高热`);
  if (v.systolic != null && v.systolic <= 100) level3.push(`收缩压 ${v.systolic}≤100mmHg`);
  if (v.painScore != null && v.painScore >= 7) level3.push(`疼痛 NRS ${v.painScore}≥7，剧痛`);
  if (l.total >= 1) level3.push(`LAMS ${l.total}，需排查卒中`);
  if (cLevel === 3) level3.push('主诉提示急症');
  if (level3.length > 0) {
    if (cLevel <= 2) return { level: cLevel, objectiveReasons: [`主诉提示：${input.chiefComplaint}`], complaintLevel: cLevel };
    return { level: 3, objectiveReasons: level3, complaintLevel: cLevel };
  }

  /* ---- Ⅳ级 非急症（≤120min） ---- */
  return { level: cLevel === 4 ? 4 : cLevel, objectiveReasons: [], complaintLevel: cLevel };
}

/* ========================= 综合评分 ============================== */

/**
 * 生命体征评分（基线 4 分，异常加权；与分诊表展示一致）。
 */
export function vitalPoints(v: TriageVitals): number {
  let s = 4;
  if (v.spo2 != null) {
    if (v.spo2 < 90) s += 12;
    else if (v.spo2 < 94) s += 6;
  }
  if (v.systolic != null && v.systolic < 90) s += 12;
  if (v.temperature != null && v.temperature >= 39) s += 3;
  if (v.consciousness === 'unresponsive' || v.consciousness === 'pain') s += 14;
  else if (v.consciousness === 'verbal') s += 8;
  return s;
}

/** 主诉评分：Ⅰ=35 / Ⅱ=28 / Ⅲ=16 / Ⅳ=6 */
export function complaintPoints(level: TriageLevel): number {
  return level === 1 ? 35 : level === 2 ? 28 : level === 3 ? 16 : 6;
}

/** 疼痛加分：NRS≥7 +6；4–6 +3 */
export function painBonus(painScore: number | null | undefined): number {
  if (painScore == null) return 0;
  return painScore >= 7 ? 6 : painScore >= 4 ? 3 : 0;
}

/** 综合评分 */
export function totalPoints(v: TriageVitals, complaint: TriageLevel): number {
  return vitalPoints(v) + complaintPoints(complaint) + painBonus(v.painScore);
}

/* ========================= 完整评估 ============================== */

export interface TriageAssessment {
  news: News2Result;
  gcs: GcsResult | null;
  fast: FastResult;
  lams: LamsResult;
  rule: RuleLevelResult;
  vitalScore: number;
  complaintScore: number;
  totalScore: number;
}

/** 一次性计算全部分诊客观评估（供 BFF 落库与展示） */
export function assessTriage(input: TriageAssessmentInput): TriageAssessment {
  const v = input.vitals;
  const n = news2(v);
  const g = input.gcs
    ? gcs(input.gcs)
    : v.consciousness
      ? defaultGcsFromConsciousness(v.consciousness)
      : null;
  const stroke = input.stroke ?? {};
  const f = fast(stroke);
  const l = lams(stroke);
  const rule = ruleSuggestedLevel(input);
  const vitalScore = vitalPoints(v);
  const complaintScore = complaintPoints(rule.level);
  const totalScore = vitalScore + complaintScore + painBonus(v.painScore);
  return { news: n, gcs: g, fast: f, lams: l, rule, vitalScore, complaintScore, totalScore };
}

/* ============================= 辅助 =============================== */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function clampNum(n: number | null | undefined, lo: number, hi: number): number {
  if (n == null || Number.isNaN(Number(n))) return 0;
  return clamp(Number(n), lo, hi);
}

function consciousnessLabel(c: Consciousness): string {
  return c === 'alert' ? '清醒' : c === 'verbal' ? '声音反应' : c === 'pain' ? '疼痛反应' : '无反应';
}
