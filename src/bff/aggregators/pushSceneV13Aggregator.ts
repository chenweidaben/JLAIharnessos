/**
 * 健澜科技 jlmedaios - 推送时机与场景触发 V13 纯函数（M302-B）
 *
 * evaluatePushTimingV13 / filterSceneEligibleV13 / buildPushSceneV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床场景 */
export type SceneV13 = "open_chart" | "order_write" | "handover" | "idle";

/** 场景候选经验 */
export interface PushSceneExpV13 {
  experienceId: string;
  title: string;
}

/** 场景推送包 */
export interface PushScenePackageV13 {
  sceneLabel: string;
  triggerTiming: string;
  pushList: PushSceneExpV13[];
}

const SCENE_SCORE: Record<SceneV13, { score: number; label: string; trigger: string }> = {
  open_chart: { score: 70, label: "打开病历", trigger: "医生首次进入患者病历" },
  order_write: { score: 90, label: "下医嘱", trigger: "医嘱编辑器打开时" },
  handover: { score: 50, label: "交接班", trigger: "交班会开始前30分钟" },
  idle: { score: 10, label: "空闲", trigger: "无临床动作" },
};

/**
 * 时机评分（纯函数）：返回该场景的时机分。
 *
 * @param scene 临床场景
 * @returns 时机分
 */
export function evaluatePushTimingV13(scene: SceneV13): number {
  return SCENE_SCORE[scene]?.score ?? 0;
}

/**
 * 场景门槛（纯函数）：≥60 才推。
 *
 * @param sceneScore 时机分
 * @param threshold 门槛（默认60）
 * @returns 是否合格
 */
export function filterSceneEligibleV13(sceneScore: number, threshold = 60): boolean {
  return sceneScore >= threshold;
}

/**
 * 场景推送包（纯函数）。
 *
 * @param scene 临床场景
 * @param eligibleExperiences 合格经验列表
 * @returns 推送包
 */
export function buildPushSceneV13(
  scene: SceneV13,
  eligibleExperiences: PushSceneExpV13[],
): PushScenePackageV13 {
  const meta = SCENE_SCORE[scene] ?? { label: "未知", trigger: "" };
  return {
    sceneLabel: meta.label,
    triggerTiming: meta.trigger,
    pushList: eligibleExperiences,
  };
}
