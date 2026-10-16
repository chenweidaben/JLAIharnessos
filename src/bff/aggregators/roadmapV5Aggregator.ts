/**
 * 健澜科技 jlmedaios - v5.0 产品路线图聚合器（纯函数，M181-D）
 *
 * 本模块在 v4.x 路线图（roadmapAggregator.ts）收口后，接续规划 v5.0 -> v6.0，
 * 全部为无副作用纯函数：不读库、不碰时钟、不发网络请求，便于单测与路由层直接拼装。
 *
 * 三阶段定位（务实，不画大饼——每条都写清「做什么、先在哪试点、不做什么」）：
 *   - 近期 v5.0 - v5.2：AI 医院大脑 2.0 / 数字孪生 3D 深化 / 全自学习闭环；
 *     在 v4 底座上把智能中枢与孪生可视化做深，先试点后铺开；
 *   - 中期 v5.3 - v5.5：区域医疗协同 / 医联体 / 分级诊疗深化；
 *     从单院走向区域，先打通知结果互认与双向转诊，区域结算后置；
 *   - 远期 v5.6 - v6.0：数字孪生医院 / 元宇宙诊室 / 全自学习医院；
 *     探索性布局，随技术与合规成熟度分阶段落地，不追重型硬件铺货。
 *
 * 【300版本里程碑】v6.0 定为全产品第 300 个版本里程碑（MILESTONE_300_VERSION），
 *   标志「全自学习医院」成型——自学习从临床闭环扩展到运营/管理/后勤全场景，
 *   系统具备自优化能力，标志着 v4「全自学习闭环(200版本)」在全院范围的兑现。
 *
 * 纯函数约定：
 *   - generateRoadmapV5(currentVersion) 输入版本号，输出完整 RoadmapV5；
 *   - prioritizeRoadmapItemsV5(items, criteria) 按权重打分排序，返回带排名的 PrioritizedItemV5；
 *   - estimateEffortV5(roadmapItem) 按阶段基线 + 耦合度 + 风险确定性地估人周与置信度。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 阶段：近期 / 中期 / 远期 */
export type PhaseV5 = 'near' | 'mid' | 'far';

/** 工作量档位：S(<=4人周) / M(<=9) / L(<=16) / XL(>16) */
export type EffortSizeV5 = 'S' | 'M' | 'L' | 'XL';

/**
 * 一条路线图事项。
 * businessValue / userImpact / risk / dependencyDepth 均取 1-5 的整数：
 *   businessValue    业务价值（对营收/评审/考核的拉动）；
 *   userImpact       用户影响面（医生/护士/患者覆盖广度）；
 *   risk             交付风险（技术不确定 + 合规 + 依赖外部平台/医保）；
 *   dependencyDepth  耦合深度（改动触碰的核心模块数，越深回归面越大）。
 */
export interface RoadmapItemV5 {
  /** 稳定 id，如 near-ai-brain-2 */
  id: string;
  /** 事项名 */
  title: string;
  /** 所属主题：AI医院大脑2.0 / 数字孪生3D深化 / 全自学习闭环 / ... */
  theme: string;
  phase: PhaseV5;
  /** 目标交付版本，如 v5.0 */
  targetVersion: string;
  /** 一句话务实描述：做什么、先在哪试点、不做什么 */
  description: string;
  businessValue: number;
  userImpact: number;
  risk: number;
  dependencyDepth: number;
}

/** 工作量估算结果 */
export interface EffortV5 {
  size: EffortSizeV5;
  /** 折算人周（person-weeks），纯估算口径，非合同承诺 */
  personWeeks: number;
  /** 置信度 0-1：近期高、远期低（远期探索性强，估算天然偏粗） */
  confidence: number;
}

/** 排序权重口径（prioritizeRoadmapItemsV5 的入参） */
export interface PrioritizeCriteriaV5 {
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
export interface PrioritizedItemV5 {
  item: RoadmapItemV5;
  /** 加权得分，越大越优先 */
  score: number;
  /** 从 1 开始的排名 */
  rank: number;
  /** 一句话排序理由，便于评审会口头汇报 */
  rationale: string;
}

/** 阶段元信息 */
export interface PhaseMetaV5 {
  phase: PhaseV5;
  label: string;
  versionRange: string;
  goal: string;
}

/** 完整路线图 */
export interface RoadmapV5 {
  /** 入参：当前版本 */
  currentVersion: string;
  /** 三阶段元信息 */
  phases: PhaseMetaV5[];
  /** 全部事项（按阶段与版本顺序） */
  items: RoadmapItemV5[];
  /** 关键里程碑说明（含 300 版本里程碑） */
  milestones: string[];
}

/** 【300版本里程碑】v6.0 = 全自学习医院成型，全产品第 300 个版本 */
export const MILESTONE_300_VERSION = 'v6.0';

/** 三阶段元信息（固定口径，路由层与前端共用） */
export const ROADMAP_V5_PHASES: PhaseMetaV5[] = [
  {
    phase: 'near',
    label: '近期',
    versionRange: 'v5.0 - v5.2',
    goal: '把 v4 底座做深：AI 医院大脑 2.0、数字孪生 3D、全自学习闭环，先试点后铺开',
  },
  {
    phase: 'mid',
    label: '中期',
    versionRange: 'v5.3 - v5.5',
    goal: '从单院走向区域：医疗协同、医联体、分级诊疗，先打通互认与双向转诊',
  },
  {
    phase: 'far',
    label: '远期',
    versionRange: 'v5.6 - v6.0',
    goal: '探索性布局：数字孪生医院、元宇宙诊室、全自学习医院（v6.0 达成 300 版本里程碑）',
  },
];

/** 默认排序权重（评审会可在 criteria 入参里覆盖） */
export const DEFAULT_CRITERIA_V5: PrioritizeCriteriaV5 = {
  wBusiness: 1.0,
  wUser: 0.8,
  wRisk: 0.6,
  wDependency: 0.4,
};

/** 阶段工作量基线（人周）：近期快、中期重（涉外部平台对接）、远期重且不确定 */
const PHASE_BASE_PERSON_WEEKS_V5: Record<PhaseV5, number> = {
  near: 3,
  mid: 7,
  far: 11,
};

/** 阶段置信度：远期探索性强，估算只作量级参考 */
const PHASE_CONFIDENCE_V5: Record<PhaseV5, number> = {
  near: 0.85,
  mid: 0.62,
  far: 0.4,
};

/**
 * 路线图事项目录（务实清单，3 阶段 × 3 条）。
 * 评分刻意拉开梯度，便于单测锚点稳定；后续版本迭代只在这里增删行。
 */
const ROADMAP_V5_CATALOG: RoadmapItemV5[] = [
  // —— 近期 v5.0 - v5.2 ——
  {
    id: 'near-ai-brain-2',
    title: 'AI 医院大脑 2.0',
    theme: 'AI医院大脑2.0',
    phase: 'near',
    targetVersion: 'v5.0',
    description:
      '在 v4.3 实时预警闭环上升级为全院智能中枢：从单点提醒升级为多 Agent 协同的处方/医嘱/护理联合推荐；先在门诊+住院两条线试点，不做全院一步到位',
    businessValue: 5,
    userImpact: 5,
    risk: 3,
    dependencyDepth: 3,
  },
  {
    id: 'near-twin3d-deepen',
    title: '数字孪生 3D 深化',
    theme: '数字孪生3D深化',
    phase: 'near',
    targetVersion: 'v5.1',
    description:
      '在 v4.6 资源仿真基础上把 3D 可视化从院区平面升到楼层级床位/手术间实时孪生；先做护理部与手术室两个场景，不做全院 BIM 建模',
    businessValue: 3,
    userImpact: 3,
    risk: 3,
    dependencyDepth: 3,
  },
  {
    id: 'near-self-learning-loop',
    title: '全自学习闭环',
    theme: '全自学习闭环',
    phase: 'near',
    targetVersion: 'v5.2',
    description:
      'v4「全自学习闭环(200版本)」从单点扩到临床全流程闭环：反馈-模型-策略自动迭代不再人工调权；先在合理用药与检验解读两个高频场景跑通',
    businessValue: 5,
    userImpact: 3,
    risk: 3,
    dependencyDepth: 4,
  },
  // —— 中期 v5.3 - v5.5 ——
  {
    id: 'mid-regional-collab',
    title: '区域医疗协同',
    theme: '区域医疗协同',
    phase: 'mid',
    targetVersion: 'v5.3',
    description:
      '与区域全民健康信息平台对接，检查检验结果跨院调阅与互认；先做结果互认，区域影像云与数据上报后置',
    businessValue: 5,
    userImpact: 4,
    risk: 4,
    dependencyDepth: 4,
  },
  {
    id: 'mid-medical-alliance',
    title: '医联体',
    theme: '医联体',
    phase: 'mid',
    targetVersion: 'v5.4',
    description:
      '医联体内部双向转诊通道 + 基层机构视图下沉与上级号源下放；先做转诊与号源，不做医联体内统一结算',
    businessValue: 4,
    userImpact: 4,
    risk: 4,
    dependencyDepth: 4,
  },
  {
    id: 'mid-grading-diagnosis',
    title: '分级诊疗深化',
    theme: '分级诊疗深化',
    phase: 'mid',
    targetVersion: 'v5.5',
    description:
      '慢病上下级医院协同管理 + 下转康复衔接；先做高血压/糖尿病两个病种闭环，不做全病种铺开',
    businessValue: 4,
    userImpact: 4,
    risk: 3,
    dependencyDepth: 3,
  },
  // —— 远期 v5.6 - v6.0 ——
  {
    id: 'far-digital-twin-hospital',
    title: '数字孪生医院',
    theme: '数字孪生医院',
    phase: 'far',
    targetVersion: 'v5.7',
    description:
      '全院级运营数字孪生：人流/物流/财流仿真推演支持院长决策；先做运营仿真沙盘，不追求像素级三维重建',
    businessValue: 3,
    userImpact: 2,
    risk: 5,
    dependencyDepth: 4,
  },
  {
    id: 'far-meta-consult-room',
    title: '元宇宙诊室',
    theme: '元宇宙诊室',
    phase: 'far',
    targetVersion: 'v5.9',
    description:
      '虚拟协同诊室做跨院三维会诊；以共享影像 + 音视频 + 虚拟化身为主，不追重型 VR 硬件铺货',
    businessValue: 2,
    userImpact: 2,
    risk: 5,
    dependencyDepth: 4,
  },
  {
    id: 'far-self-learning-hospital',
    title: '全自学习医院',
    theme: '全自学习医院',
    phase: 'far',
    targetVersion: MILESTONE_300_VERSION,
    description:
      '【300版本里程碑】全院级自学习：从临床闭环扩展到运营/管理/后勤全场景自动迭代；达成后系统具备自优化能力',
    businessValue: 5,
    userImpact: 3,
    risk: 5,
    dependencyDepth: 5,
  },
];

/**
 * 生成 v5.0 完整路线图。
 *
 * @param currentVersion 当前版本号（如 v4.9.0），原样回传，便于前端标注「当前所处位置」
 * @returns 三阶段元信息 + 全部事项 + 关键里程碑说明
 */
export function generateRoadmapV5(currentVersion: string): RoadmapV5 {
  const milestones = [
    `${MILESTONE_300_VERSION}【300版本里程碑】：全自学习医院成型，自学习从临床扩到运营/管理/后勤全场景`,
    'v5.2 近期收口：AI 大脑 2.0、3D 孪生、全自学习闭环三条线各自至少 1 家标杆院跑通，再启动中期区域重投入',
    'v5.5 中期收口：区域互认、医联体、分级诊疗三条线在至少 1 个地市形成可复制样板，再启动远期探索',
  ];

  return {
    currentVersion,
    phases: ROADMAP_V5_PHASES.map((p) => ({ ...p })),
    // 浅拷贝目录，避免外部 mutate 影响模块级常量
    items: ROADMAP_V5_CATALOG.map((it) => ({ ...it })),
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
 * @param criteria 权重；缺省用 DEFAULT_CRITERIA_V5
 */
export function prioritizeRoadmapItemsV5(
  items: RoadmapItemV5[],
  criteria: Partial<PrioritizeCriteriaV5> = {},
): PrioritizedItemV5[] {
  const c: PrioritizeCriteriaV5 = { ...DEFAULT_CRITERIA_V5, ...criteria };

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
    rationale: buildRationaleV5(entry.item, entry.score),
  }));
}

/**
 * 估算单条事项工作量（确定性，非承诺）。
 *
 * 人周 = 阶段基线 + 耦合深度 * 1.5 + (风险 - 1) * 0.8，再向上取整到 0.1；
 * 档位按人周落 S / M / L / XL；置信度按阶段给（远期只作量级参考）。
 */
export function estimateEffortV5(roadmapItem: RoadmapItemV5): EffortV5 {
  const base = PHASE_BASE_PERSON_WEEKS_V5[roadmapItem.phase];
  const raw = base + roadmapItem.dependencyDepth * 1.5 + (roadmapItem.risk - 1) * 0.8;
  const personWeeks = Math.ceil(raw * 10) / 10;

  return {
    size: bucketSizeV5(personWeeks),
    personWeeks,
    confidence: PHASE_CONFIDENCE_V5[roadmapItem.phase],
  };
}

/** 人周落档：S<=4 / M<=9 / L<=16 / XL>16 */
function bucketSizeV5(personWeeks: number): EffortSizeV5 {
  if (personWeeks <= 4) return 'S';
  if (personWeeks <= 9) return 'M';
  if (personWeeks <= 16) return 'L';
  return 'XL';
}

/** 生成一句话排序理由 */
function buildRationaleV5(item: RoadmapItemV5, score: number): string {
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
