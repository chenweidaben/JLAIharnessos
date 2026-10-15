/**
 * ============================================================================
 * AI核心能力深化（M144-A）：AI 辅助诊断增强
 * ----------------------------------------------------------------------------
 * 门诊医生录入主诉/症状后，规则引擎输出：
 *   - Top3 可能诊断（带置信度，经年龄带 / 性别好发 / 既往病史修正）
 *   - 鉴别诊断
 *   - 建议检查
 *   - 治疗方向
 *
 * 医疗安全红线：
 *   - AI 只是建议，最终诊断决定权在执业医师；本模块不构成诊断结论；
 *   - 医生「采纳 / 修改 / 驳回」经 refineDiagnosis 全部留痕 feedback_log，
 *     回流用于模型优化与置信度校准（getDiagnosisAccuracy）。
 *
 * 纯函数约定：
 *   - aiDiagnose(symptoms, patientAge, patientGender, history) 确定性计算，
 *     无 I/O、无随机（仅 generatedAt 取当前时间）；
 *   - refineDiagnosis 将医生处置写入模块内内存留痕账本（生产由路由层落库，
 *     单测直接走内存账本，故命名为纯函数式副作用收敛点）；
 *   - getDiagnosisAccuracy(doctorId, period) 从留痕账本统计诊断准确率。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ========================================================================== */

/** 性别 */
export type Gender = 'male' | 'female' | '';

/** 单条症状 */
export interface AiSymptomInput {
  /** 症状名，如 胸痛 */
  name: string;
  /** 起病特点/时间描述（参与关键词匹配），如 压榨样、持续20分钟 */
  onset?: string;
}

/** 既往病史 */
export interface AiHistoryInput {
  chronicDiseases?: string[];
  surgeries?: string[];
  allergies?: string[];
  smoking?: boolean;
  notes?: string;
}

/** Top3 单个候选诊断 */
export interface AiCandidate {
  rank: number;
  diagnosis: string;
  icd10: string;
  /** 置信度 0~1，按降序 */
  confidence: number;
  /** 支持依据（命中的症状/年龄性别修正/病史） */
  evidence: string[];
}

/** 风险提示 */
export interface AiRiskWarning {
  level: 'critical' | 'high' | 'info';
  title: string;
  detail: string;
}

/** aiDiagnose 返回体 */
export interface Suggestion {
  /** 建议唯一标识（由输入确定性哈希生成，便于留痕关联） */
  suggestionId: string;
  /** Top3 可能诊断（带置信度） */
  topCandidates: AiCandidate[];
  /** 鉴别诊断 */
  differential: string[];
  /** 建议检查 */
  suggestedExams: string[];
  /** 治疗方向 */
  treatmentDirections: string[];
  /** 风险提示（红旗症状） */
  riskWarnings: AiRiskWarning[];
  generatedAt: string;
  /** 医疗免责声明 */
  disclaimer: string;
}

/** 医生处置反馈 */
export interface DiagnosisFeedback {
  doctorId: string;
  /** accepted=采纳AI Top1 / modified=采纳后修改 / rejected=驳回 */
  action: 'accepted' | 'modified' | 'rejected';
  /** 处置时间（ISO），单测可注入以驱动 period 统计 */
  timestamp?: string;
  /** 驳回/修改理由 */
  note?: string;
}

/** 诊断准确率统计 */
export interface DiagnosisAccuracyStats {
  doctorId: string;
  /** 留痕总数 */
  total: number;
  accepted: number;
  modified: number;
  rejected: number;
  /** 采纳率 = accepted/total */
  acceptanceRate: number;
  /** Top1 命中率 = 医生最终诊断与 AI Top1 一致数 / total */
  top1MatchRate: number;
  /** 采纳样本上的平均置信度 */
  avgConfidenceOnAccepted: number;
}

/* ---------------------------------------------------------------------------
 * 内置诊断规则库（启发式权重，非确诊；年龄带 / 性别好发作为置信度修正项）
 * ------------------------------------------------------------------------ */
interface AiRule {
  diagnosis: string;
  icd10: string;
  base: number;
  symptoms: Array<{ kw: string; weight: number; label: string }>;
  /** 年龄修正：落在 [minAge,maxAge] 内加权 */
  ageBand?: { minAge: number; maxAge: number; weight: number; label: string };
  /** 性别好发修正 */
  genderBias?: { gender: Exclude<Gender, ''>; weight: number; label: string };
  history: Array<{ kw: string; weight: number }>;
  exams: string[];
  treatment: string[];
}

const AI_DIAGNOSIS_RULES: AiRule[] = [
  {
    diagnosis: '冠心病（心绞痛）', icd10: 'I20.900', base: 0.1,
    symptoms: [
      { kw: '胸痛', weight: 0.5, label: '胸痛' },
      { kw: '胸闷', weight: 0.3, label: '胸闷' },
      { kw: '压榨', weight: 0.4, label: '压榨样疼痛' },
      { kw: '放射', weight: 0.35, label: '疼痛放射至肩背/下颌' },
    ],
    ageBand: { minAge: 45, maxAge: 150, weight: 0.2, label: '≥45 岁心血管高危带' },
    genderBias: { gender: 'male', weight: 0.12, label: '男性早发冠心病倾向' },
    history: [
      { kw: '高血压', weight: 0.15 }, { kw: '高血脂', weight: 0.12 },
      { kw: '糖尿病', weight: 0.12 }, { kw: '吸烟', weight: 0.1 },
    ],
    exams: ['12导联心电图', '肌钙蛋白(cTnI)定量', '心肌酶谱', '冠脉CTA'],
    treatment: ['休息+心电监护', '抗血小板（阿司匹林）', '扩冠（硝酸酯类）', '控制血压血脂血糖'],
  },
  {
    diagnosis: '急性上呼吸道感染', icd10: 'J06.900', base: 0.1,
    symptoms: [
      { kw: '发热', weight: 0.25, label: '发热' },
      { kw: '咽痛', weight: 0.4, label: '咽痛' },
      { kw: '咳嗽', weight: 0.2, label: '咳嗽' },
      { kw: '鼻塞', weight: 0.35, label: '鼻塞' },
      { kw: '流涕', weight: 0.35, label: '流涕' },
    ],
    ageBand: { minAge: 0, maxAge: 17, weight: 0.12, label: '儿童/青少年好发' },
    history: [],
    exams: ['血常规+CRP', '流感抗原检测（必要时）'],
    treatment: ['对症退热止痛', '多饮水休息', '合并细菌感染时再考虑抗生素'],
  },
  {
    diagnosis: '社区获得性肺炎', icd10: 'J18.900', base: 0.1,
    symptoms: [
      { kw: '发热', weight: 0.3, label: '发热' },
      { kw: '咳嗽', weight: 0.3, label: '咳嗽' },
      { kw: '咳痰', weight: 0.35, label: '咳痰' },
      { kw: '气促', weight: 0.35, label: '气促' },
      { kw: '胸痛', weight: 0.1, label: '胸膜性胸痛' },
    ],
    ageBand: { minAge: 65, maxAge: 150, weight: 0.12, label: '老年人肺炎高危' },
    history: [{ kw: 'COPD', weight: 0.15 }, { kw: '糖尿病', weight: 0.1 }],
    exams: ['胸部CT/胸片', '血常规+CRP+PCT', '痰培养+药敏', '动脉血气（重症）'],
    treatment: ['经验性抗感染', '氧疗与气道管理', '退热化痰对症'],
  },
  {
    diagnosis: '急性胃肠炎', icd10: 'K52.900', base: 0.1,
    symptoms: [
      { kw: '腹痛', weight: 0.3, label: '腹痛' },
      { kw: '腹泻', weight: 0.45, label: '腹泻' },
      { kw: '恶心', weight: 0.25, label: '恶心' },
      { kw: '呕吐', weight: 0.25, label: '呕吐' },
    ],
    history: [],
    exams: ['血常规', '便常规+潜血', '电解质（脱水评估）'],
    treatment: ['口服补液/静脉补液', '清淡饮食', '蒙脱石止泻（必要时）'],
  },
  {
    diagnosis: '2型糖尿病', icd10: 'E11.900', base: 0.1,
    symptoms: [
      { kw: '多饮', weight: 0.5, label: '多饮' },
      { kw: '多尿', weight: 0.5, label: '多尿' },
      { kw: '多食', weight: 0.3, label: '多食' },
      { kw: '消瘦', weight: 0.25, label: '近期消瘦' },
    ],
    ageBand: { minAge: 40, maxAge: 150, weight: 0.15, label: '≥40 岁代谢综合征带' },
    history: [{ kw: '糖尿病', weight: 0.2 }, { kw: '家族史', weight: 0.1 }],
    exams: ['空腹血糖+OGTT', '糖化血红蛋白HbA1c', '尿微量白蛋白/肌酐比'],
    treatment: ['生活方式干预', '口服降糖药/胰岛素', '血糖监测与并发症筛查'],
  },
  {
    diagnosis: '尿路感染', icd10: 'N39.000', base: 0.1,
    symptoms: [
      { kw: '尿频', weight: 0.5, label: '尿频' },
      { kw: '尿急', weight: 0.5, label: '尿急' },
      { kw: '尿痛', weight: 0.5, label: '尿痛' },
      { kw: '腰痛', weight: 0.15, label: '腰痛' },
    ],
    genderBias: { gender: 'female', weight: 0.18, label: '女性尿路感染好发' },
    history: [],
    exams: ['尿常规', '尿培养+药敏', '泌尿系超声（反复发作者）'],
    treatment: ['足量足疗程敏感抗生素', '多饮水', '复查尿常规'],
  },
  {
    diagnosis: '原发性高血压', icd10: 'I10.x00', base: 0.1,
    symptoms: [
      { kw: '头晕', weight: 0.35, label: '头晕' },
      { kw: '头痛', weight: 0.3, label: '头痛' },
      { kw: '头胀', weight: 0.25, label: '头胀' },
    ],
    ageBand: { minAge: 55, maxAge: 150, weight: 0.18, label: '≥55 岁高血压高发带' },
    history: [{ kw: '高血压', weight: 0.2 }, { kw: '家族史', weight: 0.1 }],
    exams: ['诊室血压+家庭血压监测', '心电图', '血脂血糖+肾功能', '尿微量白蛋白'],
    treatment: ['生活方式干预（限盐运动）', '规范降压药物', '靶器官保护'],
  },
  {
    diagnosis: '偏头痛', icd10: 'G43.900', base: 0.1,
    symptoms: [
      { kw: '头痛', weight: 0.3, label: '头痛' },
      { kw: '偏侧', weight: 0.45, label: '偏侧搏动性头痛' },
      { kw: '恶心', weight: 0.2, label: '恶心' },
      { kw: '畏光', weight: 0.3, label: '畏光畏声' },
    ],
    genderBias: { gender: 'female', weight: 0.15, label: '女性偏头痛好发' },
    history: [{ kw: '偏头痛', weight: 0.2 }],
    exams: ['头颅CT/MRI（排除器质性）', '经颅多普勒', '记录头痛日记'],
    treatment: ['急性期曲普坦类止痛', '避免诱因（睡眠/饮食）', '预防用药（频繁发作者）'],
  },
];

/** FNV-1a 32bit 哈希（小写）：把归一化输入压成确定性 suggestionId */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `diag_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 置信度映射：原始得分 → 0~1（封顶 0.95，避免规则引擎过度自信） */
function toConfidence(score: number): number {
  return round2(Math.min(0.95, 0.2 + score * 0.35));
}

/**
 * AI 辅助诊断建议（纯函数）。
 *
 * @param symptoms      主诉症状列表
 * @param patientAge    患者年龄（岁）
 * @param patientGender 患者性别
 * @param history       既往病史
 */
export function aiDiagnose(
  symptoms: AiSymptomInput[],
  patientAge: number,
  patientGender: Gender,
  history: AiHistoryInput = {},
): Suggestion {
  const symList = Array.isArray(symptoms) ? symptoms : [];
  const age = Number.isFinite(patientAge) ? Math.max(0, Math.floor(patientAge)) : 0;
  const gender: Gender = patientGender === 'male' || patientGender === 'female' ? patientGender : '';
  const hist = history ?? {};

  const symText = symList.map((s) => `${s?.name ?? ''} ${s?.onset ?? ''}`).join(' ').toLowerCase();
  const histText = [
    ...(hist.chronicDiseases ?? []), ...(hist.surgeries ?? []),
    ...(hist.allergies ?? []), hist.notes ?? '', hist.smoking ? '吸烟' : '',
  ].join(' ').toLowerCase();

  interface Scored {
    rule: AiRule;
    score: number;
    evidence: string[];
  }
  const scored: Scored[] = [];

  for (const rule of AI_DIAGNOSIS_RULES) {
    let score = rule.base;
    const evidence: string[] = [];

    for (const s of rule.symptoms) {
      if (symText.includes(s.kw)) {
        score += s.weight;
        evidence.push(`症状：${s.label}`);
      }
    }
    if (rule.ageBand && age >= rule.ageBand.minAge && age <= rule.ageBand.maxAge) {
      score += rule.ageBand.weight;
      evidence.push(`人群修正：${rule.ageBand.label}（${age}岁）`);
    }
    if (rule.genderBias && gender !== '' && rule.genderBias.gender === gender) {
      score += rule.genderBias.weight;
      evidence.push(`人群修正：${rule.genderBias.label}`);
    }
    for (const h of rule.history) {
      if (histText.includes(h.kw)) {
        score += h.weight;
        evidence.push(`病史：合并「${h.kw}」`);
      }
    }

    if (evidence.length > 0) scored.push({ rule, score, evidence });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  let topCandidates: AiCandidate[];
  if (top.length === 0) {
    topCandidates = [{
      rank: 1, diagnosis: '待查（信息不足）', icd10: 'R69.x00', confidence: 0.2,
      evidence: ['未命中任何诊断规则，建议补充主诉症状与既往病史'],
    }];
  } else {
    topCandidates = top.map((s, i) => ({
      rank: i + 1,
      diagnosis: s.rule.diagnosis,
      icd10: s.rule.icd10,
      confidence: toConfidence(s.score),
      evidence: s.evidence,
    }));
  }

  // 鉴别诊断：除 Top1 外的其余候选名 + Top1 规则库内易混淆项
  const differential = scored.slice(1, 4).map((s) => s.rule.diagnosis);
  // 建议检查 / 治疗方向：以 Top1 为主，合并 Top2/3 去重
  const suggestedExams: string[] = [];
  const treatmentDirections: string[] = [];
  for (const s of top) {
    for (const e of s.rule.exams) if (!suggestedExams.includes(e)) suggestedExams.push(e);
    for (const t of s.rule.treatment) if (!treatmentDirections.includes(t)) treatmentDirections.push(t);
  }

  // 红旗症状扫描（与具体规则解耦，独立提示）
  const riskWarnings: AiRiskWarning[] = [];
  const chestHighRisk = /胸痛|胸闷/.test(symText) && /大汗|濒死|压榨|放射|持续/.test(symText);
  const strokeRed = /偏瘫|偏身麻木|言语不清|口角歪斜/.test(symText);
  const bleedRed = /呕血|黑便|血便/.test(symText);
  const dyspneaRed = /呼吸困难|喘憋|发绀/.test(symText);
  if (chestHighRisk) {
    riskWarnings.push({ level: 'critical', title: '高危胸痛', detail: '伴大汗/濒死感/放射痛，警惕急性冠脉事件，立即急诊评估。' });
  }
  if (strokeRed) {
    riskWarnings.push({ level: 'critical', title: '脑卒中红旗症状', detail: '突发偏瘫/口角歪斜/言语不清，须立即急诊，把握时间窗。' });
  }
  if (bleedRed) {
    riskWarnings.push({ level: 'critical', title: '消化道出血征象', detail: '呕血/黑便提示上消化道出血，警惕失血性休克。' });
  }
  if (dyspneaRed) {
    riskWarnings.push({ level: 'high', title: '呼吸窘迫征象', detail: '呼吸困难/发绀，立即评估气道与氧合。' });
  }
  if (riskWarnings.length === 0) {
    riskWarnings.push({ level: 'info', title: '未识别到红旗症状', detail: '仍须以执业医师面诊查体为准。' });
  }

  const suggestionId = fnv1a(
    `${symText}|${age}|${gender}|${histText}`,
  );

  return {
    suggestionId,
    topCandidates,
    differential,
    suggestedExams,
    treatmentDirections,
    riskWarnings,
    generatedAt: new Date().toISOString(),
    disclaimer: '本建议由 AI 规则引擎生成，仅供参考，不构成诊断结论；最终诊断与处置须由执业医师结合病史、查体及辅助检查确定。',
  };
}

/* ---------------------------------------------------------------------------
 * 医生处置留痕账本（内存；生产由路由层同步落库 feedback_log）
 * ------------------------------------------------------------------------ */
interface FeedbackRecord {
  suggestionId: string;
  doctorId: string;
  action: DiagnosisFeedback['action'];
  aiTopDiagnosis: string;
  aiTopConfidence: number;
  finalDiagnosis: string;
  matchedTop1: boolean;
  timestamp: string;
}

const feedbackLedger: FeedbackRecord[] = [];

/** 清空留痕账本（仅单测使用，生产不调用） */
export function resetFeedbackLog(): void {
  feedbackLedger.length = 0;
}

/**
 * 医生对 AI 建议的处置留痕（采纳/修改/驳回）。
 * 纯函数式副作用收敛点：不抛错、不返回值，仅写入留痕账本用于模型优化。
 *
 * @param userDiagnosis 医生最终诊断
 * @param aiSuggestion  AI 生成的建议（取 Top1 做对照）
 * @param feedback      医生/动作/时间
 */
export function refineDiagnosis(
  userDiagnosis: string,
  aiSuggestion: Suggestion,
  feedback: DiagnosisFeedback,
): void {
  const top = aiSuggestion?.topCandidates?.[0];
  if (!top) return;
  const finalDiagnosis = (userDiagnosis ?? '').trim();
  // 医生采纳动作且未改诊断 → 视为与 AI Top1 一致；modified/rejected 以最终诊断名是否一致为准
  const matchedTop1 =
    feedback.action === 'accepted'
      ? true
      : finalDiagnosis !== '' && finalDiagnosis === top.diagnosis;

  feedbackLedger.push({
    suggestionId: aiSuggestion.suggestionId,
    doctorId: feedback.doctorId,
    action: feedback.action,
    aiTopDiagnosis: top.diagnosis,
    aiTopConfidence: top.confidence,
    finalDiagnosis,
    matchedTop1,
    timestamp: feedback.timestamp ?? new Date().toISOString(),
  });
}

/** 统计区间 */
export interface PeriodRange {
  from: string;
  to: string;
}

/**
 * 按医生 + 时间区间统计诊断准确率（从留痕账本读取）。
 *
 * @param doctorId 医生 ID
 * @param period   统计区间（ISO 起止）；不传则全量
 */
export function getDiagnosisAccuracy(
  doctorId: string,
  period?: PeriodRange,
): DiagnosisAccuracyStats {
  const from = period?.from ? new Date(period.from).getTime() : Number.NEGATIVE_INFINITY;
  const to = period?.to ? new Date(period.to).getTime() : Number.POSITIVE_INFINITY;

  const rows = feedbackLedger.filter((r) => {
    if (r.doctorId !== doctorId) return false;
    const t = new Date(r.timestamp).getTime();
    return t >= from && t <= to;
  });

  const total = rows.length;
  const accepted = rows.filter((r) => r.action === 'accepted').length;
  const modified = rows.filter((r) => r.action === 'modified').length;
  const rejected = rows.filter((r) => r.action === 'rejected').length;
  const matched = rows.filter((r) => r.matchedTop1).length;
  const acceptedRows = rows.filter((r) => r.action === 'accepted');
  const avgConfidenceOnAccepted = acceptedRows.length
    ? round2(acceptedRows.reduce((acc, r) => acc + r.aiTopConfidence, 0) / acceptedRows.length)
    : 0;

  return {
    doctorId,
    total,
    accepted,
    modified,
    rejected,
    acceptanceRate: total ? round2(accepted / total) : 0,
    top1MatchRate: total ? round2(matched / total) : 0,
    avgConfidenceOnAccepted,
  };
}
