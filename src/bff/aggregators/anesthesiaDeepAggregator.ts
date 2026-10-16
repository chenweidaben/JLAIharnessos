/**
 * 健澜科技 jlmedaios - M176-C 医院手术麻醉管理深化聚合器
 *
 * 【临床核心深化】麻醉管理要真安全，不能走过场。在 61-surgery.sql 手术
 *   闭环之上，把麻醉从「有记录」升级为「术前风险可评、术中异常可警、
 *   术后恢复可追、麻醉质量可考」的四维安全闭环：
 *
 *   - buildDeepAnesthesiaMgmt() 纯函数：一次性产出深度麻醉管理看板所需的全部
 *     派生数据（术前评估汇总 / 术中监测台账 / 术后恢复台账 / 麻醉质量指标），
 *     内置演示手术台账，空库可演示，远期由 clinical.surgery_requests 新列回写。
 *   - assessAnesthesiaRisk(patient, surgery) 纯函数：按 ASA 分级 + 心功能 +
 *     肺功能 + 年龄 + 手术时长/出血风险 计算麻醉风险评分（0-100）与四级分层，
 *     给出必须整改项（如 ASA III+ 未查心超、重度肺功能未做肺康复）。
 *   - trackIntraopMonitoring(surgeryId, events) 纯函数：吃术中体征时间线，
 *     按阈值检出高危事件（MAP<60 / SpO2<95 / BIS<40 或 >60 / 出血量>血容量20%），
 *     返回事件计数、极值与告警清单——真安全=异常被看见。
 *   - evaluateAnesthesiaQuality(surgeryId, outcome) 纯函数：按麻醉并发症 /
 *     非计划二次插管 / 麻醉死亡 / PACU>120min / Aldrete<9 综合评级
 *     （excellent/good/fair/poor），并输出科室级质量指标率。
 *
 * 设计要点：
 *  - 四个函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用；
 *  - 内置演示台账与 deploy/postgres/init/354-anesthesia-deep.sql 扩展列对齐；
 *  - 所有阈值（MAP/SpO2/BIS/出血/血容量）为临床通用参考值，注释标注来源；
 *  - 患者仅输出脱敏标识（P-xxxx），不落姓名/身份证，符合隐私合规。
 *
 * 【远期】WebSocket 麻醉机/监护仪实时推流、历史病例自学习校准阈值、
 *   与 CDSS 联动自动开检查。本切片不做。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** ASA 体格状态分级 */
export type AsaGrade = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

/** 心 / 肺功能分级 */
export type OrganFunction = 'normal' | 'mild' | 'moderate' | 'severe';

/** 麻醉风险分层 */
export type AnesthesiaRiskLevel = 'low' | 'moderate' | 'high' | 'extreme';

/** 麻醉质量评级 */
export type AnesthesiaQualityGrade = 'excellent' | 'good' | 'fair' | 'poor';

/** 手术创伤/时长分级（影响出血与应激风险） */
export type SurgeryTrauma = 'minor' | 'intermediate' | 'major' | 'major_plus';

/** 患者输入（脱敏，供风险评估） */
export interface AnesthesiaPatient {
  /** 脱敏患者标识 P-xxxx */
  patientRef: string;
  age: number;
  /** 既往合并症：冠心病/心衰/慢阻肺/睡眠呼吸暂停/糖尿病/高血压... */
  comorbidities: string[];
  asaGrade: AsaGrade;
  cardiacFunction: OrganFunction;
  respiratoryFunction: OrganFunction;
}

/** 手术输入（供风险评估） */
export interface AnesthesiaSurgery {
  surgeryId: string;
  plannedProcedure: string;
  department: string;
  trauma: SurgeryTrauma;
  /** 预计手术时长（分钟） */
  plannedDurationMin: number;
  /** 预计出血量风险：低/中/高 */
  bloodLossRisk: 'low' | 'moderate' | 'high';
  emergency: boolean;
}

/** 单个体征采样点 */
export interface IntraopVitalPoint {
  /** 术中分钟偏移（min） */
  t: number;
  hr: number;
  /** 收缩压 mmHg */
  sbp: number;
  /** 舒张压 mmHg */
  dbp: number;
  spo2: number;
  /** 呼末 CO2 mmHg，可选 */
  etco2?: number;
  /** BIS 麻醉深度（40-60 合适），可选 */
  bis?: number;
}

/** 术中事件（用药/输血/报警） */
export interface IntraopEvent {
  t: number;
  type: 'medication' | 'transfusion' | 'infusion' | 'critical';
  note: string;
}

/** 术中监测输入 */
export interface IntraopMonitoringInput {
  vitals: IntraopVitalPoint[];
  events: IntraopEvent[];
  /** 估算出血量 ml */
  estimatedBloodLossMl: number;
  /** 估算血容量 ml（成人男 ~70ml/kg，演示默认 5000） */
  estimatedBloodVolumeMl: number;
}

/** 麻醉结局输入（供质量评价） */
export interface AnesthesiaOutcome {
  anesthesiaComplication: boolean;
  unplannedReintubation: boolean;
  anesthesiaDeath: boolean;
  pacuStayMin: number;
  aldreteAtDischarge: number;
  painScoreNrs: number;
  postopComplications: string[];
}

/** 风险评估结果 */
export interface AnesthesiaRiskAssessment {
  surgeryId: string;
  patientRef: string;
  asaGrade: AsaGrade;
  riskScore: number;
  riskLevel: AnesthesiaRiskLevel;
  /** 分项得分（用于解释） */
  breakdown: {
    asa: number;
    cardiac: number;
    respiratory: number;
    age: number;
    trauma: number;
    emergency: number;
  };
  /** 必须整改/完善项（术前核查清单） */
  requiredActions: string[];
  /** 建议麻醉方式 */
  suggestedAnesthesia: string;
}

/** 术中监测告警 */
export interface IntraopAlert {
  t: number;
  kind: 'hypotension' | 'hypoxia' | 'deep_sedation' | 'light_sedation' | 'hypercapnia' | 'major_bleeding';
  message: string;
}

/** 术中监测跟踪结果 */
export interface IntraopMonitoringTrace {
  surgeryId: string;
  sampleCount: number;
  minMap: number;
  minSpo2: number;
  minBis: number | null;
  bloodLossMl: number;
  /** 出血量占血容量比 */
  bloodLossPct: number;
  alerts: IntraopAlert[];
  alertCount: number;
  stable: boolean;
}

/** 麻醉质量评价结果 */
export interface AnesthesiaQualityEvaluation {
  surgeryId: string;
  grade: AnesthesiaQualityGrade;
  score: number;
  flags: string[];
  pacuDelay: boolean;
  painControlled: boolean;
}

/** 演示手术台账中的一行 */
export interface DemoAnesthesiaCase {
  surgeryId: string;
  patientRef: string;
  procedure: string;
  department: string;
  asaGrade: AsaGrade;
  cardiac: OrganFunction;
  respiratory: OrganFunction;
  age: number;
  trauma: SurgeryTrauma;
  durationMin: number;
  emergency: boolean;
  outcome: AnesthesiaOutcome;
}

/** 深度麻醉管理看板总装 */
export interface DeepAnesthesiaMgmt {
  demo: true;
  generatedAt: string;
  preop: {
    totalCases: number;
    asaDistribution: Record<AsaGrade, number>;
    riskDistribution: Record<AnesthesiaRiskLevel, number>;
    highRiskCases: AnesthesiaRiskAssessment[];
  };
  intraop: {
    traces: IntraopMonitoringTrace[];
    totalAlerts: number;
    alertRate: number;
  };
  postop: {
    cases: DemoAnesthesiaCase[];
    avgPacuMin: number;
    delayedPacuCount: number;
    avgPainScore: number;
    uncontrolledPainCount: number;
  };
  quality: {
    evaluations: AnesthesiaQualityEvaluation[];
    complicationRate: number;
    mortalityRate: number;
    unplannedReintubationRate: number;
    excellentRate: number;
  };
  notice: string;
}

/* --------------------------- 临床阈值常量 --------------------------- */

/** MAP 灌注不足阈值 mmHg（临床通用 <60） */
export const MAP_HYPO_THRESHOLD = 60;
/** SpO2 低氧阈值 % */
export const SPO2_LOW_THRESHOLD = 95;
/** BIS 麻醉深度合适区间 40-60；<40 过深，>60 过浅 */
export const BIS_DEEP = 40;
export const BIS_LIGHT = 60;
/** ETCO2 高碳酸血症阈值 mmHg */
export const ETCO2_HIGH = 45;
/** 出血量占血容量比例告警阈值 20% */
export const BLOOD_LOSS_RATIO_THRESHOLD = 0.2;
/** PACU 滞留延迟阈值（分钟） */
export const PACU_DELAY_MIN = 120;
/** Aldrete 出室阈值 */
export const ALDRETE_DISCHARGE = 9;
/** NRS 疼痛需干预阈值 */
export const PAIN_INTERVENE = 4;

/* --------------------------- 演示台账 --------------------------- */

/** 内置演示手术台账（与 354 SQL 扩展列对齐；空库可演示） */
const DEMO_CASES: DemoAnesthesiaCase[] = [
  {
    surgeryId: 'S-1001', patientRef: 'P-1001', procedure: '腹腔镜胆囊切除', department: '普外科',
    asaGrade: 'II', cardiac: 'normal', respiratory: 'normal', age: 42,
    trauma: 'intermediate', durationMin: 90, emergency: false,
    outcome: { anesthesiaComplication: false, unplannedReintubation: false, anesthesiaDeath: false,
      pacuStayMin: 45, aldreteAtDischarge: 10, painScoreNrs: 2, postopComplications: [] },
  },
  {
    surgeryId: 'S-1002', patientRef: 'P-1002', procedure: '冠脉搭桥 CABG', department: '心外科',
    asaGrade: 'III', cardiac: 'moderate', respiratory: 'normal', age: 67,
    trauma: 'major_plus', durationMin: 240, emergency: false,
    outcome: { anesthesiaComplication: true, unplannedReintubation: false, anesthesiaDeath: false,
      pacuStayMin: 180, aldreteAtDischarge: 8, painScoreNrs: 5, postopComplications: ['arrhythmia'] },
  },
  {
    surgeryId: 'S-1003', patientRef: 'P-1003', procedure: '全髋关节置换', department: '骨科',
    asaGrade: 'III', cardiac: 'mild', respiratory: 'moderate', age: 72,
    trauma: 'major', durationMin: 150, emergency: false,
    outcome: { anesthesiaComplication: false, unplannedReintubation: false, anesthesiaDeath: false,
      pacuStayMin: 95, aldreteAtDischarge: 9, painScoreNrs: 3, postopComplications: ['nausea'] },
  },
  {
    surgeryId: 'S-1004', patientRef: 'P-1004', procedure: '急诊剖腹探查', department: '普外科',
    asaGrade: 'IV', cardiac: 'moderate', respiratory: 'mild', age: 58,
    trauma: 'major_plus', durationMin: 200, emergency: true,
    outcome: { anesthesiaComplication: true, unplannedReintubation: true, anesthesiaDeath: false,
      pacuStayMin: 240, aldreteAtDischarge: 7, painScoreNrs: 6, postopComplications: ['resp_depression', 'hypertension'] },
  },
  {
    surgeryId: 'S-1005', patientRef: 'P-1005', procedure: '腹股沟疝修补', department: '普外科',
    asaGrade: 'I', cardiac: 'normal', respiratory: 'normal', age: 35,
    trauma: 'minor', durationMin: 45, emergency: false,
    outcome: { anesthesiaComplication: false, unplannedReintubation: false, anesthesiaDeath: false,
      pacuStayMin: 30, aldreteAtDischarge: 10, painScoreNrs: 1, postopComplications: [] },
  },
  {
    surgeryId: 'S-1006', patientRef: 'P-1006', procedure: '肺叶切除', department: '胸外科',
    asaGrade: 'III', cardiac: 'normal', respiratory: 'severe', age: 64,
    trauma: 'major', durationMin: 180, emergency: false,
    outcome: { anesthesiaComplication: true, unplannedReintubation: false, anesthesiaDeath: false,
      pacuStayMin: 150, aldreteAtDischarge: 8, painScoreNrs: 4, postopComplications: ['hypoxia'] },
  },
];

/** 生成演示术中体征时间线（确定性：按 case 病理特征塑造） */
function demoVitals(c: DemoAnesthesiaCase): IntraopMonitoringInput {
  const points: IntraopVitalPoint[] = [];
  const n = Math.max(6, Math.round(c.durationMin / 15));
  for (let i = 0; i <= n; i++) {
    const t = Math.round((i / n) * c.durationMin);
    // 基线
    let sbp = 120; let dbp = 75; let spo2 = 99; let bis = 50; let etco2 = 35;
    // 高危案例在中段出现异常
    if ((c.asaGrade === 'IV' || c.surgeryId === 'S-1004') && i === Math.floor(n / 2)) {
      sbp = 82; dbp = 48; spo2 = 92; bis = 35; etco2 = 48;
    }
    if (c.surgeryId === 'S-1006' && i >= Math.floor(n / 2)) {
      spo2 = 93;
    }
    if (c.surgeryId === 'S-1002' && i === Math.floor(n / 3)) {
      bis = 38;
    }
    points.push({ t, hr: 72 + (sbp < 100 ? 18 : 0), sbp, dbp, spo2, etco2, bis });
  }
  const bloodLossMl =
    c.trauma === 'minor' ? 50
    : c.trauma === 'intermediate' ? 150
    : c.trauma === 'major' ? 400
    : c.surgeryId === 'S-1004' ? 1400 : 800;
  return {
    vitals: points,
    events: [
      { t: 0, type: 'medication', note: '诱导：丙泊酚+罗库溴铵' },
      ...(bloodLossMl > 1000 ? [{ t: Math.round(c.durationMin / 2), type: 'transfusion' as const, note: '输注红细胞 4U + 血浆 400ml' }] : []),
    ],
    estimatedBloodLossMl: bloodLossMl,
    estimatedBloodVolumeMl: 5000,
  };
}

/* --------------------------- 纯函数 1：深度看板 --------------------------- */

/**
 * buildDeepAnesthesiaMgmt()
 * 【临床核心深化】一次性构建深度麻醉管理四维看板（术前/术中/术后/质量）。
 * 纯函数：无 IO，内置演示台账，空库可演示。
 */
export function buildDeepAnesthesiaMgmt(): DeepAnesthesiaMgmt {
  const riskAssessments: AnesthesiaRiskAssessment[] = [];
  const intraopTraces: IntraopMonitoringTrace[] = [];
  const evaluations: AnesthesiaQualityEvaluation[] = [];

  const asaDistribution: Record<AsaGrade, number> = { I: 0, II: 0, III: 0, IV: 0, V: 0, VI: 0 };
  const riskDistribution: Record<AnesthesiaRiskLevel, number> = { low: 0, moderate: 0, high: 0, extreme: 0 };

  for (const c of DEMO_CASES) {
    const patient: AnesthesiaPatient = {
      patientRef: c.patientRef, age: c.age,
      comorbidities: c.cardiac === 'normal' && c.respiratory === 'normal' ? [] : ['合并症'],
      asaGrade: c.asaGrade, cardiacFunction: c.cardiac, respiratoryFunction: c.respiratory,
    };
    const surgery: AnesthesiaSurgery = {
      surgeryId: c.surgeryId, plannedProcedure: c.procedure, department: c.department,
      trauma: c.trauma, plannedDurationMin: c.durationMin,
      bloodLossRisk: c.trauma === 'major_plus' ? 'high' : c.trauma === 'major' ? 'moderate' : 'low',
      emergency: c.emergency,
    };
    const risk = assessAnesthesiaRisk(patient, surgery);
    riskAssessments.push(risk);
    asaDistribution[c.asaGrade] += 1;
    riskDistribution[risk.riskLevel] += 1;

    const trace = trackIntraopMonitoring(c.surgeryId, demoVitals(c));
    intraopTraces.push(trace);

    const evalq = evaluateAnesthesiaQuality(c.surgeryId, c.outcome);
    evaluations.push(evalq);
  }

  const total = DEMO_CASES.length;
  const totalAlerts = intraopTraces.reduce((s, t) => s + t.alertCount, 0);
  const avgPacuMin = Math.round(DEMO_CASES.reduce((s, c) => s + c.outcome.pacuStayMin, 0) / total);
  const delayedPacuCount = DEMO_CASES.filter((c) => c.outcome.pacuStayMin > PACU_DELAY_MIN).length;
  const avgPainScore = Math.round((DEMO_CASES.reduce((s, c) => s + c.outcome.painScoreNrs, 0) / total) * 10) / 10;
  const uncontrolledPainCount = DEMO_CASES.filter((c) => c.outcome.painScoreNrs >= PAIN_INTERVENE).length;
  const complicationCount = DEMO_CASES.filter((c) => c.outcome.anesthesiaComplication).length;
  const deathCount = DEMO_CASES.filter((c) => c.outcome.anesthesiaDeath).length;
  const reintubCount = DEMO_CASES.filter((c) => c.outcome.unplannedReintubation).length;
  const excellentCount = evaluations.filter((e) => e.grade === 'excellent').length;

  return {
    demo: true,
    generatedAt: new Date().toISOString(),
    preop: {
      totalCases: total,
      asaDistribution,
      riskDistribution,
      highRiskCases: riskAssessments.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'extreme'),
    },
    intraop: {
      traces: intraopTraces,
      totalAlerts,
      alertRate: Math.round((totalAlerts / total) * 10) / 10,
    },
    postop: {
      cases: DEMO_CASES,
      avgPacuMin,
      delayedPacuCount,
      avgPainScore,
      uncontrolledPainCount,
    },
    quality: {
      evaluations,
      complicationRate: Math.round((complicationCount / total) * 1000) / 10,
      mortalityRate: Math.round((deathCount / total) * 10000) / 100,
      unplannedReintubationRate: Math.round((reintubCount / total) * 1000) / 10,
      excellentRate: Math.round((excellentCount / total) * 1000) / 10,
    },
    notice:
      '演示台账（纯函数推演，非 WebSocket 实时流）；远期由 clinical.surgery_requests ' +
      '354 扩展列回写真实数据，并接监护仪/麻醉机推流。',
  };
}

/* --------------------------- 纯函数 2：术前风险评估 --------------------------- */

/**
 * assessAnesthesiaRisk(patient, surgery)
 * 【临床核心深化】按 ASA + 心/肺功能 + 年龄 + 手术创伤 + 急诊 计算麻醉风险。
 * 评分 0-100：越高越危险；分层 low <30 / moderate 30-55 / high 55-75 / extreme >=75。
 */
export function assessAnesthesiaRisk(
  patient: AnesthesiaPatient,
  surgery: AnesthesiaSurgery,
): AnesthesiaRiskAssessment {
  // ASA 权重：I=0, II=10, III=25, IV=45, V=60, VI=0（脑死亡器官捐献，不评估）
  const asaScoreMap: Record<AsaGrade, number> = { I: 0, II: 10, III: 25, IV: 45, V: 60, VI: 0 };
  const asaScore = asaScoreMap[patient.asaGrade];

  // 心功能权重：normal=0, mild=8, moderate=18, severe=30
  const organScore: Record<OrganFunction, number> = { normal: 0, mild: 8, moderate: 18, severe: 30 };
  const cardiacScore = organScore[patient.cardiacFunction];
  const respiratoryScore = organScore[patient.respiratoryFunction];

  // 年龄：>=70 加 10，>=60 加 5，否则 0
  const ageScore = patient.age >= 70 ? 10 : patient.age >= 60 ? 5 : 0;

  // 手术创伤：minor=0, intermediate=5, major=12, major_plus=20
  const traumaScoreMap: Record<SurgeryTrauma, number> = { minor: 0, intermediate: 5, major: 12, major_plus: 20 };
  const traumaScore = traumaScoreMap[surgery.trauma];

  // 急诊加 10
  const emergencyScore = surgery.emergency ? 10 : 0;

  const riskScore = Math.round(
    Math.min(100, asaScore + cardiacScore + respiratoryScore + ageScore + traumaScore + emergencyScore),
  );

  const riskLevel: AnesthesiaRiskLevel =
    riskScore >= 75 ? 'extreme' : riskScore >= 55 ? 'high' : riskScore >= 30 ? 'moderate' : 'low';

  // 必须整改项
  const requiredActions: string[] = [];
  if (patient.asaGrade === 'III' || patient.asaGrade === 'IV') {
    requiredActions.push('ASA III/IV：术前完善心脏彩超 + 心内科会诊');
  }
  if (patient.cardiacFunction === 'moderate' || patient.cardiacFunction === 'severe') {
    requiredActions.push('心功能中/重度：评估围术期心功能保护方案，备血管活性药');
  }
  if (patient.respiratoryFunction === 'moderate' || patient.respiratoryFunction === 'severe') {
    requiredActions.push('肺功能中/重度：术前肺康复训练，备术后镇痛与呼吸支持');
  }
  if (patient.age >= 70) {
    requiredActions.push('高龄（>=70）：评估谵妄风险，术后送 PACU 密切观察');
  }
  if (surgery.bloodLossRisk === 'high') {
    requiredActions.push('高出血风险：备血 + 备自体血回收方案');
  }
  if (surgery.emergency) {
    requiredActions.push('急诊手术：饱胃风险，按快速序贯诱导（RSI）准备');
  }
  if (requiredActions.length === 0) {
    requiredActions.push('常规术前禁食禁水 + 三方核对');
  }

  const suggestedAnesthesia =
    surgery.trauma === 'minor' ? '局部浸润 / 神经阻滞'
    : surgery.trauma === 'intermediate' ? '全身麻醉（喉罩）+ 术后 PCIA'
    : patient.respiratoryFunction === 'severe' ? '全身麻醉（气管插管）+ 肺保护性通气'
    : '全身麻醉（气管插管）';

  return {
    surgeryId: surgery.surgeryId,
    patientRef: patient.patientRef,
    asaGrade: patient.asaGrade,
    riskScore,
    riskLevel,
    breakdown: {
      asa: asaScore, cardiac: cardiacScore, respiratory: respiratoryScore,
      age: ageScore, trauma: traumaScore, emergency: emergencyScore,
    },
    requiredActions,
    suggestedAnesthesia,
  };
}

/* --------------------------- 纯函数 3：术中监测跟踪 --------------------------- */

/**
 * trackIntraopMonitoring(surgeryId, input)
 * 【临床核心深化】吃术中体征时间线，按临床阈值检出高危事件。
 * 真安全=异常被看见：MAP<60 灌注不足 / SpO2<95 低氧 / BIS<40 过深 /
 * BIS>60 过浅 / ETCO2>45 高碳酸血症 / 出血量>血容量 20%。
 */
export function trackIntraopMonitoring(
  surgeryId: string,
  input: IntraopMonitoringInput,
): IntraopMonitoringTrace {
  const alerts: IntraopAlert[] = [];
  let minMap = Infinity;
  let minSpo2 = Infinity;
  let minBis: number | null = null;

  for (const v of input.vitals) {
    const map = (2 * v.dbp + v.sbp) / 3;
    if (map < minMap) minMap = map;
    if (v.spo2 < minSpo2) minSpo2 = v.spo2;
    if (v.bis !== undefined) {
      if (minBis === null || v.bis < minBis) minBis = v.bis;
      if (v.bis < BIS_DEEP) {
        alerts.push({ t: v.t, kind: 'deep_sedation', message: `BIS=${v.bis}<${BIS_DEEP}，麻醉过深，唤醒延迟风险` });
      } else if (v.bis > BIS_LIGHT) {
        alerts.push({ t: v.t, kind: 'light_sedation', message: `BIS=${v.bis}>${BIS_LIGHT}，麻醉偏浅，知晓风险` });
      }
    }
    if (map < MAP_HYPO_THRESHOLD) {
      alerts.push({ t: v.t, kind: 'hypotension', message: `MAP=${map.toFixed(1)}<${MAP_HYPO_THRESHOLD}，灌注不足，排查失血/麻醉过深` });
    }
    if (v.spo2 < SPO2_LOW_THRESHOLD) {
      alerts.push({ t: v.t, kind: 'hypoxia', message: `SpO2=${v.spo2}%<${SPO2_LOW_THRESHOLD}%，低氧，查气道/通气/氧供` });
    }
    if (v.etco2 !== undefined && v.etco2 > ETCO2_HIGH) {
      alerts.push({ t: v.t, kind: 'hypercapnia', message: `ETCO2=${v.etco2}>${ETCO2_HIGH}mmHg，高碳酸血症，查通气` });
    }
  }

  const bloodLossPct =
    input.estimatedBloodVolumeMl > 0
      ? input.estimatedBloodLossMl / input.estimatedBloodVolumeMl
      : 0;
  if (bloodLossPct > BLOOD_LOSS_RATIO_THRESHOLD) {
    alerts.push({
      t: -1, kind: 'major_bleeding',
      message: `出血量=${input.estimatedBloodLossMl}ml（${(bloodLossPct * 100).toFixed(1)}% 血容量）>${BLOOD_LOSS_RATIO_THRESHOLD * 100}%，启动输血/止血预案`,
    });
  }

  return {
    surgeryId,
    sampleCount: input.vitals.length,
    minMap: Math.round(minMap === Infinity ? 0 : minMap * 10) / 10,
    minSpo2: Math.round(minSpo2 === Infinity ? 0 : minSpo2),
    minBis,
    bloodLossMl: input.estimatedBloodLossMl,
    bloodLossPct: Math.round(bloodLossPct * 1000) / 1000,
    alerts,
    alertCount: alerts.length,
    stable: alerts.length === 0,
  };
}

/* --------------------------- 纯函数 4：麻醉质量评价 --------------------------- */

/**
 * evaluateAnesthesiaQuality(surgeryId, outcome)
 * 【临床核心深化】按麻醉并发症/非计划二次插管/麻醉死亡/PACU 延迟/
 * Aldrete 不达标/疼痛失控综合评级。
 * 评分 100 起扣：并发症 -30 / 二次插管 -25 / 死亡 -100 / PACU>120 -10 /
 * Aldrete<9 -10 / NRS>=4 -5。评级 excellent>=90 / good 75-89 / fair 50-74 / poor<50。
 */
export function evaluateAnesthesiaQuality(
  surgeryId: string,
  outcome: AnesthesiaOutcome,
): AnesthesiaQualityEvaluation {
  let score = 100;
  const flags: string[] = [];
  let pacuDelay = false;
  let painControlled = true;

  if (outcome.anesthesiaComplication) {
    score -= 30;
    flags.push('麻醉相关并发症（呼吸抑制/误吸/过敏/血流动力学剧烈波动）');
  }
  if (outcome.unplannedReintubation) {
    score -= 25;
    flags.push('非计划二次插管');
  }
  if (outcome.anesthesiaDeath) {
    score -= 100;
    flags.push('麻醉相关死亡（重大不良事件）');
  }
  if (outcome.pacuStayMin > PACU_DELAY_MIN) {
    score -= 10;
    pacuDelay = true;
    flags.push(`PACU 滞留 ${outcome.pacuStayMin}min > ${PACU_DELAY_MIN}min，恢复延迟`);
  }
  if (outcome.aldreteAtDischarge < ALDRETE_DISCHARGE) {
    score -= 10;
    flags.push(`出 PACU Aldrete=${outcome.aldreteAtDischarge} < ${ALDRETE_DISCHARGE}，未达标不宜离室`);
  }
  if (outcome.painScoreNrs >= PAIN_INTERVENE) {
    score -= 5;
    painControlled = false;
    flags.push(`NRS 疼痛评分=${outcome.painScoreNrs} >= ${PAIN_INTERVENE}，镇痛不足`);
  }
  if (outcome.postopComplications.length > 0) {
    flags.push(`术后并发症：${outcome.postopComplications.join('、')}`);
  }
  if (flags.length === 0) {
    flags.push('围术期平稳，无麻醉相关不良事件');
  }

  score = Math.max(0, Math.round(score));
  const grade: AnesthesiaQualityGrade =
    score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 50 ? 'fair' : 'poor';

  return { surgeryId, grade, score, flags, pacuDelay, painControlled };
}
