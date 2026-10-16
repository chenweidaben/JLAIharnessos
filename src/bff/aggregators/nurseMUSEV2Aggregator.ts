/**
 * 健澜科技 jlmedaios - Nurse MUSE 护理智能体 V2 纯函数（M185-C）
 *
 * 与已有 nurseMuseAggregator.ts 互补，本模块聚焦：
 *   - 护理任务智能提醒（输液/换药/翻身/口腔护理）
 *   - 护理风险评估（压疮/跌倒/管路滑脱）
 *   - 护理知识推荐
 *   - 护理经验沉淀
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 护理任务 */
export interface NursingTaskV2 {
  taskId: string;
  patientName: string;
  taskType: 'infusion' | 'dressing' | 'turnover' | 'oral_care';
  scheduledTime: string;
  priority: 'low' | 'medium' | 'high';
}

/** 风险评估 */
export interface RiskAssessmentV2 {
  pressureUlcer: 'low' | 'medium' | 'high';
  fall: 'low' | 'medium' | 'high';
  catheterDisplacement: 'low' | 'medium' | 'high';
}

/** 护理经验 */
export interface NursingExperienceV2 {
  caseId: string;
  patientCondition: string;
  successfulPractice: string;
}

/** 输出 */
export interface NurseMUSEV2Result {
  nurseId: string;
  date: string;
  tasks: NursingTaskV2[];
  riskAssessment: RiskAssessmentV2;
  knowledgeRecommendations: string[];
  experienceLibrary: NursingExperienceV2[];
}

/**
 * 构建 Nurse MUSE V2 护理智能体数据。
 *
 * @param nurseId 护士 ID
 * @param date 日期
 * @param tasks 当日护理任务
 * @returns 护理智能体结果
 */
export function buildNurseMUSE(
  nurseId: string,
  date: string,
  tasks: NursingTaskV2[],
): NurseMUSEV2Result {
  const riskAssessment: RiskAssessmentV2 = {
    pressureUlcer: tasks.some((t) => t.taskType === 'turnover') ? 'medium' : 'low',
    fall: tasks.some((t) => t.priority === 'high') ? 'high' : 'low',
    catheterDisplacement: tasks.some((t) => t.taskType === 'infusion') ? 'medium' : 'low',
  };

  const knowledgeRecommendations: string[] = [];
  if (riskAssessment.pressureUlcer === 'medium') {
    knowledgeRecommendations.push('压疮预防：每2小时翻身一次，使用减压床垫');
  }
  if (riskAssessment.fall === 'high') {
    knowledgeRecommendations.push('跌倒预防：床栏拉起、呼叫器放置床头、地面干燥');
  }
  if (riskAssessment.catheterDisplacement === 'medium') {
    knowledgeRecommendations.push('管路护理：妥善固定、每日评估拔管指征');
  }

  const experienceLibrary: NursingExperienceV2[] = [
    {
      caseId: 'exp-001',
      patientCondition: '长期卧床老年患者',
      successfulPractice: '每2小时翻身+气垫床联合使用，压疮发生率降低60%',
    },
  ];

  return {
    nurseId,
    date,
    tasks,
    riskAssessment,
    knowledgeRecommendations,
    experienceLibrary,
  };
}
