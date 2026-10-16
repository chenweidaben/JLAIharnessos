/**
 * 健澜科技 jlmedaios - M170-D 医院数据资产深化聚合器
 *
 * 【自学习与数字孪生】数据资产要可治理，不能只是清单：
 *   把全院数据资产按四大域登记入账，每条资产带「责任科室 / 敏感级别 / 质量分 /
 *   覆盖率 / 新鲜度 / 保留年限 / 是否纳入治理」元数据，既回答「我们有哪些数据」，
 *   也回答「这些数据值多少钱、缺在哪、该怎么管」——
 *   为 AI 健康大脑自学习闭环持续喂养高质量语料，为数字孪生提供可信数据底座。
 *
 * 四大资产域（与 deploy/postgres/init/340-data-asset.sql 台账口径一致）：
 *   patient   患者数据：基本信息 / 就诊记录 / 检查检验 / 用药记录
 *   medical   医疗数据：病历 / 处方 / 手术记录 / 护理记录
 *   operation 运营数据：收入 / 成本 / 绩效 / 资源利用
 *   ai        AI 数据  ：模型训练数据 / 反馈数据 / 经验数据
 *
 * 纯函数核心（不触库、不读时钟、可直接单测）：
 *  - buildDataAssetInventory(measurements?, nowIso?)
 *      四大域 15 类资产清单 + 逐条价值分 + 域汇总 + 全局缺口汇总，一次产出；
 *  - calculateDataAssetValue(asset)
 *      价值评估 = 质量×0.4 + 覆盖率×0.35 + 新鲜度×0.25，再乘域战略权重；
 *  - identifyDataGap(category, measurements?)
 *      逐资产识别「质量<60 / 覆盖<60 / 超180天未更新 / 未纳入治理」缺口；
 *  - buildDataGovernancePolicy(asset)
 *      按敏感级别 L1~L4 产出脱敏方式 / 授权模型 / 保留年限 / 质检与备份频次。
 *
 * 空输入一律返回结构完整的目录基线并打 demo 标记，绝不抛异常；
 * 任何非法数值（NaN / 负数 / 分母为 0）均安全收敛。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 四大资产域稳定键名 */
export type DataAssetCategory = 'patient' | 'medical' | 'operation' | 'ai';

/** 敏感级别：L1 公开 / L2 内部 / L3 敏感 / L4 核心机密 */
export type SensitivityLevel = 1 | 2 | 3 | 4;

/** 资产价值档位 */
export type AssetValueGrade = 'core' | 'important' | 'general' | 'dormant';

/** 缺口严重度 */
export type DataGapSeverity = 'high' | 'medium' | 'low';

/** 缺口类型 */
export type DataGapType = 'coverage' | 'quality' | 'freshness' | 'governance';

/** 单条资产的实测指标（路由层从 DB 台账 / 内存快照装入；纯函数只读不写） */
export interface AssetMeasurement {
  /** 数据量（行/条） */
  volumeRows?: number;
  /** 质量分 0~100 */
  qualityScore?: number;
  /** 覆盖率 0~100（应采尽采比例） */
  coverageRate?: number;
  /** 距上次更新天数（越小越新鲜） */
  freshnessDays?: number;
  /** 是否已纳入治理 */
  isGoverned?: boolean;
}

/** 目录元数据（静态常量，全院统一口径） */
interface AssetCatalogEntry {
  key: string;
  name: string;
  category: DataAssetCategory;
  description: string;
  ownerDept: string;
  sensitivityLevel: SensitivityLevel;
  /** 法定/制度保留年限（病历类依法从严） */
  retentionYears: number;
  maskingRequired: boolean;
}

/** 清单中的单条资产（目录元数据 + 实测指标 + 计算结果） */
export interface DataAssetItem {
  key: string;
  name: string;
  category: DataAssetCategory;
  categoryName: string;
  description: string;
  ownerDept: string;
  sensitivityLevel: SensitivityLevel;
  retentionYears: number;
  maskingRequired: boolean;
  volumeRows: number;
  qualityScore: number;
  coverageRate: number;
  freshnessDays: number;
  isGoverned: boolean;
}

/** calculateDataAssetValue 产出 */
export interface DataAssetValue {
  assetKey: string;
  /** 价值分 0~100 */
  valueScore: number;
  grade: AssetValueGrade;
  gradeLabel: string;
  /** 价值驱动因子（可解释：院长能看到这分怎么来的） */
  drivers: {
    qualityFactor: number;
    coverageFactor: number;
    freshnessFactor: number;
    strategicWeight: number;
  };
}

/** identifyDataGap 单条缺口 */
export interface DataGap {
  assetKey: string;
  assetName: string;
  category: DataAssetCategory;
  categoryName: string;
  severity: DataGapSeverity;
  gapType: DataGapType;
  /** 当前值 */
  current: number;
  /** 合格阈值 */
  threshold: number;
  message: string;
  suggestion: string;
}

/** buildDataGovernancePolicy 产出 */
export interface DataGovernancePolicy {
  assetKey: string;
  assetName: string;
  sensitivityLevel: SensitivityLevel;
  sensitivityLabel: string;
  /** 脱敏方式：none / static / dynamic / dynamic_redaction */
  maskingMode: 'none' | 'static' | 'dynamic' | 'dynamic_redaction';
  /** 访问授权：public / dept / rbac / dual_auth */
  accessControl: 'public' | 'dept' | 'rbac' | 'dual_auth';
  retentionYears: number;
  /** 质检频次：weekly / monthly / quarterly / half_yearly */
  qualityCheck: 'weekly' | 'monthly' | 'quarterly' | 'half_yearly';
  /** 备份频次：daily / weekly */
  backup: 'daily' | 'weekly';
  encryption: boolean;
  ownerDept: string;
  /** 人话治理动作清单 */
  actions: string[];
}

/** 域汇总 */
export interface DataAssetCategorySummary {
  category: DataAssetCategory;
  name: string;
  totalItems: number;
  governedItems: number;
  totalVolumeRows: number;
  avgValueScore: number;
  gapCount: number;
}

/** buildDataAssetInventory 总产出 */
export interface DataAssetInventory {
  asOf: string;
  /** 是否目录基线模式（无实测样本时置位） */
  demo: boolean;
  items: DataAssetItem[];
  categories: DataAssetCategorySummary[];
  summary: {
    totalItems: number;
    governedItems: number;
    ungovernedItems: number;
    avgValueScore: number;
    coreAssets: number;
    gapCount: number;
  };
  gaps: DataGap[];
}

/* ------------------------------- 常量与目录 ------------------------------- */

/** 域展示名 */
export const CATEGORY_NAME: Record<DataAssetCategory, string> = {
  patient: '患者数据',
  medical: '医疗数据',
  operation: '运营数据',
  ai: 'AI 数据',
};

/** 域战略权重（AI 数据为自学习战略资产，权重上浮；运营数据偏内部管理） */
export const CATEGORY_STRATEGIC_WEIGHT: Record<DataAssetCategory, number> = {
  patient: 1.0,
  medical: 1.05,
  operation: 0.85,
  ai: 1.1,
};

/** 合格线：质量 / 覆盖率低于此即视为缺口 */
export const GAP_QUALITY_THRESHOLD = 60;
export const GAP_COVERAGE_THRESHOLD = 60;
/** 超过此天数未更新即视为「陈旧」缺口 */
export const STALE_FRESHNESS_DAYS = 180;

/**
 * 全院数据资产目录（15 类，四大域）。
 * 保留年限依法从严：住院病历/手术/护理记录 30 年，门诊病历/处方/检验 15 年。
 */
export const ASSET_CATALOG: AssetCatalogEntry[] = [
  // ---- 患者数据 ----
  { key: 'patient_basic', name: '基本信息', category: 'patient', description: '姓名、证件、联系方式、主索引（EMPI）', ownerDept: '信息科', sensitivityLevel: 3, retentionYears: 15, maskingRequired: true },
  { key: 'patient_visit', name: '就诊记录', category: 'patient', description: '门急诊与住院就诊流水、就诊科室与诊断', ownerDept: '门诊部', sensitivityLevel: 3, retentionYears: 15, maskingRequired: true },
  { key: 'patient_lab', name: '检查检验', category: 'patient', description: '检验报告、检查申请与结果、影像报告', ownerDept: '检验科', sensitivityLevel: 4, retentionYears: 15, maskingRequired: true },
  { key: 'patient_medication', name: '用药记录', category: 'patient', description: '医嘱用药、发药记录、过敏史与不良反应', ownerDept: '药学部', sensitivityLevel: 3, retentionYears: 15, maskingRequired: true },
  // ---- 医疗数据 ----
  { key: 'med_record', name: '病历', category: 'medical', description: '门诊病历、住院病历、病程记录与出院小结', ownerDept: '病案室', sensitivityLevel: 4, retentionYears: 30, maskingRequired: true },
  { key: 'med_prescription', name: '处方', category: 'medical', description: '处方开具、审核、调配与点评记录', ownerDept: '药学部', sensitivityLevel: 4, retentionYears: 15, maskingRequired: true },
  { key: 'med_surgery', name: '手术记录', category: 'medical', description: '手术申请、麻醉记录、手术安全核查与术后随访', ownerDept: '手术室', sensitivityLevel: 4, retentionYears: 30, maskingRequired: true },
  { key: 'med_nursing', name: '护理记录', category: 'medical', description: '体温单、护理执行单、评估单与交接记录', ownerDept: '护理部', sensitivityLevel: 3, retentionYears: 30, maskingRequired: true },
  // ---- 运营数据 ----
  { key: 'op_revenue', name: '收入', category: 'operation', description: '门诊/住院收入、DRG/DIP 分组与医保结算', ownerDept: '财务处', sensitivityLevel: 2, retentionYears: 10, maskingRequired: false },
  { key: 'op_cost', name: '成本', category: 'operation', description: '科室成本、耗材成本、人力成本分摊', ownerDept: '财务处', sensitivityLevel: 2, retentionYears: 10, maskingRequired: false },
  { key: 'op_performance', name: '绩效', category: 'operation', description: '科室与个人绩效考核、CMI、岗位工作量', ownerDept: '绩效办', sensitivityLevel: 2, retentionYears: 10, maskingRequired: false },
  { key: 'op_resource', name: '资源利用', category: 'operation', description: '床位使用率、手术室排程、设备开机率', ownerDept: '运营管理部', sensitivityLevel: 1, retentionYears: 5, maskingRequired: false },
  // ---- AI 数据（自学习与数字孪生语料）----
  { key: 'ai_training', name: '模型训练数据', category: 'ai', description: '脱敏后用于模型训练的标注语料与特征库', ownerDept: '信息科', sensitivityLevel: 4, retentionYears: 10, maskingRequired: true },
  { key: 'ai_feedback', name: '反馈数据', category: 'ai', description: '医生采纳/修改/驳回 AI 建议的闭环反馈', ownerDept: '医务处', sensitivityLevel: 3, retentionYears: 10, maskingRequired: true },
  { key: 'ai_experience', name: '经验数据', category: 'ai', description: '诊疗经验条目、科室知识库与典型病例复盘', ownerDept: '医务处', sensitivityLevel: 2, retentionYears: 10, maskingRequired: false },
];

/**
 * 目录基线实测值（零入参时的确定性样本，演示「资产可治理」全貌）。
 * 故意保留若干缺口（用药记录未治理 / 护理记录质量偏低 / 资源利用陈旧），
 * 便于演示缺口识别与治理策略闭环。
 */
export const DEFAULT_MEASUREMENTS: Record<string, AssetMeasurement> = {
  patient_basic: { volumeRows: 120000, qualityScore: 92, coverageRate: 98, freshnessDays: 3, isGoverned: true },
  patient_visit: { volumeRows: 860000, qualityScore: 88, coverageRate: 95, freshnessDays: 2, isGoverned: true },
  patient_lab: { volumeRows: 2400000, qualityScore: 76, coverageRate: 88, freshnessDays: 5, isGoverned: true },
  patient_medication: { volumeRows: 1500000, qualityScore: 70, coverageRate: 82, freshnessDays: 6, isGoverned: false },
  med_record: { volumeRows: 480000, qualityScore: 82, coverageRate: 90, freshnessDays: 4, isGoverned: true },
  med_prescription: { volumeRows: 2100000, qualityScore: 78, coverageRate: 93, freshnessDays: 3, isGoverned: true },
  med_surgery: { volumeRows: 86000, qualityScore: 85, coverageRate: 96, freshnessDays: 7, isGoverned: true },
  med_nursing: { volumeRows: 3200000, qualityScore: 58, coverageRate: 64, freshnessDays: 12, isGoverned: false },
  op_revenue: { volumeRows: 3600, qualityScore: 90, coverageRate: 100, freshnessDays: 1, isGoverned: true },
  op_cost: { volumeRows: 2800, qualityScore: 72, coverageRate: 85, freshnessDays: 15, isGoverned: true },
  op_performance: { volumeRows: 520, qualityScore: 66, coverageRate: 70, freshnessDays: 30, isGoverned: true },
  op_resource: { volumeRows: 12000, qualityScore: 52, coverageRate: 58, freshnessDays: 45, isGoverned: false },
  ai_training: { volumeRows: 950000, qualityScore: 64, coverageRate: 72, freshnessDays: 20, isGoverned: true },
  ai_feedback: { volumeRows: 38000, qualityScore: 74, coverageRate: 80, freshnessDays: 8, isGoverned: true },
  ai_experience: { volumeRows: 26000, qualityScore: 48, coverageRate: 55, freshnessDays: 120, isGoverned: false },
};

/* ------------------------------- 工具函数 ------------------------------- */

/** 安全收敛为非负整数 */
function asCount(n: unknown): number {
  const v = Math.floor(Number(n) || 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** 安全收敛 0~100 分，保留 1 位小数 */
function asScore100(n: unknown): number {
  const v = Number(n) || 0;
  if (!Number.isFinite(v)) return 0;
  return Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
}

/** 保留 1 位小数 */
function r1(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;
}

/** 新鲜度折算：距更新越近分越高 */
function freshnessFactor(days: number): number {
  const d = asCount(days);
  if (d <= 7) return 100;
  if (d <= 30) return 80;
  if (d <= 90) return 60;
  if (d <= 180) return 40;
  return 20;
}

/** 把目录条目 + 实测指标装配成清单资产 */
function buildItem(entry: AssetCatalogEntry, m: AssetMeasurement): DataAssetItem {
  return {
    key: entry.key,
    name: entry.name,
    category: entry.category,
    categoryName: CATEGORY_NAME[entry.category],
    description: entry.description,
    ownerDept: entry.ownerDept,
    sensitivityLevel: entry.sensitivityLevel,
    retentionYears: entry.retentionYears,
    maskingRequired: entry.maskingRequired,
    volumeRows: asCount(m.volumeRows),
    qualityScore: asScore100(m.qualityScore),
    coverageRate: asScore100(m.coverageRate),
    freshnessDays: asCount(m.freshnessDays),
    isGoverned: m.isGoverned === true,
  };
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * calculateDataAssetValue：单条资产价值评估。
 *
 * 模型（可解释、可复算）：
 *   value = (质量×0.4 + 覆盖率×0.35 + 新鲜度×0.25) × 域战略权重
 *   - 质量分：字段完整率 / 一致性 / 及时性；
 *   - 覆盖率：应采尽采比例，覆盖不全的资产喂不了 AI；
 *   - 新鲜度：≤7天 100 / ≤30天 80 / ≤90天 60 / ≤180天 40 / 其余 20；
 *   - 战略权重：医疗 1.05、AI 1.10（自学习语料）、患者 1.00、运营 0.85。
 *
 * 档位：≥80 核心 / ≥60 重要 / ≥40 一般 / <40 待盘活。
 *
 * 纯函数：不触库、不抛错。
 */
export function calculateDataAssetValue(asset: DataAssetItem): DataAssetValue {
  const qualityFactor = asScore100(asset.qualityScore);
  const coverageFactor = asScore100(asset.coverageRate);
  const freshness = freshnessFactor(asset.freshnessDays);
  const weight = CATEGORY_STRATEGIC_WEIGHT[asset.category] ?? 1;

  const raw = qualityFactor * 0.4 + coverageFactor * 0.35 + freshness * 0.25;
  const valueScore = asScore100(raw * weight);

  let grade: AssetValueGrade;
  let gradeLabel: string;
  if (valueScore >= 80) {
    grade = 'core';
    gradeLabel = '核心资产';
  } else if (valueScore >= 60) {
    grade = 'important';
    gradeLabel = '重要资产';
  } else if (valueScore >= 40) {
    grade = 'general';
    gradeLabel = '一般资产';
  } else {
    grade = 'dormant';
    gradeLabel = '待盘活';
  }

  return {
    assetKey: asset.key,
    valueScore,
    grade,
    gradeLabel,
    drivers: {
      qualityFactor,
      coverageFactor,
      freshnessFactor: freshness,
      strategicWeight: weight,
    },
  };
}

/**
 * identifyDataGap：某资产域的数据缺口识别。
 *
 * 逐资产检查四类缺口：
 *   coverage   覆盖率 < 60
 *   quality    质量分 < 60
 *   freshness  距更新 > 180 天（陈旧，喂不了自学习）
 *   governance 未纳入治理（元数据缺失、责任科室不清）
 *
 * 严重度：质量/覆盖 < 40、陈旧 > 365 天、或 L4 资产未治理 → high；
 *         未过合格线 → medium；其余 → low。
 * 结果按严重度（high→low）再按缺口幅度降序。
 *
 * 纯函数：不触库；域无缺口返回空数组，绝不抛错。
 *
 * @param category      资产域
 * @param measurements  实测指标（可空，空则用目录基线）
 */
export function identifyDataGap(
  category: DataAssetCategory,
  measurements?: Record<string, AssetMeasurement> | null,
): DataGap[] {
  const m = measurements ?? DEFAULT_MEASUREMENTS;
  const entries = ASSET_CATALOG.filter((e) => e.category === category);
  const gaps: DataGap[] = [];

  for (const entry of entries) {
    const asset = buildItem(entry, m[entry.key] ?? {});

    // coverage
    if (asset.coverageRate < GAP_COVERAGE_THRESHOLD) {
      const severity: DataGapSeverity =
        asset.coverageRate < 40 ? 'high' : asset.coverageRate < GAP_COVERAGE_THRESHOLD ? 'medium' : 'low';
      gaps.push({
        assetKey: asset.key,
        assetName: asset.name,
        category,
        categoryName: CATEGORY_NAME[category],
        severity,
        gapType: 'coverage',
        current: asset.coverageRate,
        threshold: GAP_COVERAGE_THRESHOLD,
        message: `覆盖率 ${asset.coverageRate}%，低于合格线 ${GAP_COVERAGE_THRESHOLD}%`,
        suggestion: `补采「${asset.name}」缺失字段，优先把高频必填项接入采集口径。`,
      });
    }

    // quality
    if (asset.qualityScore < GAP_QUALITY_THRESHOLD) {
      const severity: DataGapSeverity =
        asset.qualityScore < 40 ? 'high' : asset.qualityScore < GAP_QUALITY_THRESHOLD ? 'medium' : 'low';
      gaps.push({
        assetKey: asset.key,
        assetName: asset.name,
        category,
        categoryName: CATEGORY_NAME[category],
        severity,
        gapType: 'quality',
        current: asset.qualityScore,
        threshold: GAP_QUALITY_THRESHOLD,
        message: `质量分 ${asset.qualityScore}，低于合格线 ${GAP_QUALITY_THRESHOLD}`,
        suggestion: `开展「${asset.name}」质量专项：查重、补全、修正脏数据，达标后再作为自学习语料。`,
      });
    }

    // freshness
    if (asset.freshnessDays > STALE_FRESHNESS_DAYS) {
      const severity: DataGapSeverity = asset.freshnessDays > 365 ? 'high' : 'medium';
      gaps.push({
        assetKey: asset.key,
        assetName: asset.name,
        category,
        categoryName: CATEGORY_NAME[category],
        severity,
        gapType: 'freshness',
        current: asset.freshnessDays,
        threshold: STALE_FRESHNESS_DAYS,
        message: `已 ${asset.freshnessDays} 天未更新，超过陈旧阈值 ${STALE_FRESHNESS_DAYS} 天`,
        suggestion: `打通「${asset.name}」同步链路，保证自学习与数字孪生拿到的是鲜活数据。`,
      });
    }

    // governance
    if (!asset.isGoverned) {
      const severity: DataGapSeverity = asset.sensitivityLevel >= 4 ? 'high' : 'medium';
      gaps.push({
        assetKey: asset.key,
        assetName: asset.name,
        category,
        categoryName: CATEGORY_NAME[category],
        severity,
        gapType: 'governance',
        current: 0,
        threshold: 1,
        message: `尚未纳入治理台账（责任科室/分级/策略未落地）`,
        suggestion: `由「${asset.ownerDept}」牵头登记台账、指定数据Owner并落实脱敏与授权策略。`,
      });
    }
  }

  return gaps.sort((a, b) => {
    const sevRank = { high: 0, medium: 1, low: 2 };
    if (sevRank[a.severity] !== sevRank[b.severity])
      return sevRank[a.severity] - sevRank[b.severity];
    return a.assetName.localeCompare(b.assetName, 'zh-CN');
  });
}

/**
 * buildDataGovernancePolicy：单条资产的治理策略。
 *
 * 按敏感级别 L1~L4 产出可落地动作（脱敏方式 / 授权模型 / 保留年限 /
 * 质检频次 / 备份频次 / 是否加密），并把病历类法定保留年限硬编码进目录。
 *
 * 纯函数：不触库、不抛错。
 */
export function buildDataGovernancePolicy(asset: DataAssetItem): DataGovernancePolicy {
  const lvl = asset.sensitivityLevel;
  const base: Record<
    SensitivityLevel,
    {
      label: string;
      maskingMode: DataGovernancePolicy['maskingMode'];
      accessControl: DataGovernancePolicy['accessControl'];
      qualityCheck: DataGovernancePolicy['qualityCheck'];
      backup: DataGovernancePolicy['backup'];
      encryption: boolean;
      defaultRetention: number;
    }
  > = {
    1: {
      label: 'L1 公开',
      maskingMode: 'none',
      accessControl: 'public',
      qualityCheck: 'half_yearly',
      backup: 'weekly',
      encryption: false,
      defaultRetention: 5,
    },
    2: {
      label: 'L2 内部',
      maskingMode: 'static',
      accessControl: 'dept',
      qualityCheck: 'quarterly',
      backup: 'weekly',
      encryption: false,
      defaultRetention: 10,
    },
    3: {
      label: 'L3 敏感',
      maskingMode: 'dynamic',
      accessControl: 'rbac',
      qualityCheck: 'monthly',
      backup: 'daily',
      encryption: true,
      defaultRetention: 15,
    },
    4: {
      label: 'L4 核心机密',
      maskingMode: 'dynamic_redaction',
      accessControl: 'dual_auth',
      qualityCheck: 'weekly',
      backup: 'daily',
      encryption: true,
      defaultRetention: 15,
    },
  };

  const cfg = base[lvl];
  // 目录中已按法规标注保留年限，优先采用；否则按敏感级别默认值
  const retentionYears = asset.retentionYears > 0 ? asset.retentionYears : cfg.defaultRetention;

  const actions: string[] = [];
  if (asset.maskingRequired) {
    actions.push(lvl >= 4 ? '对外输出一律动态脱敏，PHI 字段掩码展示' : '按角色动态脱敏，最小可见原则');
  }
  if (cfg.encryption) actions.push('落库加密存储，密钥分级托管');
  actions.push(
    lvl >= 4
      ? '访问需双人授权并全程留痕审计'
      : lvl === 3
        ? '按角色授权，越权访问实时告警'
        : '科室内部授权可见',
  );
  actions.push(
    `依法保留 ${retentionYears} 年，到期经审批后安全销毁`,
    lvl >= 3 ? `每周质量巡检 + 每日备份` : `每季度质量巡检 + 每周备份`,
  );
  if (!asset.isGoverned) {
    actions.unshift('【紧急】先补登治理台账，指定数据 Owner 再开放使用');
  }

  return {
    assetKey: asset.key,
    assetName: asset.name,
    sensitivityLevel: lvl,
    sensitivityLabel: cfg.label,
    maskingMode: cfg.maskingMode,
    accessControl: cfg.accessControl,
    retentionYears,
    qualityCheck: cfg.qualityCheck,
    backup: cfg.backup,
    encryption: cfg.encryption,
    ownerDept: asset.ownerDept,
    actions,
  };
}

/**
 * buildDataAssetInventory：全院数据资产清单（可治理版）。
 *
 * 流程：
 *  1. 15 类目录条目逐一叠加实测指标（未提供用目录基线）；
 *  2. 逐条计算资产价值（calculateDataAssetValue）；
 *  3. 按四大域汇总：资产数 / 已治理数 / 数据量 / 平均价值分 / 缺口数；
 *  4. 汇总全局缺口（identifyDataGap 遍历四域）；
 *  5. 无实测输入时 demo=true，绝不以基线冒充真实台账结论。
 *
 * 纯函数：不修改入参；不触库；nowIso 由调用方注入（默认当前时间）。
 *
 * @param measurements 实测指标映射（assetKey → 指标，可空）
 * @param nowIso       生成时间 ISO 串（注入，便于测试）
 */
export function buildDataAssetInventory(
  measurements?: Record<string, AssetMeasurement> | null,
  nowIso: string = new Date().toISOString(),
): DataAssetInventory {
  const hasLive = !!measurements;
  const source = measurements ?? DEFAULT_MEASUREMENTS;

  const items: DataAssetItem[] = ASSET_CATALOG.map((entry) =>
    buildItem(entry, source[entry.key] ?? {}),
  );

  const categories: DataAssetCategorySummary[] = (
    ['patient', 'medical', 'operation', 'ai'] as DataAssetCategory[]
  ).map((category) => {
    const list = items.filter((i) => i.category === category);
    const values = list.map((i) => calculateDataAssetValue(i).valueScore);
    const gaps = identifyDataGap(category, source);
    return {
      category,
      name: CATEGORY_NAME[category],
      totalItems: list.length,
      governedItems: list.filter((i) => i.isGoverned).length,
      totalVolumeRows: list.reduce((a, i) => a + i.volumeRows, 0),
      avgValueScore: values.length
        ? r1(values.reduce((a, v) => a + v, 0) / values.length)
        : 0,
      gapCount: gaps.length,
    };
  });

  const gaps: DataGap[] = categories
    .flatMap((c) => identifyDataGap(c.category, source))
    .sort((a, b) => {
      const sevRank = { high: 0, medium: 1, low: 2 };
      if (sevRank[a.severity] !== sevRank[b.severity])
        return sevRank[a.severity] - sevRank[b.severity];
      return a.assetKey.localeCompare(b.assetKey);
    });

  const allValues = items.map((i) => calculateDataAssetValue(i).valueScore);
  const governedItems = items.filter((i) => i.isGoverned).length;

  return {
    asOf: nowIso,
    demo: !hasLive,
    items,
    categories,
    summary: {
      totalItems: items.length,
      governedItems,
      ungovernedItems: items.length - governedItems,
      avgValueScore: allValues.length
        ? r1(allValues.reduce((a, v) => a + v, 0) / allValues.length)
        : 0,
      coreAssets: allValues.filter((v) => v >= 80).length,
      gapCount: gaps.length,
    },
    gaps,
  };
}
