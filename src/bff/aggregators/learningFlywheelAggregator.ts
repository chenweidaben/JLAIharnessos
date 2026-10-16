/**
 * 健澜科技 jlmedaios - 学习闭环数据飞轮聚合器（纯函数）
 *
 * 核心思想：AI 原生医院的飞轮——
 *   推荐下发 → 医生反馈（采纳/修改/拒绝）→ 经验沉淀 → 推荐优化 → 采纳率提升
 *   → 更多推荐 → 更多反馈…… 越用越聪明。
 *
 * 本模块把各环节的计数折算为飞轮转速指标，并产出趋势线数据供前端 ECharts 渲染。
 * 全部为无副作用纯函数，不触库；数据库读写由路由层负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 飞轮单期数据点 */
export interface FlywheelPoint {
  /** 日期（YYYY-MM-DD） */
  date: string;
  /** 当日推荐下发数 */
  recommendations: number;
  /** 当日采纳数（adopted + modified） */
  adopted: number;
  /** 当日拒绝数 */
  rejected: number;
  /** 当日沉淀的经验条数 */
  knowledgeAccumulated: number;
}

/** 飞轮汇总结果 */
export interface LearningFlywheelResult {
  /** 总推荐数（窗口内） */
  totalRecommendations: number;
  /** 总采纳数 */
  totalAdopted: number;
  /** 总拒绝数 */
  totalRejected: number;
  /** 总沉淀经验数 */
  totalKnowledge: number;
  /** 整体采纳率 */
  adoptionRate: number;
  /** 飞轮转速：每日平均采纳数（采纳率 × 日均推荐数） */
  flywheelVelocity: number;
  /** 趋势线数据（按日期升序） */
  trend: Array<{
    date: string;
    recommendations: number;
    adopted: number;
    adoptionRate: number;
    knowledge: number;
  }>;
  /** 四个飞轮环节的当前值（供环形图） */
  stages: Array<{
    key: string;
    label: string;
    value: number;
    description: string;
  }>;
}

/**
 * 由逐日数据点构建学习闭环飞轮指标。
 *
 * 飞轮四环节：
 *   1. 推荐下发（recommendations）
 *   2. 医生反馈（adopted + rejected）
 *   3. 经验沉淀（knowledgeAccumulated）
 *   4. 采纳率提升（adoptionRate）
 *
 * @param points 逐日数据点（可乱序，函数内部按日期排序）
 * @returns 飞轮汇总结果
 */
export function buildLearningFlywheel(points: FlywheelPoint[]): LearningFlywheelResult {
  // 按日期升序排序
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));

  const totalRecommendations = sorted.reduce((s, p) => s + p.recommendations, 0);
  const totalAdopted = sorted.reduce((s, p) => s + p.adopted, 0);
  const totalRejected = sorted.reduce((s, p) => s + p.rejected, 0);
  const totalKnowledge = sorted.reduce((s, p) => s + p.knowledgeAccumulated, 0);

  const resolved = totalAdopted + totalRejected;
  const adoptionRate = resolved > 0 ? totalAdopted / resolved : 0;
  const days = Math.max(sorted.length, 1);
  const flywheelVelocity = totalAdopted / days;

  const trend = sorted.map((p) => {
    const pResolved = p.adopted + p.rejected;
    return {
      date: p.date,
      recommendations: p.recommendations,
      adopted: p.adopted,
      adoptionRate: pResolved > 0 ? p.adopted / pResolved : 0,
      knowledge: p.knowledgeAccumulated,
    };
  });

  const stages = [
    {
      key: 'recommend',
      label: '推荐下发',
      value: totalRecommendations,
      description: 'AI 每日主动推荐条数',
    },
    {
      key: 'feedback',
      label: '医生反馈',
      value: totalAdopted + totalRejected,
      description: '采纳 + 修改 + 拒绝的闭环数',
    },
    {
      key: 'knowledge',
      label: '经验沉淀',
      value: totalKnowledge,
      description: '成功/失败经验自动入库',
    },
    {
      key: 'adoption',
      label: '采纳率',
      value: Math.round(adoptionRate * 1000) / 10,
      description: '采纳率（%），飞轮转速核心指标',
    },
  ];

  return {
    totalRecommendations,
    totalAdopted,
    totalRejected,
    totalKnowledge,
    adoptionRate,
    flywheelVelocity,
    trend,
    stages,
  };
}
