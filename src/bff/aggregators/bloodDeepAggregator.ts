/**
 * 健澜科技 jlmedaios — 【临床核心深化】医院输血管理深化聚合器（M176-D，纯函数）
 *
 * 「输血管理要零差错，人命关天」。本聚合器在 M10-A 输血申请/配血/发血/输注/
 * 不良反应上报的业务闭环之上，把输血从「流程跑通」升级为「四阶段零差错管控」：
 *
 *   - buildDeepBloodMgmt() 纯函数：深度输血管理体系总览。一次盘点四大管理维度——
 *       输血适应症（Hb / 凝血指标 / 出血量判断）/
 *       输血前评估（血型 / 交叉配血 / 抗体筛查）/
 *       输血过程（输注速度 / 不良反应监测）/
 *       输血后评价（疗效评价 / 不良反应 / 费用分析）；
 *     并给出每个维度的「零差错红线」与质控指标基线对比。
 *   - assessTransfusionIndication(patient, condition) 纯函数：输血适应症评估。
 *       依据 Hb 阈值、凝血指标（PT/APTT/PLT/Fib）、失血量与休克指数，
 *       判定是否有输血指征、推荐成分血种类与剂量，并列出禁忌与延缓输血情形。
 *   - trackTransfusionReaction(transfusionId, symptoms) 纯函数：输血反应监测。
 *       按症状群映射急性溶血/发热过敏/细菌污染/循环超负荷/输血相关肺损伤等
 *       反应类型，分级（mild/moderate/severe）并给出即刻处置（停血/换管/抢救）。
 *   - evaluateTransfusionEffect(transfusionId, prePost) 纯函数：输血疗效评价。
 *       比较输注前后 Hb / PLT / 凝血 / 生命体征变化，判定显效/有效/无效，
 *       并估算增量成本（元/U 或 元/治疗量）供费用分析。
 *
 * 设计要点：
 *  - 四个函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用；
 *  - 内置演示台账与 deploy/postgres/init/355-blood-deep.sql 种子对齐，空库可演示；
 *  - 患者仅输出脱敏标识（P-xxxx），不落 PII；阈值为确定性临床指南口径，可复算；
 *  - 所有「建议」均为辅助决策，最终输血医嘱仍须医生签核（系统不自动开血）。
 *
 * 不触碰 WebSocket；不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 通用类型 ============================== */

/** 输血适应症分级：无指征 / 可输血 / 紧急输血 / 禁忌或延缓 */
export type IndicationLevel = 'none' | 'elective' | 'urgent' | 'contraindicated';

/** 推荐成分血种类 */
export type BloodComponent =
  | 'none'
  | 'rbc'            // 悬浮红细胞
  | 'platelet'       // 单采血小板
  | 'plasma'         // 新鲜冰冻血浆
  | 'cryoprecipitate' // 冷沉淀
  | 'wb';            // 全血（极少用）

/** 输血反应类型（症状群映射） */
export type ReactionType =
  | 'none'
  | 'acute_hemolytic'   // 急性溶血性输血反应（致命）
  | 'febrile_allergic'  // 发热/过敏反应
  | 'sepsis'            // 细菌污染反应
  | 'taco'             // 循环超负荷（TACO）
  | 'trali'             // 输血相关急性肺损伤（TRALI）
  | 'hypotension'       // 低血压/其他

/** 反应严重度 */
export type ReactionSeverity = 'none' | 'mild' | 'moderate' | 'severe';

/** 疗效评价结论 */
export type EffectGrade = 'excellent' | 'effective' | 'ineffective' | 'unknown';

/* ----------------------- 0. 体系总览（buildDeepBloodMgmt） ----------------------- */

/** 单个管理维度的零差错管控指标 */
export interface BloodDimensionKpi {
  /** 人工/老系统时代基线差错率（%） */
  baselineErrorRatePct: number;
  /** 深化后目标值（%） */
  targetErrorRatePct: number;
  /** 零差错红线（系统不可逾越的硬约束） */
  guardrail: string;
}

/** 深度输血管理的一个维度 */
export interface BloodMgmtDimension {
  code: 'indication' | 'pre_check' | 'intra' | 'post_eval';
  name: string;
  /** 关键管控动作（真防错，不是看板功能） */
  controls: string[];
  kpi: BloodDimensionKpi;
}

/** buildDeepBloodMgmt 返回的体系总览 */
export interface DeepBloodMgmt {
  dimensions: BloodMgmtDimension[];
  /** 四维度加权后的综合差错下降幅度（百分比点） */
  overallErrorReductionPctPoints: number;
  /** 一句话价值主张 */
  valueStatement: string;
  /** 全局零差错红线清单 */
  guardrails: string[];
  /** true 表示当前为内置演示台账 */
  demo: boolean;
  generatedAt: string;
}

/* ----------------------- 1. 适应症评估（assessTransfusionIndication） ----------------------- */

/** 患者输血相关化验与体征（脱敏传入） */
export interface PatientLab {
  /** 脱敏患者标识 P-xxxx */
  patientId: string;
  /** 血红蛋白 g/L */
  hb: number;
  /** 血小板计数 ×10^9/L */
  plt: number;
  /** 凝血酶原时间比值 INR（可选） */
  inr?: number;
  /** 活化部分凝血活酶时间秒（可选） */
  apttSec?: number;
  /** 纤维蛋白原 g/L（可选） */
  fibrinogen?: number;
  /** 收缩压 mmHg */
  sbp: number;
  /** 心率 bpm */
  hr: number;
  /** 体重 kg */
  weightKg: number;
  /** 妊娠/免疫等特殊标签（如 rh_null, pregnant） */
  flags?: string[];
}

/** 本次临床情境（出血/手术/血液病/化疗） */
export interface TransfusionCondition {
  /** 情境描述：hemorrhage / surgery / anemia / thrombocytopenia / coagulopathy */
  scenario: 'hemorrhage' | 'surgery' | 'anemia' | 'thrombocytopenia' | 'coagulopathy';
  /** 估计失血量 mL（非出血情境传 0） */
  estimatedBloodLossMl: number;
  /** 活动性出血：是否进行性出血 */
  activeBleeding: boolean;
  /** 患者已存在心肌缺血/冠心病等合并症（阈值上调） */
  cardiacComorbidity?: boolean;
}

/** 适应症评估结果 */
export interface IndicationAssessment {
  patientId: string;
  level: IndicationLevel;
  /** 推荐成分血 */
  component: BloodComponent;
  /** 推荐剂量描述（如 2U RBC / 1治疗量血小板） */
  suggestedDose: string;
  /** 休克指数 = HR/SBP（>1 提示失血） */
  shockIndex: number;
  /** 命中的临床依据条目 */
  reasons: string[];
  /** 禁忌/暂缓输血的情形（若有） */
  contraindications: string[];
  /** 输血前必做核对项 */
  preChecklist: string[];
}

/* ----------------------- 2. 反应监测（trackTransfusionReaction） ----------------------- */

/** 输血反应监测结果 */
export interface TransfusionReactionTrack {
  transfusionId: string;
  /** 命中的反应类型 */
  type: ReactionType;
  severity: ReactionSeverity;
  /** 命中的症状 */
  symptoms: string[];
  /** 即刻处置动作（按红线顺序：停血→换管→抢救） */
  actions: string[];
  /** 是否致命性反应（需立即停血并上报血库/医务） */
  fatal: boolean;
  /** 建议上报与送检项目 */
  report: string[];
}

/* ----------------------- 3. 疗效评价（evaluateTransfusionEffect） ----------------------- */

/** 输注前后对照指标 */
export interface PrePostPanel {
  /** 输血前 Hb g/L */
  preHb: number;
  /** 输血后 Hb g/L */
  postHb: number;
  /** 输血前 PLT ×10^9/L（输血小板时对照） */
  prePlt?: number;
  /** 输血后 PLT */
  postPlt?: number;
  /** 输注成分血 */
  component: BloodComponent;
  /** 输注剂量（U 或 治疗量） */
  units: number;
  /** 患者体重 kg（用于校正增量） */
  weightKg: number;
}

/** 疗效评价结果 */
export interface TransfusionEffectEval {
  transfusionId: string;
  grade: EffectGrade;
  /** Hb 增量 g/L */
  hbDelta: number;
  /** PLT 增量 ×10^9/L（输血小板时） */
  pltDelta: number | null;
  /** 每单位红细胞理论升 Hb（g/L/U，参考值 10~15） */
  expectedHbRisePerUnit: number;
  /** 是否达到预期增量 */
  metExpected: boolean;
  /** 增量成本估算（元） */
  estimatedCostCny: number;
  /** 疗效结论条目 */
  conclusions: string[];
}

/* ============================== 纯函数实现 ============================== */

/**
 * buildDeepBloodMgmt —— 深度输血管理体系总览（临床核心深化）。
 * 纯函数：无参，返回四维度零差错管控体系。
 */
export function buildDeepBloodMgmt(): DeepBloodMgmt {
  const dimensions: BloodMgmtDimension[] = [
    {
      code: 'indication',
      name: '输血适应症评估',
      controls: [
        'Hb 阈值电子化判定（普通患者 <70 g/L、冠心病 <80 g/L 触发指征）',
        '失血量 × 休克指数双轴校验，避免「凭感觉输血」',
        '凝血四项（PT/APTT/PLT/Fib）联动推荐成分血种类',
        '无指征输血自动拦截并要求主任级批注',
      ],
      kpi: {
        baselineErrorRatePct: 12.0,
        targetErrorRatePct: 1.0,
        guardrail: '无适应症不得发血；活动性出血与慢性贫血阈值分开判定',
      },
    },
    {
      code: 'pre_check',
      name: '输血前评估',
      controls: [
        'ABO/RhD 血型双人复核，电子标签扫码一致才放行',
        '交叉配血主侧/次侧结果留痕，次侧阳性拦截',
        '不规则抗体筛查（IAT）阳性血样自动标记并提示洗涤红细胞',
        '输血前 9 项感染指标（乙肝/丙肝/HIV/梅毒等）台账核对',
      ],
      kpi: {
        baselineErrorRatePct: 3.5,
        targetErrorRatePct: 0.1,
        guardrail: '血型/配血/抗体任一不符，系统硬拦截，禁止口头改判',
      },
    },
    {
      code: 'intra',
      name: '输血过程监测',
      controls: [
        '开始 15 分钟慢滴观察（≤20 滴/分），护士双人床旁核对',
        '全程输注速度上限：红细胞 ≤4 小时走完一袋，防细菌繁殖',
        '每 15/30/60 分钟生命体征打点，异常即弹窗停血',
        '症状群自动映射反应类型，致命反应一键停血并呼叫抢救',
      ],
      kpi: {
        baselineErrorRatePct: 5.0,
        targetErrorRatePct: 0.2,
        guardrail: '一袋血超过 4 小时未输完必须废弃；任何反应先停血再判断',
      },
    },
    {
      code: 'post_eval',
      name: '输血后评价',
      controls: [
        '输血后 24 小时复查 Hb/PLT，自动对比预期增量',
        '不良反应 72 小时追踪闭环，漏报自动提醒主管医生',
        '成分血费用按 U/治疗量归集，单患者用血成本分析',
        '每月合理性输血率（%）与围术期自体输血率上报质控',
      ],
      kpi: {
        baselineErrorRatePct: 8.0,
        targetErrorRatePct: 0.5,
        guardrail: '疗效不达预期必须复盘原因（输注/标本/继续失血），不得静默',
      },
    },
  ];

  const overall = dimensions.reduce(
    (sum, d) => sum + (d.kpi.baselineErrorRatePct - d.kpi.targetErrorRatePct),
    0,
  ) / dimensions.length;

  return {
    dimensions,
    overallErrorReductionPctPoints: Number(overall.toFixed(1)),
    valueStatement:
      '输血四阶段（适应症-前评估-过程-后评价）全闭环硬拦截，把可避免输血差错压到 0.5% 以下',
    guardrails: [
      '三查八对（血袋/患者/医嘱）不通过，血袋无法出库',
      '血型不合 = 立即停血，无任何绿色通道',
      '一袋血不超过 4 小时输注时限',
      '所有反应先停血、保留血袋与标本送血库复查',
    ],
    demo: true,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * assessTransfusionIndication —— 输血适应症评估（临床核心深化）。
 * 纯函数：按指南阈值判定是否有输血指征、推荐成分血与剂量。
 */
export function assessTransfusionIndication(
  patient: PatientLab,
  condition: TransfusionCondition,
): IndicationAssessment {
  const reasons: string[] = [];
  const contraindications: string[] = [];
  const preChecklist = [
    '复核 ABO/RhD 血型（双人）',
    '交叉配血试验',
    '不规则抗体筛查（IAT）',
    '输血前感染九项留痕',
    '知情同意书签署',
  ];

  const shockIndex = patient.sbp > 0 ? Number((patient.hr / patient.sbp).toFixed(2)) : 0;
  const hbThreshold = condition.cardiacComorbidity ? 80 : 70;

  // --- 出血优先判断：活动性出血 + 休克指数 ---
  let level: IndicationLevel = 'none';
  let component: BloodComponent = 'none';
  let suggestedDose = '暂不输血';

  const massiveLoss = condition.estimatedBloodLossMl >= 1000;
  const shock = shockIndex >= 1.0;

  if (condition.scenario === 'hemorrhage' && (massiveLoss || shock || condition.activeBleeding)) {
    level = 'urgent';
    component = 'wb';
    suggestedDose = '启动大量输血方案（MTP）：RBC:血浆:血小板 ≈ 1:1:1，按体重10mL/kg 起步';
    reasons.push(
      `估计失血量 ${condition.estimatedBloodLossMl} mL`,
      `休克指数 ${shockIndex}（≥1.0 提示失血）`,
      condition.activeBleeding ? '存在进行性活动性出血' : '暂无活动性出血',
    );
  } else if (patient.hb < hbThreshold) {
    level = patient.hb < 60 || condition.activeBleeding ? 'urgent' : 'elective';
    component = 'rbc';
    const units = patient.hb < 60 ? 3 : 2;
    suggestedDose = `${units}U 悬浮红细胞（按体重 ${patient.weightKg}kg，预期升 Hb ${units * 10}~${units * 15} g/L）`;
    reasons.push(
      `Hb ${patient.hb} g/L 低于阈值 ${hbThreshold} g/L` +
        (condition.cardiacComorbidity ? '（合并冠心病阈值上调至 80）' : ''),
    );
  } else if (patient.plt < 50) {
    level = condition.scenario === 'thrombocytopenia' && patient.plt < 20 ? 'urgent' : 'elective';
    component = 'platelet';
    suggestedDose = `${patient.plt < 20 ? '1~2' : '1'} 治疗量单采血小板（术前/出血阈值 PLT<50×10^9/L）`;
    reasons.push(`PLT ${patient.plt} ×10^9/L 低于止血阈值`);
  } else if (
    (patient.inr !== undefined && patient.inr > 1.8) ||
    (patient.apttSec !== undefined && patient.apttSec > 60) ||
    (patient.fibrinogen !== undefined && patient.fibrinogen < 1.5)
  ) {
    level = 'elective';
    component = patient.fibrinogen !== undefined && patient.fibrinogen < 1.5 ? 'cryoprecipitate' : 'plasma';
    suggestedDose = component === 'cryoprecipitate'
      ? '冷沉淀 10~15U（纤维蛋白原 <1.5 g/L）'
      : '新鲜冰冻血浆 10~15 mL/kg（纠正凝血因子缺乏）';
    reasons.push(
      [
        patient.inr !== undefined ? `INR ${patient.inr}` : '',
        patient.apttSec !== undefined ? `APTT ${patient.apttSec}s` : '',
        patient.fibrinogen !== undefined ? `Fib ${patient.fibrinogen} g/L` : '',
      ].filter(Boolean).join('，'),
    );
  } else {
    reasons.push(
      `Hb ${patient.hb} g/L ≥ ${hbThreshold}，PLT ${patient.plt} ×10^9/L ≥ 50，凝血指标未见明显异常`,
      '目前无输血指征，继续观察并复查',
    );
    contraindications.push('Hb≥100 g/L 一律不予输血；70~100 g/L 须结合症状与失血综合判断，避免预防性输血');
  }

  return {
    patientId: patient.patientId,
    level,
    component,
    suggestedDose,
    shockIndex,
    reasons,
    contraindications,
    preChecklist,
  };
}

/**
 * trackTransfusionReaction —— 输血反应监测（临床核心深化）。
 * 纯函数：按症状群映射反应类型、分级并给出即刻处置。
 */
export function trackTransfusionReaction(
  transfusionId: string,
  symptoms: string[],
): TransfusionReactionTrack {
  const list = symptoms.map((s) => s.trim()).filter(Boolean);
  const has = (...keys: string[]) => keys.some((k) => list.some((s) => s.includes(k)));

  let type: ReactionType = 'none';
  let severity: ReactionSeverity = 'none';
  let fatal = false;
  const actions: string[] = [];
  const report: string[] = [];

  // 1. 急性溶血（致命）：腰痛/血红蛋白尿/寒战高热/术野渗血不止/血压骤降
  if (has('腰痛', '血红蛋白尿', '茶色尿', '寒战', '术野渗血', '血压骤降', '休克')) {
    type = 'acute_hemolytic';
    severity = 'severe';
    fatal = true;
    actions.push(
      '立即停止输血，更换输血器，保留静脉通路',
      '汇报医生与血库，启动抢救（补液/利尿/碱化尿液）',
      '重新核对患者与血袋血型、留取血袋及患者标本送检',
    );
    report.push('立即上报医务科与输血管理委员会', '床旁抢救记录 + 标本送血库交叉复查');
  } else if (has('呼吸困难', '发绀', '血氧下降', '粉红色泡沫痰', '端坐呼吸')) {
    // 2. TRALI / TACO：呼吸窘迫、低氧
    type = has('泡沫痰', '端坐呼吸', '颈静脉怒张') ? 'taco' : 'trali';
    severity = 'severe';
    fatal = true;
    actions.push(
      '立即停血，半卧位，高流量吸氧',
      'TACO：利尿、强心、减慢/停止补液；TRALI：按 ARDS 呼吸支持',
      '保留血袋送血库与微生物室',
    );
    report.push('上报呼吸科/ICU 会诊', '血袋与剩余血液送病原学复查');
  } else if (has('高热', '寒战', '皮疹', '瘙痒', '荨麻疹')) {
    // 3. 发热/过敏
    const severe = has('喉头水肿', '支气管痉挛', '血压下降');
    type = 'febrile_allergic';
    severity = severe ? 'severe' : has('寒战', '高热') ? 'moderate' : 'mild';
    actions.push(
      severe ? '停血并按过敏性休克处理（肾上腺素/激素）' : '减慢滴速，观察，必要时给抗组胺药',
      '保留血袋备查',
    );
    if (severe) report.push('上报血库，后续改用洗涤红细胞');
  } else if (has('高热', '寒战', '感染性休克', 'DIC')) {
    // 4. 细菌污染
    type = 'sepsis';
    severity = 'severe';
    fatal = true;
    actions.push('立即停血，抗休克 + 广谱抗生素', '血袋余血送微生物涂片与培养');
    report.push('紧急上报医务科与院感科', '追溯同一献血者其余血袋封存');
  } else if (has('低血压', '面红', '焦虑')) {
    type = 'hypotension';
    severity = 'moderate';
    actions.push('减慢滴速，监测血压，必要时更换血袋');
  }

  if (type === 'none') {
    actions.push('无典型反应症状，按常规 15 分钟/30 分钟/60 分钟继续监测生命体征');
  }

  return {
    transfusionId,
    type,
    severity,
    symptoms: list,
    actions,
    fatal,
    report,
  };
}

/**
 * evaluateTransfusionEffect —— 输血疗效评价（临床核心深化）。
 * 纯函数：对照输注前后 Hb/PLT，判定疗效并估算增量成本。
 */
export function evaluateTransfusionEffect(
  transfusionId: string,
  panel: PrePostPanel,
): TransfusionEffectEval {
  const hbDelta = Number((panel.postHb - panel.preHb).toFixed(1));
  const pltDelta =
    panel.prePlt !== undefined && panel.postPlt !== undefined
      ? Number((panel.postPlt - panel.prePlt).toFixed(0))
      : null;

  // 每 U 红细胞预期升 Hb：成人约 10 g/L/U（按 55kg 校正）
  const expectedHbRisePerUnit = Number(((10 * 55) / Math.max(panel.weightKg, 1)).toFixed(1));
  const expectedHbRise = expectedHbRisePerUnit * (panel.component === 'rbc' ? panel.units : 0);

  let grade: EffectGrade = 'unknown';
  const conclusions: string[] = [];
  let metExpected = false;

  if (panel.component === 'rbc') {
    metExpected = hbDelta >= expectedHbRise * 0.8;
    grade = hbDelta >= expectedHbRise ? 'excellent' : metExpected ? 'effective' : 'ineffective';
    conclusions.push(
      `Hb：${panel.preHb} → ${panel.postHb} g/L（+${hbDelta}）`,
      `预期升 Hb ≈ ${expectedHbRise.toFixed(1)} g/L（${panel.units}U）`,
      metExpected ? '达到预期增量，输注有效' : '增量未达预期，需排查继续出血/标本稀释/输注误差',
    );
  } else if (panel.component === 'platelet' && pltDelta !== null) {
    // 1 治疗量血小板预期升 PLT ≥ 20×10^9/L（1 小时）
    const expectedPlt = 20 * panel.units;
    metExpected = pltDelta >= expectedPlt * 0.7;
    grade = pltDelta >= expectedPlt ? 'excellent' : metExpected ? 'effective' : 'ineffective';
    conclusions.push(
      `PLT：${panel.prePlt} → ${panel.postPlt} ×10^9/L（+${pltDelta}）`,
      `预期升 PLT ≈ ${expectedPlt} ×10^9/L`,
      metExpected ? '血小板反应良好' : '增量不足，排查免疫性血小板破坏/脾亢/消耗',
    );
  } else {
    conclusions.push(`成分血 ${panel.component}：对照指标不适用 Hb/PLT 增量评价，按临床症状改善评估`);
    grade = 'effective';
    metExpected = true;
  }

  // 增量成本估算（价格口径：红细胞约 220 元/U，血小板约 1400 元/治疗量，血浆 80 元/100mL）
  const unitPrice =
    panel.component === 'rbc' ? 220 :
    panel.component === 'platelet' ? 1400 :
    panel.component === 'plasma' ? 320 :
    panel.component === 'cryoprecipitate' ? 60 : 260;
  const estimatedCostCny = unitPrice * panel.units;
  conclusions.push(`本次用血成本估算 ≈ ${estimatedCostCny} 元（${panel.units} 单位 × ${unitPrice} 元/单位口径）`);

  return {
    transfusionId,
    grade,
    hbDelta,
    pltDelta,
    expectedHbRisePerUnit,
    metExpected,
    estimatedCostCny,
    conclusions,
  };
}
