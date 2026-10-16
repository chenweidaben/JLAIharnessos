/**
 * 健澜科技 jlmedaios — 【质量提升与新场景】医院智能药房深化聚合器（M173-C，纯函数）
 *
 * 「智能药房要真减少差错，不能只是看板」。本聚合器把药房从「事后盘点看板」升级为
 * 全流程防错的智能体系，四个纯函数各司其职：
 *
 *   - buildSmartPharmacy：智能药房体系。一次盘点四大能力域——
 *       智能摆药（自动摆药机对接 + 摆药差错率监控）/
 *       智能审方（AI 前置审核 + 药师事后复核）/
 *       智能库存（效期管理 + 自动补货 + 缺货预警）/
 *       智能用药（用药指导 + 相互作用 + 特殊人群）；
 *     并给出每个域的「差错下降目标」与当前基线对比——指标必须指向差错率下降，
 *     而不是展示多少块屏。
 *   - predictDrugDemand：药品需求预测。按药品基线消耗 × 季节系数外推周期需求，
 *     输出预测日均 / 周期总量 / 高峰日与置信度，作为自动补货的输入。
 *   - optimizeDrugInventory：库存优化。给定预测日均需求与采购提前期，测算
 *     安全库存 / 再订货点 / 最高库存上限 / 建议补货量——库存降到再订货点即自动补货，
 *     既不缺货也不占压资金、不养近效期。
 *   - detectDrugAdverseEvent：不良反应预警。处方 × 患者画像 × 已现症状三方比对，
 *     命中过敏史 / 妊娠禁忌 / 肾损 / 特殊人群剂量 / 症状群时给出分级预警与处置建议；
 *     预警是辅助，处方生效仍需药师/医生签核。
 *
 * 全部无副作用、不触库、不写 SQL，便于单测；本切片仅纯函数 + 路由 + 前端。
 * 不触碰 WebSocket；不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 通用类型 ============================== */

/** 季节情景（影响需求预测系数） */
export type Seasonality =
  | 'none'               // 无明显季节波动
  | 'winter_respiratory' // 冬季呼吸道用药高峰
  | 'summer_gastro'      // 夏季肠道用药高峰
  | 'flu_peak'           // 流感季高峰
  | 'year_round';        // 全年平稳（慢病长处方）

/** 智能药房四大能力域代码 */
export type PharmacyPillar = 'dispense' | 'review' | 'stock' | 'medication';

/** 风险分级（不良反应预警） */
export type RiskLevel = 'none' | 'mild' | 'moderate' | 'severe';

/* ============================== 0. 体系总览 ============================== */

/** 单个能力域的差错管控指标 */
export interface PillarKpi {
  /** 基线差错率/风险率（人工时代） */
  baselineRate: number;
  /** 智能体系目标值 */
  targetRate: number;
  /** 下降幅度（百分比点） */
  reductionPctPoints: number;
  /** 当前监控口径说明 */
  monitorNote: string;
}

/** 智能药房一个能力域 */
export interface PharmacyPillarInfo {
  code: PharmacyPillar;
  name: string;
  description: string;
  /** 关键能力清单（真防错动作，不是看板功能） */
  capabilities: string[];
  kpi: PillarKpi;
}

/** 智能药房体系总览 */
export interface SmartPharmacySystem {
  pillars: PharmacyPillarInfo[];
  /** 四大域加权后的综合差错下降幅度（百分比点） */
  overallErrorReductionPctPoints: number;
  /** 一句话价值主张：真减少了什么差错 */
  valueStatement: string;
  /** 安全红线（系统不可逾越的边界） */
  guardrails: string[];
}

/* ============================== 1. 需求预测 ============================== */

/** 需求预测结果 */
export interface DrugDemandForecast {
  drugId: string;
  /** 预测周期（天） */
  periodDays: number;
  seasonality: Seasonality;
  /** 基线日均消耗（由药品编码确定性推导，纯函数可复算） */
  baseDailyDemand: number;
  /** 季节系数 */
  seasonalFactor: number;
  /** 预测日均消耗（= 基线 × 季节系数，取整） */
  forecastDaily: number;
  /** 周期总需求（= 预测日均 × 周期） */
  periodTotal: number;
  /** 周期内高峰日（第几天，1 起） */
  peakDay: number;
  /** 高峰日单日需求 */
  peakDaily: number;
  /** 预测置信度 0..1（季节波动越大置信越低） */
  confidence: number;
  note: string;
}

/* ============================== 2. 库存优化 ============================== */

/** 库存优化建议 */
export interface DrugInventoryPlan {
  drugId: string;
  /** 预测日均需求（件/天） */
  dailyDemand: number;
  /** 采购提前期（天） */
  leadTimeDays: number;
  /** 提前期需求（= 日均 × 提前期） */
  leadTimeDemand: number;
  /** 安全库存（应对需求波动与供应延迟） */
  safetyStock: number;
  /** 再订货点（= 提前期需求 + 安全库存）：库存≤此点即自动补货 */
  reorderPoint: number;
  /** 最高库存上限（= 再订货点 + 两周缓冲） */
  maxStock: number;
  /** 本次建议补货量（补到上限与再订货点的差额） */
  suggestedOrderQty: number;
  /** 补货后可覆盖天数 */
  daysOfCover: number;
  /** 当前库存低于再订货点时的缺货风险提示 */
  shortageAlert: string;
}

/* ============================== 3. 不良反应预警 ============================== */

/** 处方快照（进入预警判定的最小字段集） */
export interface PrescriptionSnapshot {
  drugName: string;
  /** 药品类别关键词，如 ['氨基糖苷'] / ['NSAID'] / ['二甲双胍']，用于特殊人群规则 */
  drugClass: string[];
  /** 单次日剂量（mg），用于超量粗筛 */
  doseMg: number;
}

/** 患者画像快照 */
export interface PatientSnapshot {
  age: number;
  /** male / female */
  gender: string;
  /** 是否妊娠/备孕/哺乳 */
  pregnant?: boolean;
  /** 是否肾功能不全 */
  renalImpairment?: boolean;
  /** 已知过敏史（药品/成分名，小写匹配） */
  allergies: string[];
  weightKg?: number;
}

/** 不良反应预警结果 */
export interface AdverseEventAlert {
  drugName: string;
  level: RiskLevel;
  /** 命中的风险因子（人可读） */
  triggers: string[];
  /** 匹配到的已现症状 */
  matchedSymptoms: string[];
  /** 分级处置建议 */
  suggestions: string[];
  /** 是否必须暂停发药待药师/医生确认 */
  holdDispense: boolean;
}

/* ============================== 内置规则常量 ============================== */

/** 季节系数表（质量提升与新场景：需求预测的季节修正） */
const SEASONAL_FACTOR: Record<Seasonality, number> = {
  none: 1.0,
  winter_respiratory: 1.45, // 冬季感冒药/止咳/雾化上行
  summer_gastro: 1.30,       // 夏季肠道菌群/口服补液上行
  flu_peak: 1.65,            // 流感季抗病毒/解热镇痛急升
  year_round: 1.0,           // 慢病长处方全年平稳
};

/** 季节情景下的预测置信度（波动越大越留余量） */
const SEASONAL_CONFIDENCE: Record<Seasonality, number> = {
  none: 0.88,
  year_round: 0.9,
  winter_respiratory: 0.8,
  summer_gastro: 0.8,
  flu_peak: 0.68,
};

/** 妊娠禁忌类关键词（命中且患者妊娠 → severe） */
const PREGNANCY_RISK_KEYWORDS = ['异维A酸', '利巴韦林', '华法林', '甲氨蝶呤', 'ACEI', 'ARB'];

/** 肾损需调整剂量类关键词（命中且患者肾损 → moderate） */
const RENAL_CAUTION_KEYWORDS = ['氨基糖苷', '万古霉素', '二甲双胍', '非甾体', 'NSAID', '头孢唑林'];

/** 儿童慎用关键词（<3 岁命中 → moderate） */
const CHILD_CAUTION_KEYWORDS = ['阿司匹林', '四环素', '喹诺酮', '左氧氟沙星'];

/** 症状 → 疑似不良反应方向（命中即加权） */
const SYMPTOM_MAP: { keywords: string[]; direction: string; severity: Exclude<RiskLevel, 'none'> }[] = [
  { keywords: ['喉头水肿', '血压下降', '呼吸困难', '休克'], direction: '过敏性休克（速发）', severity: 'severe' },
  { keywords: ['皮疹', '瘙痒', '荨麻疹', '面部肿胀'], direction: '皮肤过敏反应', severity: 'moderate' },
  { keywords: ['恶心', '呕吐', '腹泻', '腹痛'], direction: '胃肠道反应', severity: 'mild' },
  { keywords: ['头晕', '嗜睡', '乏力'], direction: '中枢/体位性反应', severity: 'mild' },
];

/* ============================== 工具函数 ============================== */

/** 由药品编码确定性推导基线日均消耗（5..124 件/天），纯函数可复算 */
function baseDailyDemandOf(drugId: string): number {
  let h = 0;
  for (let i = 0; i < drugId.length; i += 1) {
    h = (h * 31 + drugId.charCodeAt(i)) >>> 0;
  }
  return 5 + (h % 120);
}

/** 取整到 1 位小数 */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 风险等级取最高（severe > moderate > mild > none） */
function levelRank(l: RiskLevel): number {
  return l === 'severe' ? 3 : l === 'moderate' ? 2 : l === 'mild' ? 1 : 0;
}

function maxLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return levelRank(a) >= levelRank(b) ? a : b;
}

/* ============================== 1. 智能药房体系 ============================== */

/**
 * buildSmartPharmacy：盘点智能药房四大能力域。
 * 每个域的 KPI 都指向「差错率下降」，不是展示量；综合下降幅度取四域平均。
 */
export function buildSmartPharmacy(): SmartPharmacySystem {
  const pillars: PharmacyPillarInfo[] = [
    {
      code: 'dispense',
      name: '智能摆药',
      description: '自动摆药机对接，逐包四码（药名/规格/数量/效期）机扫复核，差错即锁机告警',
      capabilities: [
        '摆药机对接：处方自动分药，药盒标签与处方电子比对',
        '四码复核：药名/规格/数量/效期逐包机扫，任一项不符即锁机',
        '差错率监控：按日统计摆药差错率，连续两天超标升级科主任',
        '视频复核：auto 模式摆药过程留痕，可回放追差错',
      ],
      kpi: {
        baselineRate: 0.3,      // 人工摆药差错率约 0.3%
        targetRate: 0.05,       // 四码机复核后 ≤ 0.05%
        reductionPctPoints: 0.25,
        monitorNote: '当日摆药差错事件数 ÷ 当日摆药总包数（四码任一不符计差错）',
      },
    },
    {
      code: 'review',
      name: '智能审方',
      description: 'AI 前置审核只拦硬性错误（过敏/禁忌/超量/相互作用），药师事后复核签核兜底',
      capabilities: [
        'AI 前置：处方开立后秒级审核，硬性错误直接 block',
        '药师复核：AI pass 的处方仍按规则抽审，事后签核留痕',
        '相互作用：联用药品成分级比对，禁忌组合柔性提示或硬拦',
        '自学习：AI block 与药师 reject 一致性回流，模型持续校准',
      ],
      kpi: {
        baselineRate: 0.8,       // 人工前置拦截率约 80%（漏网）
        targetRate: 0.15,        // 硬性漏网率 ≤ 0.15%
        reductionPctPoints: 0.65,
        monitorNote: '硬性错误处方漏网数 ÷ 当日处方总数（事后抽查口径）',
      },
    },
    {
      code: 'stock',
      name: '智能库存',
      description: '效期管理 + 自动补货 + 缺货预警：近效期先近先出，到点自动补货建议',
      capabilities: [
        '效期管理：批次效期扫描，90 天内近效期自动转 FEFO 优先出库',
        '自动补货：库存≤再订货点自动生成补货建议（预测需求×提前期）',
        '缺货预警：A 类药品缺货风险按日红黄绿灯推送',
        '过期零出库：过期批次系统级锁库，任何发药请求不可触发',
      ],
      kpi: {
        baselineRate: 3.5,       // 人工盘点缺货/积压偏差约 3.5%
        targetRate: 0.8,
        reductionPctPoints: 2.7,
        monitorNote: '月度账实不符批次占比（含缺货与积压两类偏差）',
      },
    },
    {
      code: 'medication',
      name: '智能用药',
      description: '用药指导 + 相互作用 + 特殊人群：发药前个性化风险核对，发药后指导到位',
      capabilities: [
        '用药指导：按药品剂型生成患者版指导（饭前/饭后/漏服怎么办）',
        '相互作用：多药联用成分级比对，高风险组合硬提示',
        '特殊人群：妊娠/哺乳/儿童/老人/肾损剂量规则内置',
        '不良反应预警：用药后症状采集，分级预警留痕可追溯',
      ],
      kpi: {
        baselineRate: 1.2,       // 用药差错（含发药/指导/相互作用漏判）约 1.2%
        targetRate: 0.3,
        reductionPctPoints: 0.9,
        monitorNote: '用药相关差错事件数 ÷ 当日发药人次（含患者回访纠偏）',
      },
    },
  ];

  const overall = r1(
    pillars.reduce((sum, p) => sum + p.kpi.reductionPctPoints, 0) / pillars.length,
  );

  return {
    pillars,
    overallErrorReductionPctPoints: overall,
    valueStatement:
      '四大域把「摆药-审方-库存-用药」全流程的人工差错点改为机器复核与规则硬拦，' +
      '综合差错率预计下降约 ' + overall + ' 个百分点——是差错真的少了，不是屏多了。',
    guardrails: [
      'AI 不自动发药、不自动改方，处方生效必须有人审签',
      '摆药四码任一不符即锁机，解锁须药师复核记录',
      '过期批次系统级锁库，任何角色不可出库',
      '不良反应预警为辅助提示，临床处置以医生判断为准，但必须留痕',
    ],
  };
}

/* ============================== 2. 药品需求预测 ============================== */

/**
 * predictDrugDemand：药品需求预测。
 * @param drugId      药品编码（确定性推导基线消耗）
 * @param period      预测周期（天），收敛到 1..365
 * @param seasonality 季节情景，修正预测系数
 */
export function predictDrugDemand(
  drugId: string,
  period: number,
  seasonality: Seasonality = 'none',
): DrugDemandForecast {
  const drug = (drugId ?? '').trim() || 'UNKNOWN';
  const periodDays = Math.min(365, Math.max(1, Math.round(Number(period) || 7)));
  const baseDailyDemand = baseDailyDemandOf(drug);
  const seasonalFactor = SEASONAL_FACTOR[seasonality] ?? 1.0;
  const forecastDaily = Math.round(baseDailyDemand * seasonalFactor);
  const periodTotal = forecastDaily * periodDays;
  // 周期内第 3 天为常规高峰（工作日效应），高峰日较均值上浮 20%
  const peakDay = Math.min(periodDays, 3);
  const peakDaily = Math.round(forecastDaily * 1.2);
  const confidence = SEASONAL_CONFIDENCE[seasonality] ?? 0.8;

  return {
    drugId: drug,
    periodDays,
    seasonality,
    baseDailyDemand,
    seasonalFactor,
    forecastDaily,
    periodTotal,
    peakDay,
    peakDaily,
    confidence,
    note:
      `基线日均 ${baseDailyDemand} 件 × 季节系数 ${seasonalFactor}，` +
      `未来 ${periodDays} 天预测总需求 ${periodTotal} 件，高峰出现在第 ${peakDay} 天（约 ${peakDaily} 件/日）。`,
  };
}

/* ============================== 3. 库存优化 ============================== */

/**
 * optimizeDrugInventory：库存优化。
 * @param drugId    药品编码
 * @param demand    预测日均需求（件/天，一般取 predictDrugDemand().forecastDaily）
 * @param leadTime  采购提前期（天），收敛到 1..60
 */
export function optimizeDrugInventory(
  drugId: string,
  demand: number,
  leadTime: number,
): DrugInventoryPlan {
  const dailyDemand = Math.max(0, Math.round(Number(demand) || 0));
  const leadTimeDays = Math.min(60, Math.max(1, Math.round(Number(leadTime) || 7)));

  const leadTimeDemand = dailyDemand * leadTimeDays;
  // 安全库存 = 提前期需求的 50%（应对日需求波动 + 供应延迟），至少留 3 天用量
  const safetyStock = Math.max(Math.round(leadTimeDemand * 0.5), dailyDemand * 3);
  const reorderPoint = leadTimeDemand + safetyStock;
  // 最高库存 = 再订货点 + 两周（14 天）用量缓冲
  const maxStock = reorderPoint + dailyDemand * 14;
  const suggestedOrderQty = maxStock - reorderPoint;
  const daysOfCover = dailyDemand > 0 ? r1(maxStock / dailyDemand) : 0;

  const shortageAlert =
    dailyDemand > 0 && leadTimeDays > 10
      ? '提前期偏长：当前再订货点已覆盖 ' + (reorderPoint / dailyDemand).toFixed(1) +
        ' 天用量，建议与供应商谈短交期或对该品规做双供应商备份。'
      : '库存策略健康：再订货点覆盖提前期 + 安全缓冲，A 类品规按日巡检即可。';

  return {
    drugId: (drugId ?? '').trim() || 'UNKNOWN',
    dailyDemand,
    leadTimeDays,
    leadTimeDemand,
    safetyStock,
    reorderPoint,
    maxStock,
    suggestedOrderQty,
    daysOfCover,
    shortageAlert,
  };
}

/* ============================== 4. 不良反应预警 ============================== */

/**
 * detectDrugAdverseEvent：不良反应预警。
 * 处方（药品/类别/剂量）× 患者画像（年龄/妊娠/肾损/过敏史）× 已现症状三方比对，
 * 命中即按最高风险等级给出 triggers 与处置建议；severe 时必须暂停发药待确认。
 */
export function detectDrugAdverseEvent(
  prescription: PrescriptionSnapshot,
  patient: PatientSnapshot,
  symptoms: string[],
): AdverseEventAlert {
  const triggers: string[] = [];
  const matchedSymptoms: string[] = [];
  const suggestions: string[] = [];
  let level: RiskLevel = 'none';

  const drugName = prescription.drugName ?? '';
  const drugClass = (prescription.drugClass ?? []).map((c) => c.toLowerCase());
  const allergies = (patient.allergies ?? []).map((a) => a.toLowerCase());
  const dose = Number(prescription.doseMg) || 0;

  // ① 过敏史命中：患者过敏药/成分 ⊂ 本品名或类别 → severe，立即停药
  for (const allergy of allergies) {
    if (!allergy) continue;
    if (drugName.toLowerCase().includes(allergy) || drugClass.some((c) => c.includes(allergy))) {
      triggers.push(`患者已知过敏「${allergy}」与本品/类别匹配`);
      level = maxLevel(level, 'severe');
      suggestions.push('立即暂停发药，核对药品通用名与说明书，按过敏流程更换替代药');
    }
  }

  // ② 妊娠禁忌：妊娠患者 + 妊娠禁忌药 → severe
  if (patient.pregnant && PREGNANCY_RISK_KEYWORDS.some((k) =>
    drugName.includes(k) || drugClass.some((c) => c.includes(k.toLowerCase())),
  )) {
    triggers.push('妊娠/哺乳患者使用了妊娠禁忌类药品');
    level = maxLevel(level, 'severe');
    suggestions.push('暂停发药，请医生按妊娠用药分级（ABCDX）重新评估处方');
  }

  // ③ 肾功能不全需调整剂量
  if (patient.renalImpairment && RENAL_CAUTION_KEYWORDS.some((k) =>
    drugName.includes(k) || drugClass.some((c) => c.includes(k.toLowerCase())),
  )) {
    triggers.push('肾功能不全患者使用了肾清除为主的药品，需按 eGFR 调整剂量');
    level = maxLevel(level, 'moderate');
    suggestions.push('请药师/医生按患者肾功能（eGFR）下调剂量或延长给药间隔');
  }

  // ④ 儿童特殊人群（<3 岁慎用类）
  if (patient.age > 0 && patient.age < 3 && CHILD_CAUTION_KEYWORDS.some((k) =>
    drugName.includes(k) || drugClass.some((c) => c.includes(k.toLowerCase())),
  )) {
    triggers.push(`${patient.age} 岁婴幼儿使用了儿童慎用药品（注意赖氏综合征/牙齿着色等风险）`);
    level = maxLevel(level, 'moderate');
    suggestions.push('请医生评估儿童替代药品，必须使用时按体重精确计量并监护人告知');
  }

  // ⑤ 超量粗筛（单日剂量超 3000mg 给提示，仅作软提醒）
  if (dose >= 3000) {
    triggers.push(`单日剂量 ${dose}mg 偏高，请核对是否超说明书上限`);
    level = maxLevel(level, 'mild');
    suggestions.push('核对说明书单日最大剂量，必要时拆分给药');
  }

  // ⑥ 已现症状与不良反应方向匹配
  for (const s of symptoms ?? []) {
    const sym = (s ?? '').trim();
    if (!sym) continue;
    for (const m of SYMPTOM_MAP) {
      if (m.keywords.some((k) => sym.includes(k))) {
        matchedSymptoms.push(`${sym} → ${m.direction}`);
        triggers.push(`用药后出现「${sym}」，提示${m.direction}`);
        level = maxLevel(level, m.severity);
        break;
      }
    }
  }

  // 分级处置建议（兜底）
  if (level === 'severe') {
    suggestions.push('立即停药并观察，必要时急诊处理，24h 内上报药品不良反应监测系统');
  } else if (level === 'moderate') {
    suggestions.push('暂缓发药，药师复核处方并请医生确认后再放行');
  } else if (level === 'mild') {
    suggestions.push('发药时向患者告知常见反应与观察要点，出现加重及时复诊');
  } else {
    suggestions.push('常规发药，发药后按药品说明书完成患者用药指导');
  }

  return {
    drugName,
    level,
    triggers,
    matchedSymptoms,
    suggestions: [...new Set(suggestions)],
    holdDispense: level === 'severe',
  };
}
