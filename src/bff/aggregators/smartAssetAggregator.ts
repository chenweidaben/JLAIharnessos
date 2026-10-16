/**
 * 健澜科技 jlmedaios - M161-B 全院智慧资产看板聚合器
 *
 * 【核心主张】智慧资产要量化，不能只说「很聪明」。
 * 把全院智慧资产拆成可计数、可饱和折算、可横向对标、可识别缺口的四个维度：
 *
 *   经验资产：医生 / 护士 / 药师 三类角色沉淀的经验条数
 *   知识资产：疾病 / 药物 / 指南 三类知识条目
 *   模型资产：诊断 / 预测 / 推荐 三类上线模型
 *   数据资产：结构化 / 非结构化 两类数据资产量
 *
 * 纯函数核心（不触库、不读时钟、可直接单测）：
 *  - buildSmartAssetDashboard(hospitalId, input?, nowIso?)
 *      四维资产计数卡 + 子项饱和得分 + 加权智慧资产总分 + 对标段位 + 缺口清单，一次产出；
 *  - calculateAssetGrowth(period, snapshots?, nowIso?)
 *      把有序期快照聚合成四维 delta / 增长率 + 上下行结论；
 *  - identifyAssetGap(input?)
 *      逐子项算「距目标还差多少」，按缺口大小降序给出补齐优先级；
 *  - benchmarkAssetLevel(score)
 *      把 0-100 的智慧资产总分映射到 起步 / 成长 / 成熟 / 卓越 四档段位，并给对标话术。
 *
 * 空输入一律返回结构完整的零值结果并打 demo 标记，绝不抛异常；
 * 任何非法数值（NaN / 负数 / 分母为 0）均安全收敛为 0。
 *
 * 【远期深化】：后续可接入真实资产目录（CMDB / 模型仓库 / 知识图谱节点表），
 *   把「计数」升级为「带元数据的资产清单」，并引入跨院对标基准库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 四大资产维度稳定键名 */
export type AssetDimensionKey = 'experience' | 'knowledge' | 'model' | 'data';

/** 对标段位 */
export type AssetLevel = 'outstanding' | 'mature' | 'growing' | 'starter';

/** 看板输入快照（路由层从内存计数 / DB 行装入；纯函数只读不写） */
export interface SmartAssetInput {
  /* ---- 经验资产 ---- */
  /** 医生经验沉淀条数 */
  doctorExperience: number;
  /** 护士经验沉淀条数 */
  nurseExperience: number;
  /** 药师经验沉淀条数 */
  pharmacistExperience: number;
  /* ---- 知识资产 ---- */
  /** 疾病知识条目数 */
  diseaseKnowledge: number;
  /** 药物知识条目数 */
  drugKnowledge: number;
  /** 临床指南条目数 */
  guidelineKnowledge: number;
  /* ---- 模型资产 ---- */
  /** 已上线诊断模型数 */
  diagnosisModels: number;
  /** 已上线预测模型数 */
  predictionModels: number;
  /** 已上线推荐模型数 */
  recommendationModels: number;
  /* ---- 数据资产 ---- */
  /** 结构化数据资产量（万条口径） */
  structuredAssets: number;
  /** 非结构化数据资产量（万条口径） */
  unstructuredAssets: number;
}

/** 单个子资产项（可解释：院长能看到这分是怎么算的） */
export interface AssetSubItem {
  key: string;
  name: string;
  /** 当前计数 */
  count: number;
  /** 饱和目标：达到即满分 */
  target: number;
  /** 折算得分 0~100 */
  score: number;
  /** 距目标还差多少计数（<=0 表示已饱和） */
  gap: number;
}

/** 维度汇总明细 */
export interface AssetDimension {
  key: AssetDimensionKey;
  name: string;
  /** 维度内子项计数之和 */
  total: number;
  /** 权重（%，四维权重和 = 100） */
  weight: number;
  /** 维度饱和得分 0~100（子项均分） */
  score: number;
  /** 加权贡献 = score * weight / 100 */
  weightedContribution: number;
  /** 子项明细 */
  subs: AssetSubItem[];
  /** 是否弱项（< 60） */
  isWeak: boolean;
}

/** buildSmartAssetDashboard 总产出 */
export interface SmartAssetDashboard {
  hospitalId: string;
  asOf: string;
  /** 是否演示模式（无真实样本时置位） */
  demo: boolean;
  /** 全院智慧资产总计数（四维合计） */
  totalAssets: number;
  /** 四维明细（按权重降序） */
  dimensions: AssetDimension[];
  /** 智慧资产总分 0~100 */
  smartScore: number;
  /** 对标段位 */
  level: AssetLevel;
  levelLabel: string;
  /** 缺口清单（来自 identifyAssetGap，按缺口降序） */
  gaps: AssetGap[];
}

/** 缺口单项 */
export interface AssetGap {
  /** 所属维度键 */
  dimension: AssetDimensionKey;
  /** 所属维度名 */
  dimensionName: string;
  /** 子项键（如 doctorExperience） */
  subKey: string;
  /** 子项名 */
  subName: string;
  /** 当前计数 */
  current: number;
  /** 饱和目标 */
  target: number;
  /** 距目标尚缺计数（>0 才进入缺口清单） */
  shortfall: number;
  /** 缺口严重度：score<40 high / <60 medium / 其余 low */
  severity: 'high' | 'medium' | 'low';
  /** 人话补齐建议 */
  suggestion: string;
}

/** 增长报告历史快照点（由调用方按时间正序注入） */
export interface SmartAssetSnapshot {
  /** 统计期标签（YYYY-MM，字典序即时间序） */
  period: string;
  /** 期末经验资产总量 */
  experience: number;
  /** 期末知识资产总量 */
  knowledge: number;
  /** 期末模型资产总量 */
  model: number;
  /** 期末数据资产总量 */
  data: number;
  /** 期末智慧资产总分 0~100 */
  smartScore: number;
}

/** calculateAssetGrowth 总产出 */
export interface SmartAssetGrowth {
  hospitalId: string;
  /** 报告窗口标签（如 month / quarter，由调用方注入） */
  period: string;
  generatedAt: string;
  /** 时间序列（旧→新） */
  series: SmartAssetSnapshot[];
  /** 期末 - 期初各资产量变化 */
  delta: { experience: number; knowledge: number; model: number; data: number; smartScore: number };
  /** 各资产量增长率（%，首点为 0 时安全回落 0） */
  growthRate: {
    experience: number;
    knowledge: number;
    model: number;
    data: number;
    smartScore: number;
  };
  /** 是否整体上行（期末总分 > 期初） */
  rising: boolean;
  /** 院长视角结论话术 */
  conclusion: string;
}

/** benchmarkAssetLevel 总产出 */
export interface AssetBenchmark {
  score: number;
  level: AssetLevel;
  levelLabel: string;
  /** 当前已越过的下一档段位名（无则为 null） */
  nextLevel: AssetLevel | null;
  nextLabel: string | null;
  /** 距下一档还差多少分 */
  gapToNext: number;
  /** 对标话术（与区域同级医院 / 标杆对比） */
  comment: string;
}

/* ------------------------------- 常量与工具 ------------------------------- */

/** 各子项饱和目标：达到即满分 100 */
export const SUB_TARGETS = {
  doctorExperience: 3000,
  nurseExperience: 2000,
  pharmacistExperience: 800,
  diseaseKnowledge: 500,
  drugKnowledge: 2000,
  guidelineKnowledge: 300,
  diagnosisModels: 50,
  predictionModels: 30,
  recommendationModels: 40,
  structuredAssets: 8000,
  unstructuredAssets: 4000,
} as const;

/** 维度权重（%，和 = 100） */
export const DIMENSION_WEIGHT: Record<AssetDimensionKey, number> = {
  experience: 30,
  knowledge: 25,
  model: 25,
  data: 20,
};

/** 维度展示名 */
export const DIMENSION_NAME: Record<AssetDimensionKey, string> = {
  experience: '经验资产',
  knowledge: '知识资产',
  model: '模型资产',
  data: '数据资产',
};

/** 弱项阈值 */
export const WEAK_SCORE_THRESHOLD = 60;
/** 高严重度缺口阈值 */
export const HIGH_GAP_SCORE = 40;

/** 安全收敛为非负整数 */
function asCount(n: unknown): number {
  const v = Math.floor(Number(n) || 0);
  return v > 0 ? v : 0;
}

/** 安全收敛 0~100 分 */
function asScore100(n: unknown): number {
  const v = Number(n) || 0;
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

/** 计数饱和折算：count/target*100，截顶 100，保留 1 位小数 */
function countToScore(count: number, target: number): number {
  if (!Number.isFinite(count) || count <= 0 || target <= 0) return 0;
  const s = (count / target) * 100;
  return Math.round(Math.min(100, Math.max(0, s)) * 10) / 10;
}

/** 保留 1 位小数 */
function r1(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;
}

/** 保留 0 位百分数 */
function r0(n: number): number {
  return Math.round(Number.isFinite(n) ? n : 0);
}

/** 输入安全归一化：缺失字段回落零值，绝不抛错 */
function normalizeInput(input?: Partial<SmartAssetInput> | null): SmartAssetInput {
  const i = input ?? {};
  return {
    doctorExperience: asCount(i.doctorExperience),
    nurseExperience: asCount(i.nurseExperience),
    pharmacistExperience: asCount(i.pharmacistExperience),
    diseaseKnowledge: asCount(i.diseaseKnowledge),
    drugKnowledge: asCount(i.drugKnowledge),
    guidelineKnowledge: asCount(i.guidelineKnowledge),
    diagnosisModels: asCount(i.diagnosisModels),
    predictionModels: asCount(i.predictionModels),
    recommendationModels: asCount(i.recommendationModels),
    structuredAssets: asCount(i.structuredAssets),
    unstructuredAssets: asCount(i.unstructuredAssets),
  };
}

/** 子项元数据：键 → 展示名 + 归属维度 */
const SUB_META: Array<{
  key: keyof typeof SUB_TARGETS;
  name: string;
  dimension: AssetDimensionKey;
  dimensionName: string;
}> = [
  { key: 'doctorExperience', name: '医生经验', dimension: 'experience', dimensionName: '经验资产' },
  { key: 'nurseExperience', name: '护士经验', dimension: 'experience', dimensionName: '经验资产' },
  { key: 'pharmacistExperience', name: '药师经验', dimension: 'experience', dimensionName: '经验资产' },
  { key: 'diseaseKnowledge', name: '疾病知识', dimension: 'knowledge', dimensionName: '知识资产' },
  { key: 'drugKnowledge', name: '药物知识', dimension: 'knowledge', dimensionName: '知识资产' },
  { key: 'guidelineKnowledge', name: '临床指南', dimension: 'knowledge', dimensionName: '知识资产' },
  { key: 'diagnosisModels', name: '诊断模型', dimension: 'model', dimensionName: '模型资产' },
  { key: 'predictionModels', name: '预测模型', dimension: 'model', dimensionName: '模型资产' },
  { key: 'recommendationModels', name: '推荐模型', dimension: 'model', dimensionName: '模型资产' },
  { key: 'structuredAssets', name: '结构化数据', dimension: 'data', dimensionName: '数据资产' },
  { key: 'unstructuredAssets', name: '非结构化数据', dimension: 'data', dimensionName: '数据资产' },
];

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * benchmarkAssetLevel：智慧资产总分 → 对标段位。
 *
 * 段位阈值（0~100）：
 *   >=85 卓越 outstanding（区域标杆）
 *   >=70 成熟 mature
 *   >=50 成长 growing
 *   <50  起步 starter
 *
 * 纯函数：不触库、不抛错。
 *
 * @param score 智慧资产总分 0~100（越界安全收敛）
 */
export function benchmarkAssetLevel(score: number): AssetBenchmark {
  const s = asScore100(score);

  let level: AssetLevel;
  let levelLabel: string;
  if (s >= 85) {
    level = 'outstanding';
    levelLabel = '卓越 · 区域标杆';
  } else if (s >= 70) {
    level = 'mature';
    levelLabel = '成熟';
  } else if (s >= 50) {
    level = 'growing';
    levelLabel = '成长';
  } else {
    level = 'starter';
    levelLabel = '起步';
  }

  // 下一档：starter→growing(50)→mature(70)→outstanding(85)
  let nextLevel: AssetLevel | null = null;
  let nextLabel: string | null = null;
  let gapToNext = 0;
  if (s < 50) {
    nextLevel = 'growing';
    nextLabel = '成长';
    gapToNext = r1(50 - s);
  } else if (s < 70) {
    nextLevel = 'mature';
    nextLabel = '成熟';
    gapToNext = r1(70 - s);
  } else if (s < 85) {
    nextLevel = 'outstanding';
    nextLabel = '卓越 · 区域标杆';
    gapToNext = r1(85 - s);
  }

  const comment =
    nextLevel === null
      ? `已达「${levelLabel}」段位，位列区域同级医院第一梯队，建议保持领先并输出标杆经验。`
      : `当前「${levelLabel}」段位，距「${nextLabel}」还差 ${gapToNext.toFixed(1)} 分，优先补齐下方高严重度缺口。`;

  return { score: s, level, levelLabel, nextLevel, nextLabel, gapToNext, comment };
}

/**
 * identifyAssetGap：识别全院智慧资产缺口。
 *
 * 逐子项计算「距饱和目标还差多少计数」，仅保留 shortfall>0 的项，
 * 按缺口数量降序排列；严重度由子项得分决定（<40 高 / <60 中 / 其余低）。
 *
 * 纯函数：不触库；空输入返回空数组，绝不抛错。
 *
 * @param input 资产输入快照（可空）
 */
export function identifyAssetGap(input?: Partial<SmartAssetInput> | null): AssetGap[] {
  const m = normalizeInput(input);

  const gaps: AssetGap[] = [];
  for (const meta of SUB_META) {
    const count = m[meta.key];
    const target = SUB_TARGETS[meta.key];
    const shortfall = target - count;
    if (shortfall <= 0) continue;

    const score = countToScore(count, target);
    const severity: AssetGap['severity'] =
      score < HIGH_GAP_SCORE ? 'high' : score < WEAK_SCORE_THRESHOLD ? 'medium' : 'low';

    gaps.push({
      dimension: meta.dimension,
      dimensionName: meta.dimensionName,
      subKey: meta.key,
      subName: meta.name,
      current: count,
      target,
      shortfall,
      severity,
      suggestion:
        severity === 'high'
          ? `高优先补齐「${meta.name}」：当前 ${count} / 目标 ${target}，缺口 ${shortfall}，建议本季度专项运营。`
          : severity === 'medium'
            ? `「${meta.name}」接近中位：当前 ${count} / 目标 ${target}，缺口 ${shortfall}，按常规节奏沉淀即可。`
            : `「${meta.name}」已接近饱和：当前 ${count} / 目标 ${target}，缺口 ${shortfall}，维持日常运营。`,
    });
  }

  // 缺口数量降序 → 严重度高优先 → 子项名升序
  return gaps.sort((a, b) => {
    if (b.shortfall !== a.shortfall) return b.shortfall - a.shortfall;
    const sevRank = { high: 0, medium: 1, low: 2 };
    if (sevRank[a.severity] !== sevRank[b.severity])
      return sevRank[a.severity] - sevRank[b.severity];
    return a.subName.localeCompare(b.subName, 'zh-CN');
  });
}

/**
 * buildSmartAssetDashboard：全院智慧资产看板（量化版）。
 *
 * 流程：
 *  1. 十一子项逐个做饱和折算（count/target×100，截顶 100）；
 *  2. 四维汇总：子项求和得维度总量、子项均分得维度得分，按权重加权；
 *  3. 智慧资产总分 = 四维加权贡献之和；
 *  4. 段位对标走 benchmarkAssetLevel；缺口清单走 identifyAssetGap；
 *  5. 空输入（或全零）返回 demo=true 的零值结构，绝不抛异常。
 *
 * 纯函数：不修改入参；不触库；nowIso 由调用方注入（默认当前时间）。
 *
 * @param hospitalId 医院租户 ID（纯透传，多租户隔离标签）
 * @param input      资产输入快照（可空，空即零值）
 * @param nowIso     生成时间 ISO 串（注入，便于测试）
 */
export function buildSmartAssetDashboard(
  hospitalId: string,
  input?: Partial<SmartAssetInput> | null,
  nowIso: string = new Date().toISOString(),
): SmartAssetDashboard {
  const m = normalizeInput(input);

  /* 1) 按维度归集子项 */
  const byDimension = new Map<AssetDimensionKey, AssetSubItem[]>();
  for (const meta of SUB_META) {
    const count = m[meta.key];
    const target = SUB_TARGETS[meta.key];
    const item: AssetSubItem = {
      key: meta.key,
      name: meta.name,
      count,
      target,
      score: countToScore(count, target),
      gap: Math.max(0, target - count),
    };
    const arr = byDimension.get(meta.dimension) ?? [];
    arr.push(item);
    byDimension.set(meta.dimension, arr);
  }

  /* 2) 维度汇总（按权重降序展示） */
  const dimKeys: AssetDimensionKey[] = ['experience', 'knowledge', 'model', 'data'];
  const dimensions: AssetDimension[] = dimKeys
    .map((key) => {
      const subs = byDimension.get(key) ?? [];
      const total = subs.reduce((a, s) => a + s.count, 0);
      const score = subs.length
        ? r1(subs.reduce((a, s) => a + s.score, 0) / subs.length)
        : 0;
      const weight = DIMENSION_WEIGHT[key];
      return {
        key,
        name: DIMENSION_NAME[key],
        total,
        weight,
        score,
        weightedContribution: r1((score * weight) / 100),
        subs,
        isWeak: score < WEAK_SCORE_THRESHOLD,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  const totalAssets = dimensions.reduce((a, d) => a + d.total, 0);
  const smartScore = r1(dimensions.reduce((a, d) => a + d.weightedContribution, 0));
  const benchmark = benchmarkAssetLevel(smartScore);

  /* 3) demo 标记：任一资产计数 > 0 即视为有真实样本 */
  const hasSamples = Object.values(m).some((v) => asCount(v) > 0);

  return {
    hospitalId,
    asOf: nowIso,
    demo: !hasSamples,
    totalAssets,
    dimensions,
    smartScore,
    level: benchmark.level,
    levelLabel: benchmark.levelLabel,
    gaps: identifyAssetGap(m),
  };
}

/**
 * calculateAssetGrowth：智慧资产增长报告（量化汇报版）。
 *
 * 流程：
 *  1. 把有序快照按 period 字典序升序（YYYY-MM 即时间序）；
 *  2. 取首/末点算四维资产量与总分的 delta 与增长率（首点为 0 时安全回落 0）；
 *  3. 结论话术：总分上行即「智慧资产持续累积」，附四维量化变化。
 *
 * 纯函数：不触库；空 snapshots 返回合法空结构，绝不抛异常。
 *
 * @param hospitalId 医院租户 ID
 * @param period      报告窗口标签（如 'month' / 'quarter'）
 * @param snapshots   有序快照序列（旧→新，可空）
 * @param nowIso      生成时间（注入）
 */
export function calculateAssetGrowth(
  hospitalId: string,
  period: string,
  snapshots?: readonly SmartAssetSnapshot[] | null,
  nowIso: string = new Date().toISOString(),
): SmartAssetGrowth {
  const list = (snapshots ?? [])
    .filter((s) => !!s)
    .map((s) => ({
      period: (s.period ?? '').trim(),
      experience: asCount(s.experience),
      knowledge: asCount(s.knowledge),
      model: asCount(s.model),
      data: asCount(s.data),
      smartScore: asScore100(s.smartScore),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const empty: SmartAssetGrowth = {
    hospitalId,
    period: (period ?? '').trim() || 'month',
    generatedAt: nowIso,
    series: [],
    delta: { experience: 0, knowledge: 0, model: 0, data: 0, smartScore: 0 },
    growthRate: { experience: 0, knowledge: 0, model: 0, data: 0, smartScore: 0 },
    rising: false,
    conclusion: '暂无历史快照。随着经验沉淀、知识建设、模型上线与数据治理，智慧资产将自动累积。',
  };
  if (list.length === 0) return empty;

  const first = list[0];
  const last = list[list.length - 1];

  const delta = {
    experience: last.experience - first.experience,
    knowledge: last.knowledge - first.knowledge,
    model: last.model - first.model,
    data: last.data - first.data,
    smartScore: r1(last.smartScore - first.smartScore),
  };

  const growthRate = {
    experience: first.experience > 0 ? r0((delta.experience / first.experience) * 100) : 0,
    knowledge: first.knowledge > 0 ? r0((delta.knowledge / first.knowledge) * 100) : 0,
    model: first.model > 0 ? r0((delta.model / first.model) * 100) : 0,
    data: first.data > 0 ? r0((delta.data / first.data) * 100) : 0,
    smartScore: first.smartScore > 0 ? r0((delta.smartScore / first.smartScore) * 100) : 0,
  };

  const rising = last.smartScore > first.smartScore;
  const conclusion = rising
    ? `智慧资产持续累积：${period}窗口内总分由 ${first.smartScore.toFixed(1)} 升至 ${last.smartScore.toFixed(1)} 分` +
      `（+${delta.smartScore.toFixed(1)}），经验 ${first.experience}→${last.experience}（+${delta.experience}）、` +
      `知识 ${first.knowledge}→${last.knowledge}（+${delta.knowledge}）、` +
      `模型 ${first.model}→${last.model}（+${delta.model}）、数据 ${first.data}→${last.data}（+${delta.data}）。`
    : `本窗口总分由 ${first.smartScore.toFixed(1)} 变动至 ${last.smartScore.toFixed(1)} 分，` +
      `建议在经验沉淀、知识建设、模型上线与数据治理上持续运营，推动资产曲线回升。`;

  return {
    hospitalId,
    period: (period ?? '').trim() || 'month',
    generatedAt: nowIso,
    series: list,
    delta,
    growthRate,
    rising,
    conclusion,
  };
}
