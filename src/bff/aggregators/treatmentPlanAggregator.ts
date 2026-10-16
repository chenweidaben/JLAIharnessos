/**
 * 健澜科技 jlmedaios - AI 治疗方案推荐 · 个体化用药聚合器（M161-C）「AI核心能力深化」
 *
 * 治疗方案要个体化，不能一刀切。本模块在指南首选（一线）基础上，按患者年龄、体重、
 * 肝肾功能、孕哺与合并用药，输出可留痕、可解释的个体化方案骨架，并给出：
 *  - 一线治疗（指南首选）/ 备选方案（不耐受 / 禁忌替代）；
 *  - 药物剂量（按年龄 / 体重 / 肝肾功能调整后的推荐单次剂量）；
 *  - 药物相互作用（在用用药与新药之间的冲突检查）；
 *  - 疗程与复查（疗程周数、复查节点与复查项目）。
 *
 * 纯函数约定：generateTreatmentPlan / adjustDose / checkDrugInteraction /
 * compareTreatmentOptions 均无 I/O、无 DB、无网络，对非法输入安全降级。
 * 内置指南库为演示与单测用轻量子集（四病种），生产环境应替换为权威临床指南与
 * 药品说明书知识库——【远期深化】接入可热更新的指南/药学知识库与药物代谢动力学
 * （PK）参数库，实现按药品个体清除率的精准剂量。
 * 最终用药决定由医师与药师共同作出（人在回路），本模块不拦截处方、不改变审核状态。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型契约（纯数据）
// ---------------------------------------------------------------------------

/** 患者个体化特征：剂量调整与方案比选的输入 */
export interface PatientFeatures {
  /** 年龄（岁） */
  age?: number | null;
  /** 体重（kg） */
  weightKg?: number | null;
  /** 性别 */
  gender?: 'male' | 'female' | string | null;
  /** 估算肾小球滤过率 eGFR（mL/min/1.73m²），肾功能指标 */
  egfr?: number | null;
  /** 肝功能损害分级：0=正常 1=轻度 2=中度 3=重度 */
  hepaticImpairment?: 0 | 1 | 2 | 3 | null;
  /** 是否妊娠/哺乳 */
  pregnant?: boolean | null;
  /** 过敏药物通用名 */
  allergies?: string[];
  /** 合并症（通用名/疾病名） */
  comorbidities?: string[];
}

/** 指南给出的标准（成人）给药剂量 */
export interface RegimenDrug {
  drug: string;
  /** 成人标准单次剂量 mg */
  perDoseMg: number;
  /** 每日给药次数 */
  dosesPerDay: number;
  /** 用法备注（如 qn 睡前） */
  note?: string;
}

/** 备选方案：因不耐受/禁忌触发的替代用药 */
export interface AlternativeRegimen {
  /** 触发原因：不耐受表现 / 禁忌情形 */
  reason: string;
  drugs: RegimenDrug[];
}

/** 单病种指南条目 */
export interface GuidelineEntry {
  diagnosis: string;
  guideline: string;
  icd10: string;
  /** 一线治疗（指南首选） */
  firstLine: RegimenDrug[];
  /** 备选方案（不耐受/禁忌替代） */
  alternatives: AlternativeRegimen[];
  /** 推荐疗程（周） */
  courseWeeks: number;
  /** 首次复查间隔（周） */
  followUpWeeks: number;
  /** 复查项目 */
  followUpItems: string[];
}

/** 指南库：按诊断（键，大小写/空白不敏感匹配）索引 */
export type GuidelineLibrary = Record<string, GuidelineEntry>;

/** 治疗方案骨架（指南对齐、未做个体化剂量前） */
export interface TreatmentPlan {
  patientId: string;
  diagnosis: string;
  /** 是否在指南库中命中 */
  matched: boolean;
  guideline?: string;
  icd10?: string;
  firstLine: RegimenDrug[];
  alternatives: AlternativeRegimen[];
  courseWeeks?: number;
  followUpWeeks?: number;
  followUpItems: string[];
  disclaimer: string;
}

/** 剂量调整结果 */
export interface AdjustedDose {
  drug: string;
  /** 成人标准单次剂量 mg */
  originalPerDoseMg: number;
  /** 个体化推荐单次剂量 mg */
  adjustedPerDoseMg: number;
  dosesPerDay: number;
  /** 综合调整系数 */
  factor: number;
  /** 是否因禁忌应停用 */
  contraindicated: boolean;
  /** 调整/停用理由（可留痕） */
  reasons: string[];
}

/** 相互作用检查结果 */
export interface InteractionFinding {
  level: 'high' | 'medium' | 'low';
  drugA: string;
  drugB: string;
  title: string;
  advice: string;
}

/** 可比较的治疗选项 */
export interface TreatmentOption {
  id: string;
  name: string;
  drugs: string[];
  /** 预期有效率（0-100，越高越好） */
  efficacy: number;
  /** 不良反应风险（0-100，越低越好） */
  sideEffectRisk: number;
  /** 肾毒性负担（0-100，越低越好；eGFR 低者应优先低肾毒选项） */
  renalToxicity: number;
  /** 相对费用指数（0-100，越低越省） */
  cost: number;
}

/** 两方案比选结论 */
export interface OptionComparison {
  recommended: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  winner: string;
  reasons: string[];
  tradeoff: string;
}

// ---------------------------------------------------------------------------
// 内置轻量指南库（演示/单测；生产期替换为权威指南知识库——远期深化）
// ---------------------------------------------------------------------------

/** 妊娠期/备孕禁用的药物通用名（强致畸或经证实的胎儿风险） */
const TERATOGENIC_DRUGS = ['甲氨蝶呤', '华法林', '阿托伐他汀', '辛伐他汀', '利巴韦林'];

/** 内置相互作用规则表：[药A, 药B, 级别, 标题, 建议] */
const INTERACTION_RULES: Array<[string, string, InteractionFinding['level'], string, string]> = [
  ['华法林', '阿司匹林', 'high', '华法林 + 阿司匹林：出血风险叠加', '联用显著升高消化道/颅内出血风险，需心内科/药师评估抗栓强度，必要时降级单药。'],
  ['依那普利', '螺内酯', 'high', 'ACEI + 保钾利尿剂：高钾血症', '联用易致高钾血症，需密切监测血钾，肾功能不全者慎用或换用噻嗪类。'],
  ['辛伐他汀', '克拉霉素', 'high', '辛伐他汀 + 克拉霉素：横纹肌溶解风险', '大环内酯类抑制 CYP3A4 升高他汀血药浓度，抗感染期暂停他汀或换用普伐他汀。'],
  ['阿奇霉素', '华法林', 'medium', '阿奇霉素可能增强华法林抗凝', '联用需加密监测 INR，必要时下调华法林剂量。'],
  ['氨氯地平', '辛伐他汀', 'medium', '氨氯地平升高他汀暴露', '联用建议辛伐他汀日剂量≤20mg，监测肌痛。'],
  ['阿司匹林', '布洛芬', 'low', '布洛芬削弱阿司匹林抗血小板作用', '避免二者同服；如需镇痛优先对乙酰氨基酚，并错开服药时间。'],
];

/** 内置指南库（四病种，演示用） */
export const DEFAULT_GUIDELINE_LIBRARY: GuidelineLibrary = {
  高血压: {
    diagnosis: '高血压',
    guideline: '中国高血压防治指南 2024',
    icd10: 'I10',
    firstLine: [
      { drug: '氨氯地平', perDoseMg: 5, dosesPerDay: 1, note: 'qd' },
      { drug: '依那普利', perDoseMg: 10, dosesPerDay: 2, note: 'bid' },
    ],
    alternatives: [
      {
        reason: 'CCB 不耐受（踝部水肿）',
        drugs: [{ drug: '替米沙坦', perDoseMg: 40, dosesPerDay: 1, note: 'qd' }],
      },
      {
        reason: '妊娠/双侧肾动脉狭窄（ACEI/ARB 禁忌）',
        drugs: [{ drug: '拉贝洛尔', perDoseMg: 100, dosesPerDay: 2, note: 'bid' }],
      },
    ],
    courseWeeks: 4,
    followUpWeeks: 2,
    followUpItems: ['家庭血压日记', '坐位诊室血压', '电解质+肾功能'],
  },
  '2型糖尿病': {
    diagnosis: '2型糖尿病',
    guideline: '中国2型糖尿病防治指南 CDS 2024',
    icd10: 'E11',
    firstLine: [{ drug: '二甲双胍', perDoseMg: 500, dosesPerDay: 2, note: '随餐 bid' }],
    alternatives: [
      {
        reason: 'eGFR<45（二甲双胍需减量/停用）',
        drugs: [{ drug: '格列美脲', perDoseMg: 2, dosesPerDay: 1, note: 'qd 早餐前' }],
      },
      {
        reason: '合并心衰/ ASCVD（优先 SGLT2 抑制剂）',
        drugs: [{ drug: '达格列净', perDoseMg: 10, dosesPerDay: 1, note: 'qd' }],
      },
    ],
    courseWeeks: 12,
    followUpWeeks: 4,
    followUpItems: ['空腹/餐后血糖', 'HbA1c（每3月）', 'eGFR 与尿微量白蛋白'],
  },
  肺炎: {
    diagnosis: '社区获得性肺炎',
    guideline: 'IDSA/ATS 成人 CAP 指南 2019',
    icd10: 'J18.9',
    firstLine: [{ drug: '阿莫西林', perDoseMg: 500, dosesPerDay: 3, note: 'tid' }],
    alternatives: [
      {
        reason: '青霉素过敏',
        drugs: [{ drug: '阿奇霉素', perDoseMg: 500, dosesPerDay: 1, note: 'qd' }],
      },
    ],
    courseWeeks: 1,
    followUpWeeks: 2,
    followUpItems: ['体温/呼吸频率', '症状评估', '必要时复查胸部影像'],
  },
  冠心病: {
    diagnosis: '冠心病',
    guideline: 'ESC 慢性冠脉综合征指南 2024',
    icd10: 'I25',
    firstLine: [
      { drug: '阿司匹林', perDoseMg: 100, dosesPerDay: 1, note: 'qd' },
      { drug: '阿托伐他汀', perDoseMg: 20, dosesPerDay: 1, note: 'qn' },
    ],
    alternatives: [
      {
        reason: '阿司匹林不耐受（消化道出血/过敏）',
        drugs: [{ drug: '氯吡格雷', perDoseMg: 75, dosesPerDay: 1, note: 'qd' }],
      },
    ],
    courseWeeks: 24,
    followUpWeeks: 4,
    followUpItems: ['血脂（LDL-C）', '肝酶', '出血/肌痛症状评估'],
  },
};

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

/** 诊断键归一化：去空白、转小写，便于库索引匹配 */
function normKey(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/** 将剂量四舍五入到便于执行的整数（保留最小有效剂量） */
function roundDose(mg: number): number {
  return Math.max(1, Math.round(mg));
}

// ---------------------------------------------------------------------------
// 1. 治疗方案生成（指南对齐骨架）
// ---------------------------------------------------------------------------

/**
 * 按诊断在指南库中生成一线/备选方案骨架与疗程复查安排。
 * 纯函数：不做剂量个体化（交给 adjustDose），不做相互作用（交给 checkDrugInteraction），
 * 便于各能力独立测试与组合。patientId 仅回传，不参与计算。
 */
export function generateTreatmentPlan(
  patientId: string,
  diagnosis: string,
  guidelines: GuidelineLibrary,
): TreatmentPlan {
  const safeId = typeof patientId === 'string' && patientId.trim() ? patientId.trim() : 'UNKNOWN';
  const safeDx = typeof diagnosis === 'string' && diagnosis.trim() ? diagnosis.trim() : '';
  const entry = safeDx ? guidelines[normKey(safeDx)] : undefined;

  const disclaimer =
    '本方案为 AI 指南对齐辅助建议，最终诊断、选药与剂量须由执业医师结合患者实际确认（人在回路）。';

  if (!entry) {
    return {
      patientId: safeId,
      diagnosis: safeDx,
      matched: false,
      firstLine: [],
      alternatives: [],
      followUpItems: [],
      disclaimer,
    };
  }

  return {
    patientId: safeId,
    diagnosis: entry.diagnosis,
    matched: true,
    guideline: entry.guideline,
    icd10: entry.icd10,
    firstLine: entry.firstLine.map((d) => ({ ...d })),
    alternatives: entry.alternatives.map((a) => ({ reason: a.reason, drugs: a.drugs.map((d) => ({ ...d })) })),
    courseWeeks: entry.courseWeeks,
    followUpWeeks: entry.followUpWeeks,
    followUpItems: [...entry.followUpItems],
    disclaimer,
  };
}

// ---------------------------------------------------------------------------
// 2. 剂量个体化调整（年龄/体重/肝肾功能/孕哺）
// ---------------------------------------------------------------------------

/**
 * 按患者特征对单药标准剂量做个体化调整。
 * 规则为演示用通用减量策略——【远期深化】应替换为按药品清除途径（肾/肝/双通道）
 * 与 PK 参数的精准计算，并支持血药浓度（TDM）闭环。
 */
export function adjustDose(patientFeatures: PatientFeatures, baseDose: RegimenDrug): AdjustedDose {
  const f = patientFeatures ?? {};
  const reasons: string[] = [];
  let factor = 1;
  let contraindicated = false;

  const drug = typeof baseDose?.drug === 'string' ? baseDose.drug : '';
  const base = Number(baseDose?.perDoseMg);
  const perDose = Number.isFinite(base) && base > 0 ? base : 0;
  const dpd = Number(baseDose?.dosesPerDay);
  const dosesPerDay = Number.isFinite(dpd) && dpd > 0 ? Math.round(dpd) : 1;

  // 妊娠/备孕：致畸药直接停用
  if (f.pregnant && TERATOGENIC_DRUGS.includes(drug)) {
    contraindicated = true;
    reasons.push(`妊娠期禁用 ${drug}（明确胎儿风险），请改用妊娠安全替代药。`);
  }

  // 年龄：≥75 减量，≥85 再减
  const age = Number(f.age);
  if (Number.isFinite(age)) {
    if (age >= 85) {
      factor *= 0.5;
      reasons.push(`高龄（${age}岁）：起始剂量减半，警惕不良反应蓄积。`);
    } else if (age >= 75) {
      factor *= 0.75;
      reasons.push(`老年（${age}岁）：剂量下调约25%，加强监测。`);
    }
  }

  // 低体重：按 50kg 参考体重线性缩放
  const weight = Number(f.weightKg);
  if (Number.isFinite(weight) && weight > 0 && weight < 50) {
    const wf = weight / 50;
    factor *= wf;
    reasons.push(`低体重（${weight}kg）：按体重缩放系数 ${wf.toFixed(2)}。`);
  }

  // 肾功能（eGFR）
  const egfr = Number(f.egfr);
  if (Number.isFinite(egfr) && egfr > 0) {
    if (egfr < 30) {
      factor *= 0.5;
      reasons.push(`重度肾功能不全（eGFR ${egfr}）：剂量减半并避免肾毒药物。`);
    } else if (egfr < 50) {
      factor *= 0.75;
      reasons.push(`中度肾功能不全（eGFR ${egfr}）：剂量下调约25%。`);
    }
  }

  // 肝功能
  const hep = Number(f.hepaticImpairment ?? 0);
  if (hep >= 3) {
    factor *= 0.5;
    reasons.push('重度肝功能损害：剂量减半并优选肝肾双通道清除药物。');
  } else if (hep === 2) {
    factor *= 0.7;
    reasons.push('中度肝功能损害：剂量下调约30%。');
  }

  if (factor === 1 && reasons.length === 0) {
    reasons.push('患者特征无显著偏移，沿用指南标准剂量。');
  }

  return {
    drug,
    originalPerDoseMg: perDose,
    adjustedPerDoseMg: contraindicated ? 0 : roundDose(perDose * factor),
    dosesPerDay,
    factor: Number(factor.toFixed(3)),
    contraindicated,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// 3. 药物相互作用检查
// ---------------------------------------------------------------------------

/**
 * 检查「在用用药 currentMeds」与「拟新增药物 newMeds」之间的冲突。
 * 同时覆盖：在用×在用、在用×新增、新增×新增 三类组合。
 * 匹配为通用名归一化（去空白），规则表为内置子集——【远期深化】对接权威相互作用库。
 */
export function checkDrugInteraction(currentMeds: string[], newMeds: string[]): InteractionFinding[] {
  const norm = (s: unknown): string => (typeof s === 'string' ? s.replace(/\s+/g, '') : '');
  const current = (Array.isArray(currentMeds) ? currentMeds : []).map(norm).filter(Boolean);
  const next = (Array.isArray(newMeds) ? newMeds : []).map(norm).filter(Boolean);

  // 待检组合：在用×在用 + 在用×新增 + 新增×新增
  const pairs: Array<[string, string]> = [];
  const pushAll = (list: string[]) => {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) pairs.push([list[i], list[j]]);
    }
  };
  pushAll(current);
  for (const c of current) for (const n of next) pairs.push([c, n]);
  pushAll(next);

  const findings: InteractionFinding[] = [];
  for (const [a, b] of pairs) {
    for (const [ra, rb, level, title, advice] of INTERACTION_RULES) {
      const hit =
        (a === norm(ra) && b === norm(rb)) || (a === norm(rb) && b === norm(ra));
      if (hit) {
        findings.push({ level, drugA: ra, drugB: rb, title, advice });
      }
    }
  }

  // 按风险等级排序：high > medium > low
  const rank = { high: 0, medium: 1, low: 2 } as const;
  findings.sort((x, y) => rank[x.level] - rank[y.level]);
  return findings;
}

// ---------------------------------------------------------------------------
// 4. 治疗方案比选（一线 vs 备选 / 个体化偏好）
// ---------------------------------------------------------------------------

/**
 * 在两个治疗选项间，结合患者上下文（eGFR/高龄/孕哺）加权打分并给出推荐。
 * 评分=有效率×0.5 - 不良反应×0.2 - 费用×0.05，再按患者情况叠加惩罚项；
 * 仅输出推荐与可解释理由，不自动改医嘱。
 */
export function compareTreatmentOptions(
  optionA: TreatmentOption,
  optionB: TreatmentOption,
  patientContext: PatientFeatures,
): OptionComparison {
  const reasons: string[] = [];
  const ctx = patientContext ?? {};

  const score = (o: TreatmentOption): number => {
    let s = o.efficacy * 0.5 - o.sideEffectRisk * 0.2 - o.cost * 0.05;
    // 肾功能不全：肾毒性惩罚放大
    const egfr = Number(ctx.egfr);
    if (Number.isFinite(egfr) && egfr < 50) {
      s -= (o.renalToxicity / 100) * 20;
    }
    // 高龄：不良反应权重放大
    const age = Number(ctx.age);
    if (Number.isFinite(age) && age >= 75) {
      s -= (o.sideEffectRisk / 100) * 10;
    }
    return Number(s.toFixed(2));
  };

  const scoreA = score(optionA);
  const scoreB = score(optionB);
  const recommended: 'A' | 'B' = scoreA >= scoreB ? 'A' : 'B';
  const winner = recommended === 'A' ? optionA.name : optionB.name;
  const loser = recommended === 'A' ? optionB.name : optionA.name;

  const egfr = Number(ctx.egfr);
  if (Number.isFinite(egfr) && egfr < 50) {
    reasons.push(`患者 eGFR ${egfr}（<50）：优先低肾毒性选项，肾毒性负担被额外加权。`);
  }
  if (Number(ctx.age) >= 75) {
    reasons.push('患者高龄：优先不良反应风险更低的选项。');
  }
  if (ctx.pregnant) {
    reasons.push('患者妊娠：需人工复核致畸风险，比选结果仅作辅助。');
  }
  reasons.push(`综合得分 ${recommended === 'A' ? optionA.name : optionB.name}（${Math.max(scoreA, scoreB)}）高于 ${loser}（${Math.min(scoreA, scoreB)}）。`);

  return {
    recommended,
    scoreA,
    scoreB,
    winner,
    reasons,
    tradeoff: `推荐 ${winner}；若更看重费用/依从性，可结合 ${loser} 的获益-风险由医师最终裁定。`,
  };
}
