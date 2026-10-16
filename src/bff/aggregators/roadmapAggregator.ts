/**
 * 健澜科技 jlmedaios - v4.x 产品路线图聚合器（纯函数，M157-D）
 *
 * 本模块把「近期 / 中期 / 远期」三阶段路线图收敛为一组可排序、可估算工作量的纯数据，
 * 全部为无副作用纯函数，不读库、不碰时钟、不发网络请求，便于单测与路由层直接拼装。
 *
 * 三阶段定位（务实，不画大饼）：
 *   - 近期 v4.0 - v4.2：多语言深化 / 移动端完善 / 性能优化（见效快、夯实体验底座）；
 *   - 中期 v4.3 - v4.5：AI 医院大脑深化 / 集团化扩展 / 科研智能化（拉开差距的主战场）；
 *   - 远期 v4.6 - v5.0：数字孪生医院 / 元宇宙诊室 / 全自学习闭环（探索性、随成熟度分阶段落地）。
 *
 * 【200版本里程碑】v5.0 定为全产品第 200 个版本里程碑（MILESTONE_200_VERSION），
 *   标志「全自学习闭环」成型——反馈、模型、策略三层自动迭代，不再依赖人工喂策略。
 *
 * 纯函数约定：
 *   - generateRoadmap(currentVersion) 输入版本号，输出完整 Roadmap；
 *   - prioritizeRoadmapItems(items, criteria) 按权重打分排序，返回带排名的 PrioritizedItem；
 *   - estimateEffort(roadmapItem) 按阶段基线 + 耦合度 + 风险确定性地估人周与置信度。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 阶段：近期 / 中期 / 远期 */
export type Phase = 'near' | 'mid' | 'far';

/** 工作量档位：S(<=4人周) / M(<=9) / L(<=16) / XL(>16) */
export type EffortSize = 'S' | 'M' | 'L' | 'XL';

/**
 * 一条路线图事项。
 * businessValue / userImpact / risk / dependencyDepth 均取 1-5 的整数：
 *   businessValue    业务价值（对营收/评审/考核的拉动）；
 *   userImpact       用户影响面（医生/护士/患者覆盖广度）；
 *   risk             交付风险（技术不确定 + 合规 + 依赖外部方）；
 *   dependencyDepth  耦合深度（改动触碰的核心模块数，越深回归面越大）。
 */
export interface RoadmapItem {
  /** 稳定 id，如 near-i18n-deepen */
  id: string;
  /** 事项名 */
  title: string;
  /** 所属主题：多语言深化 / 移动端完善 / 性能优化 / AI 医院大脑深化 / ... */
  theme: string;
  phase: Phase;
  /** 目标交付版本，如 v4.0 */
  targetVersion: string;
  /** 一句话务实描述：做什么、不做什么 */
  description: string;
  businessValue: number;
  userImpact: number;
  risk: number;
  dependencyDepth: number;
}

/** 工作量估算结果 */
export interface Effort {
  size: EffortSize;
  /** 折算人周（person-weeks），纯估算口径，非合同承诺 */
  personWeeks: number;
  /** 置信度 0-1：近期高、远期低（远期探索性强，估算天然偏粗） */
  confidence: number;
}

/** 排序权重口径（prioritizeRoadmapItems 的入参） */
export interface PrioritizeCriteria {
  /** 业务价值权重 */
  wBusiness: number;
  /** 用户影响权重 */
  wUser: number;
  /** 风险惩罚权重（分越高越往后排） */
  wRisk: number;
  /** 耦合深度惩罚权重（越深越靠后，先摘低垂果实） */
  wDependency: number;
}

/** 排序后的单条结果 */
export interface PrioritizedItem {
  item: RoadmapItem;
  /** 加权得分，越大越优先 */
  score: number;
  /** 从 1 开始的排名 */
  rank: number;
  /** 一句话排序理由，便于评审会口头汇报 */
  rationale: string;
}

/** 阶段元信息 */
export interface PhaseMeta {
  phase: Phase;
  label: string;
  versionRange: string;
  goal: string;
}

/** 完整路线图 */
export interface Roadmap {
  /** 入参：当前版本 */
  currentVersion: string;
  /** 三阶段元信息 */
  phases: PhaseMeta[];
  /** 全部事项（按阶段与版本顺序） */
  items: RoadmapItem[];
  /** 关键里程碑说明（含 200 版本里程碑） */
  milestones: string[];
}

/** 【200版本里程碑】v5.0 = 全自学习闭环成型，全产品第 200 个版本 */
export const MILESTONE_200_VERSION = 'v5.0';

/** 三阶段元信息（固定口径，路由层与前端共用） */
export const ROADMAP_PHASES: PhaseMeta[] = [
  {
    phase: 'near',
    label: '近期',
    versionRange: 'v4.0 - v4.2',
    goal: '夯实体验底座：多语言、移动端、性能，先把日常使用做顺',
  },
  {
    phase: 'mid',
    label: '中期',
    versionRange: 'v4.3 - v4.5',
    goal: '拉开差距的主战场：AI 医院大脑、集团化、科研智能化',
  },
  {
    phase: 'far',
    label: '远期',
    versionRange: 'v4.6 - v5.0',
    goal: '探索性布局：数字孪生、虚拟诊室、全自学习闭环（随成熟度分阶段落地）',
  },
];

/** 默认排序权重（评审会可在 criteria 入参里覆盖） */
export const DEFAULT_CRITERIA: PrioritizeCriteria = {
  wBusiness: 1.0,
  wUser: 0.8,
  wRisk: 0.6,
  wDependency: 0.4,
};

/** 阶段工作量基线（人周）：近期快、中期重、远期重且不确定 */
const PHASE_BASE_PERSON_WEEKS: Record<Phase, number> = {
  near: 3,
  mid: 7,
  far: 11,
};

/** 阶段置信度：远期探索性强，估算只作量级参考 */
const PHASE_CONFIDENCE: Record<Phase, number> = {
  near: 0.85,
  mid: 0.62,
  far: 0.4,
};

/**
 * 路线图事项目录（务实清单）。
 * 评分刻意拉开梯度，便于单测锚点稳定；后续版本迭代只在这里增删行。
 */
const ROADMAP_CATALOG: RoadmapItem[] = [
  // —— 近期 v4.0 - v4.2 ——
  {
    id: 'near-i18n-deepen',
    title: '多语言深化',
    theme: '多语言深化',
    phase: 'near',
    targetVersion: 'v4.0',
    description:
      '中英临床术语库对齐 + 患者告知书多语言模板；先覆盖门诊/住院高频场景，不做全量机翻',
    businessValue: 3,
    userImpact: 4,
    risk: 2,
    dependencyDepth: 2,
  },
  {
    id: 'near-mobile-polish',
    title: '移动端完善',
    theme: '移动端完善',
    phase: 'near',
    targetVersion: 'v4.1',
    description:
      '移动护理 PDA 离线补录 + 家属端 H5 适老化大字号；聚焦床旁与家属两端，不做独立原生 App',
    businessValue: 3,
    userImpact: 5,
    risk: 3,
    dependencyDepth: 3,
  },
  {
    id: 'near-perf-optimize',
    title: '性能优化',
    theme: '性能优化',
    phase: 'near',
    targetVersion: 'v4.2',
    description:
      '首屏秒开、高频列表分页与索引治理、BFF 缓存命中率提升；以可观测指标验收，不做感知优化',
    businessValue: 4,
    userImpact: 4,
    risk: 2,
    dependencyDepth: 3,
  },
  // —— 中期 v4.3 - v4.5 ——
  {
    id: 'mid-ai-brain-deepen',
    title: 'AI 医院大脑深化',
    theme: 'AI医院大脑深化',
    phase: 'mid',
    targetVersion: 'v4.3',
    description:
      '实时运营预警闭环 + AI 建议采纳率回流学习；先在单院跑通闭环再推广，不追求一步到位全院覆盖',
    businessValue: 5,
    userImpact: 3,
    risk: 4,
    dependencyDepth: 4,
  },
  {
    id: 'mid-group-expansion',
    title: '集团化扩展',
    theme: '集团化扩展',
    phase: 'mid',
    targetVersion: 'v4.4',
    description:
      '多院主数据统一 + 跨院转诊与检查检验互认；先做主数据与互认，集团级结算后置',
    businessValue: 5,
    userImpact: 3,
    risk: 4,
    dependencyDepth: 5,
  },
  {
    id: 'mid-research-smart',
    title: '科研智能化',
    theme: '科研智能化',
    phase: 'mid',
    targetVersion: 'v4.5',
    description:
      '病例科研队列自动构建 + 回顾性研究统计（t/卡方/KM）；服务本院科研处，不做对外科研平台',
    businessValue: 4,
    userImpact: 2,
    risk: 3,
    dependencyDepth: 3,
  },
  // —— 远期 v4.6 - v5.0 ——
  {
    id: 'far-digital-twin',
    title: '数字孪生医院',
    theme: '数字孪生医院',
    phase: 'far',
    targetVersion: 'v4.6',
    description:
      '床位 / 手术间 / 人力资源仿真调度；先做资源仿真决策支持，不做全院区三维建模',
    businessValue: 3,
    userImpact: 2,
    risk: 5,
    dependencyDepth: 4,
  },
  {
    id: 'far-meta-consult',
    title: '元宇宙诊室',
    theme: '元宇宙诊室',
    phase: 'far',
    targetVersion: 'v4.8',
    description:
      '虚拟协同诊室远程三维会诊；以音视频 + 共享影像/体征为主，不追重型 VR 硬件铺货',
    businessValue: 2,
    userImpact: 2,
    risk: 5,
    dependencyDepth: 4,
  },
  {
    id: 'far-self-learning-loop',
    title: '全自学习闭环',
    theme: '全自学习闭环',
    phase: 'far',
    targetVersion: MILESTONE_200_VERSION,
    description:
      '反馈-模型-策略三层自动迭代成型；【200版本里程碑】达成后策略不再依赖人工调权',
    businessValue: 5,
    userImpact: 3,
    risk: 5,
    dependencyDepth: 5,
  },
];

/**
 * 生成完整路线图。
 *
 * @param currentVersion 当前版本号（如 v3.9.0），原样回传，便于前端标注「当前所处位置」
 * @returns 三阶段元信息 + 全部事项 + 关键里程碑说明
 */
export function generateRoadmap(currentVersion: string): Roadmap {
  const milestones = [
    `${MILESTONE_200_VERSION}【200版本里程碑】：全自学习闭环成型，反馈/模型/策略三层自动迭代`,
    'v4.2 性能底座验收：首屏与高频列表进入可观测区间后，再启动中期重投入',
    'v4.5 中期收口：AI 大脑、集团化、科研智能化三条线各自至少 1 家标杆院落地',
  ];

  return {
    currentVersion,
    phases: ROADMAP_PHASES.map((p) => ({ ...p })),
    // 浅拷贝目录，避免外部 mutate 影响模块级常量
    items: ROADMAP_CATALOG.map((it) => ({ ...it })),
    milestones: [...milestones],
  };
}

/**
 * 按业务口径给事项打分并排序。
 *
 * 得分 = wBusiness*businessValue + wUser*userImpact
 *        - wRisk*risk - wDependency*dependencyDepth
 * 分数高者优先（先摘业务价值高、影响广、风险与耦合都可控的低垂果实）。
 *
 * @param items    路线图事项
 * @param criteria 权重；缺省用 DEFAULT_CRITERIA
 */
export function prioritizeRoadmapItems(
  items: RoadmapItem[],
  criteria: Partial<PrioritizeCriteria> = {},
): PrioritizedItem[] {
  const c: PrioritizeCriteria = { ...DEFAULT_CRITERIA, ...criteria };

  const scored = items.map((item) => {
    const score =
      c.wBusiness * item.businessValue +
      c.wUser * item.userImpact -
      c.wRisk * item.risk -
      c.wDependency * item.dependencyDepth;
    return { item, score };
  });

  // 分数降序；同分按依赖浅者在前（更易交付），再按 id 兜底保证稳定
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.item.dependencyDepth !== b.item.dependencyDepth) {
      return a.item.dependencyDepth - b.item.dependencyDepth;
    }
    return a.item.id.localeCompare(b.item.id);
  });

  return scored.map((entry, idx) => ({
    item: { ...entry.item },
    score: round2(entry.score),
    rank: idx + 1,
    rationale: buildRationale(entry.item, entry.score),
  }));
}

/**
 * 估算单条事项工作量（确定性，非承诺）。
 *
 * 人周 = 阶段基线 + 耦合深度 * 1.5 + (风险 - 1) * 0.8，再向上取整；
 * 档位按人周落 S / M / L / XL；置信度按阶段给（远期只作量级参考）。
 */
export function estimateEffort(roadmapItem: RoadmapItem): Effort {
  const base = PHASE_BASE_PERSON_WEEKS[roadmapItem.phase];
  const raw = base + roadmapItem.dependencyDepth * 1.5 + (roadmapItem.risk - 1) * 0.8;
  const personWeeks = Math.ceil(raw * 10) / 10;

  return {
    size: bucketSize(personWeeks),
    personWeeks,
    confidence: PHASE_CONFIDENCE[roadmapItem.phase],
  };
}

/** 人周落档：S<=4 / M<=9 / L<=16 / XL>16 */
function bucketSize(personWeeks: number): EffortSize {
  if (personWeeks <= 4) return 'S';
  if (personWeeks <= 9) return 'M';
  if (personWeeks <= 16) return 'L';
  return 'XL';
}

/** 生成一句话排序理由 */
function buildRationale(item: RoadmapItem, score: number): string {
  const valueHigh = item.businessValue >= 4;
  const riskHigh = item.risk >= 4;
  const impactHigh = item.userImpact >= 4;

  const parts: string[] = [];
  parts.push(valueHigh ? '业务价值高' : '业务价值中等');
  if (impactHigh) parts.push('用户影响广');
  parts.push(riskHigh ? '交付风险偏高，后置' : '风险可控');
  if (item.dependencyDepth >= 4) parts.push('耦合深、回归面大');

  return `${item.title}（${item.targetVersion}）：得分 ${round2(score)}，${parts.join('，')}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
