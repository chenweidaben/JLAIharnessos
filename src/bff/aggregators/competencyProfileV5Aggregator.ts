/**
 * 健澜科技 jlmedaios - 医生能力画像与个性化学习路径 V5 纯函数（M276-D）
 *
 * assessCompetencyV5 / identifyGapV5 / recommendLearningV5 / buildCompetencyProfileV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 能力维度 */
export interface CompetencyDimension {
  dimension: string;
  score: number;
  trend: "up" | "flat" | "down";
}

/** 能力画像 */
export interface CompetencyProfile {
  userId: string;
  specialty: string;
  dimensions: CompetencyDimension[];
  avgScore: number;
  gaps: string[];
}

/** 学习路径 */
export interface LearningPath {
  userId: string;
  nextExperiences: string[];
  drills: string[];
  completionPct: number;
}

/**
 * 评估能力 V5（纯函数）：基于事件数与AI建议采纳率计算各维度得分。
 *
 * @param events 各维度事件数
 * @param adviceAdoption AI建议采纳率（0-1）
 * @returns 能力画像
 */
export function assessCompetencyV5(
  userId: string,
  specialty: string,
  events: Record<string, number>,
  adviceAdoption: number,
): CompetencyProfile {
  const dimensions: CompetencyDimension[] = [];
  for (const [dim, count] of Object.entries(events)) {
    let score = Math.min(100, Math.round(count * 5 + adviceAdoption * 20));
    let trend: CompetencyDimension["trend"] = "flat";
    if (count >= 10) trend = "up";
    else if (count <= 3) trend = "down";
    dimensions.push({ dimension: dim, score, trend });
  }
  const avgScore = dimensions.length > 0
    ? Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length)
    : 0;
  const gaps = identifyGapV5({ dimensions });
  return { userId, specialty, dimensions, avgScore, gaps };
}

/**
 * 识别短板 V5（纯函数）：得分<60的维度。
 *
 * @param profile 能力画像
 * @returns 短板列表
 */
export function identifyGapV5(profile: Pick<CompetencyProfile, "dimensions">): string[] {
  return profile.dimensions.filter((d) => d.score < 60).map((d) => d.dimension);
}

/**
 * 推荐学习路径 V5（纯函数）。
 *
 * @param userId 用户ID
 * @param gaps 短板列表
 * @returns 学习路径
 */
export function recommendLearningV5(userId: string, gaps: string[]): LearningPath {
  const nextExperiences = gaps.map((g) => `精读「${g}」高分经验`);
  const drills = gaps.map((g) => `${g}专项演练`);
  return {
    userId,
    nextExperiences,
    drills,
    completionPct: 0,
  };
}

/** 能力画像报告输出 */
export interface CompetencyProfileV5Report {
  totalDoctors: number;
  avgScore: number;
  gapDimensions: Record<string, number>;
  suggestions: string[];
}

/**
 * 构建能力画像报告（纯函数）。
 *
 * @param profiles 画像列表
 * @returns 报告
 */
export function buildCompetencyProfileV5Report(profiles: CompetencyProfile[]): CompetencyProfileV5Report {
  const gapDimensions: Record<string, number> = {};
  for (const p of profiles) {
    for (const g of p.gaps) {
      gapDimensions[g] = (gapDimensions[g] ?? 0) + 1;
    }
  }
  const avgScore = profiles.length > 0
    ? Math.round(profiles.reduce((s, p) => s + p.avgScore, 0) / profiles.length)
    : 0;
  return {
    totalDoctors: profiles.length,
    avgScore,
    gapDimensions,
    suggestions: Object.keys(gapDimensions).length > 0
      ? ["针对短板维度批量推送学习路径与演练"]
      : ["团队能力均衡，保持常规培养"],
  };
}
