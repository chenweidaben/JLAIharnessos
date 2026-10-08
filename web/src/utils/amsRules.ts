/**
 * 健澜科技 jlmedaios - 抗菌药物管理（AMS）纯函数规则引擎（M14-A）
 *
 * 与后端 src/medical-tools/ams/amsRules.ts 严格同口径：纯函数、确定性、无 I/O、可单测。
 * 阈值/口径可追溯国家《抗菌药物临床应用指导原则》、WHO ATC/DDD；规则结果不可无依据改写。
 *
 * 医疗安全：本模块只产出"规则建议"，最终用药/点评判定由药师/医师签名确认。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type {
  AmxIssueCode,
  AtcLevel,
  PharmClass,
} from '@/types/ams';

/* ---------------------------------------------------------------------------
 * 分级序与字典
 * ------------------------------------------------------------------------ */

/** 分级序：非限制 0 < 限制 1 < 特殊 2；等级序 ≥ 药级序方可开具。 */
export const LEVEL_ORDER: Record<AtcLevel, number> = {
  unrestricted: 0,
  restricted: 1,
  special: 2,
};

export const ATC_LEVEL_LABEL: Record<AtcLevel, string> = {
  unrestricted: '非限制使用级',
  restricted: '限制使用级',
  special: '特殊使用级',
};

export const PHARM_CLASS_LABEL: Record<PharmClass, string> = {
  penicillins: '青霉素类',
  cephalosporin_1: '头孢菌素一代',
  cephalosporin_2: '头孢菌素二代',
  cephalosporin_3: '头孢菌素三代',
  cephalosporin_4: '头孢菌素四代',
  quinolones: '喹诺酮类',
  carbapenems: '碳青霉烯类',
  macrolides: '大环内酯类',
  glycopeptides: '糖肽类',
  nitroimidazole: '硝基咪唑类',
  other: '其他',
};

export const ISSUE_LABEL: Record<AmxIssueCode, string> = {
  no_indication: '无指征用药',
  wrong_choice: '选药不当',
  wrong_timing: '给药时机不当',
  wrong_duration: '疗程过长',
  overdose: '超剂量',
  overduration: '超疗程',
  duplicate: '重复用药',
  interaction: '配伍/相互作用',
  contraindication: '禁忌用药',
  no_culture: '特殊使用未送检',
};

/* ---------------------------------------------------------------------------
 * 处方权限（§2.1）
 * ------------------------------------------------------------------------ */

/**
 * 由职称推导默认可开最高分级。
 * 住院医师/resident → unrestricted；主治/attending → restricted；
 * 副主任/associate_chief、主任/chief → special；未知 → unrestricted（保守，须授权确认）。
 */
export function titleToMaxLevel(title: string | null | undefined): AtcLevel {
  const t = (title ?? '').trim().toLowerCase();
  if (!t) return 'unrestricted';
  if (t.includes('chief') || t.includes('主任')) return 'special';
  if (t.includes('associate') || t.includes('副主任')) return 'special';
  if (t.includes('attending') || t.includes('主治') || t.includes('主管医师')) return 'restricted';
  if (t.includes('resident') || t.includes('住院')) return 'unrestricted';
  return 'unrestricted';
}

/**
 * 医师可开最高分级：以 ams_prescriber_grants 授权为准；无授权记录则回退职称推导。
 */
export function prescriberMaxLevel(opts: {
  grantedLevel: AtcLevel | null | undefined;
  grantActive: boolean;
  title: string | null | undefined;
}): AtcLevel {
  if (opts.grantActive && opts.grantedLevel) return opts.grantedLevel;
  return titleToMaxLevel(opts.title);
}

/** 是否可开某分级：maxLevel 序 ≥ drugLevel 序才允许，否则越权。 */
export function canPrescribe(maxLevel: AtcLevel, drugLevel: AtcLevel): boolean {
  return LEVEL_ORDER[maxLevel] >= LEVEL_ORDER[drugLevel];
}

/* ---------------------------------------------------------------------------
 * 围术期预防用药点评（§2.2）
 * ------------------------------------------------------------------------ */

export interface PerioperativeInput {
  incisionClass: 'I' | 'II' | 'III' | 'IV';
  chosenClass: PharmClass;
  chosenIsSpecial: boolean;
  /** 给药相对切皮分钟（正 = 切皮前）。 */
  doseMinusIncisionMin: number;
  isCesarean: boolean;
  /** 断脐相对给药分钟（≥0 表示给药在断脐之后）。非剖宫产可为 null。 */
  cordClampMinusDoseMin: number | null;
  durationH: number;
  /** 污染/延长用药依据（如腹腔感染、植入物）。 */
  hasProlongReason: boolean;
  /** 厌氧菌高发部位（如结直肠/妇产科），加硝基咪唑合理。 */
  anaerobicSite: boolean;
}

export interface EvaluateResult {
  rational: boolean;
  issues: AmxIssueCode[];
  detail: Record<string, unknown>;
}

/** 切皮前给药窗口（分钟）：0.5–1h = [30,60]。 */
export const PREOP_TIMING_WINDOW_MIN = { min: 30, max: 60 } as const;
/** I 类切口常规疗程 24h，有延长依据可至 48h。 */
export const CLASS_I_DURATION_H = { base: 24, prolonged: 48 } as const;

/**
 * 围术期预防用药合理性（纯函数）。
 * - 选药：I 类首选一/二代头孢；无依据选用特殊使用级/碳青霉烯/糖肽类 => wrong_choice。
 * - 时机：非剖宫产切皮前 30–60min；剖宫产须断脐后给药；否则 wrong_timing。
 * - 疗程：I 类 ≤24h，有依据 ≤48h；>48h 或无依据 >24h => wrong_duration。
 */
export function evaluatePerioperative(input: PerioperativeInput): EvaluateResult {
  const issues: AmxIssueCode[] = [];
  const detail: Record<string, unknown> = {
    incisionClass: input.incisionClass,
    chosenClass: input.chosenClass,
    doseMinusIncisionMin: input.doseMinusIncisionMin,
    durationH: input.durationH,
  };

  // 选药
  const isRoutineCeph =
    input.chosenClass === 'cephalosporin_1' || input.chosenClass === 'cephalosporin_2';
  const isReserved =
    input.chosenIsSpecial ||
    input.chosenClass === 'carbapenems' ||
    input.chosenClass === 'glycopeptides' ||
    input.chosenClass === 'cephalosporin_3' ||
    input.chosenClass === 'cephalosporin_4';
  if (input.incisionClass === 'I' && !isRoutineCeph) {
    // I 类首选一/二代头孢；厌氧菌部位允许硝基咪唑联合（单药选了特殊药仍判不当）
    if (isReserved && !input.hasProlongReason) {
      issues.push('wrong_choice');
      detail.choiceNote = 'I 类切口无依据选用特殊使用级/高级抗菌药';
    }
  }
  if (input.anaerobicSite && input.chosenClass === 'nitroimidazole') {
    // 厌氧菌部位单用硝基咪唑可接受（联合方案的一部分），不判 wrong_choice
    detail.choiceNote = '厌氧菌部位用药';
  }

  // 时机
  if (input.isCesarean) {
    if (input.cordClampMinusDoseMin == null || input.cordClampMinusDoseMin < 0) {
      issues.push('wrong_timing');
      detail.timingNote = '剖宫产应在断脐后给药';
    }
  } else {
    if (
      input.doseMinusIncisionMin < PREOP_TIMING_WINDOW_MIN.min ||
      input.doseMinusIncisionMin > PREOP_TIMING_WINDOW_MIN.max
    ) {
      issues.push('wrong_timing');
      detail.timingNote = '应在切皮前 30–60min 给药';
    }
  }

  // 疗程
  if (input.incisionClass === 'I') {
    const limit = input.hasProlongReason
      ? CLASS_I_DURATION_H.prolonged
      : CLASS_I_DURATION_H.base;
    if (input.durationH > limit) {
      issues.push('wrong_duration');
      detail.durationNote = input.hasProlongReason
        ? 'I 类切口疗程不应超过 48h'
        : 'I 类切口预防用药通常不超过 24h';
    }
  }

  return { rational: issues.length === 0, issues, detail };
}

/* ---------------------------------------------------------------------------
 * 专项点评（§2.3）
 * ------------------------------------------------------------------------ */

export interface AntibioticUseInput {
  hasIndication: boolean;
  drugLevel: AtcLevel;
  /** 单次剂量（与 ddd 同单位）。 */
  dose: number;
  /** WHO DDD（同单位）。 */
  ddd: number;
  plannedDays: number;
  /** 治疗指南天数上限（外部传入，口径可追溯）。 */
  maxDays: number;
  /** 同 pharm_class 同时在用的药品数量（含当前药）。 */
  sameClassDrugs: number;
  /** 存在严重/禁忌级相互作用。 */
  severeInteraction: boolean;
  /** 存在禁忌。 */
  contraindication: boolean;
  /** 治疗前是否微生物送检。 */
  cultureSent: boolean;
}

/**
 * 治疗性抗菌药合理性专项点评（纯函数，问题可多选）。
 */
export function evaluateAntibioticUse(input: AntibioticUseInput): EvaluateResult {
  const issues: AmxIssueCode[] = [];
  const detail: Record<string, unknown> = {};

  if (!input.hasIndication) {
    issues.push('no_indication');
    detail.noIndication = true;
  }
  // 单次 > DDD 视为可疑超量
  if (input.ddd > 0 && input.dose > input.ddd) {
    issues.push('overdose');
    detail.overdose = { dose: input.dose, ddd: input.ddd };
  }
  if (input.plannedDays > input.maxDays) {
    issues.push('overduration');
    detail.overduration = { plannedDays: input.plannedDays, maxDays: input.maxDays };
  }
  if (input.sameClassDrugs >= 2) {
    issues.push('duplicate');
    detail.duplicate = { sameClassDrugs: input.sameClassDrugs };
  }
  if (input.severeInteraction) {
    issues.push('interaction');
    detail.interaction = true;
  }
  if (input.contraindication) {
    issues.push('contraindication');
    detail.contraindication = true;
  }
  // 特殊使用级治疗性使用须治疗前送检
  if (input.drugLevel === 'special' && !input.cultureSent) {
    issues.push('no_culture');
    detail.noCulture = true;
  }

  return { rational: issues.length === 0, issues, detail };
}

/* ---------------------------------------------------------------------------
 * DDD / AUD（§2.5）
 * ------------------------------------------------------------------------ */

/** DDDs = 用药总量 / DDD；ddd<=0 → null。 */
export function computeDdds(totalAmount: number, ddd: number): number | null {
  if (!ddd || ddd <= 0) return null;
  return totalAmount / ddd;
}

/** AUD = DDDs / 同期住院人天 × 100；patientDays<=0 → null。 */
export function computeAud(ddds: number, patientDays: number): number | null {
  if (!patientDays || patientDays <= 0) return null;
  return (ddds / patientDays) * 100;
}

/* ---------------------------------------------------------------------------
 * 质控指标（§2.6，含分子分母）
 * ------------------------------------------------------------------------ */

export interface AmxMetricCounts {
  outpatientAbxPrescriptions: number;
  outpatientTotalPrescriptions: number;
  inpatientAbxPatients: number;
  inpatientTotalPatients: number;
  totalDdds: number;
  specialDdds: number;
  inpatientPatientDays: number;
  classIProphylaxis: number;
  classITotal: number;
  timingAppropriate: number;
  perioperativeTotal: number;
  durationCompliant: number;
  cultureSentTherapeutic: number;
  therapeuticTotal: number;
}

function pct(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

/** 八项抗菌药质控指标（百分比口径，分母为 0 记 0，分子分母可核查）。 */
export function computeAmsMetrics(c: AmxMetricCounts): import('@/types/ams').AmxMetrics {
  const aud =
    c.inpatientPatientDays > 0
      ? Math.round((c.totalDdds / c.inpatientPatientDays) * 10000) / 100
      : 0;
  return {
    outpatientAbxRate: pct(c.outpatientAbxPrescriptions, c.outpatientTotalPrescriptions),
    inpatientAbxRate: pct(c.inpatientAbxPatients, c.inpatientTotalPatients),
    aud,
    classIProphylaxisRate: pct(c.classIProphylaxis, c.classITotal),
    timingAppropriateRate: pct(c.timingAppropriate, c.perioperativeTotal),
    durationComplianceRate: pct(c.durationCompliant, c.perioperativeTotal),
    specialShare: pct(c.specialDdds, c.totalDdds),
    cultureRate: pct(c.cultureSentTherapeutic, c.therapeuticTotal),
    fractions: {
      outpatientAbxRate: { numerator: c.outpatientAbxPrescriptions, denominator: c.outpatientTotalPrescriptions },
      inpatientAbxRate: { numerator: c.inpatientAbxPatients, denominator: c.inpatientTotalPatients },
      aud: { numerator: c.totalDdds, denominator: c.inpatientPatientDays },
      classIProphylaxisRate: { numerator: c.classIProphylaxis, denominator: c.classITotal },
      timingAppropriateRate: { numerator: c.timingAppropriate, denominator: c.perioperativeTotal },
      durationComplianceRate: { numerator: c.durationCompliant, denominator: c.perioperativeTotal },
      specialShare: { numerator: c.specialDdds, denominator: c.totalDdds },
      cultureRate: { numerator: c.cultureSentTherapeutic, denominator: c.therapeuticTotal },
    },
  };
}
