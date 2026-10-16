/**
 * 健澜科技 jlmedaios - 区域协同与分级诊疗纯函数（M186-C）
 *
 * buildRegionalCollaboration：医联体资源总览 + 双向转诊 + 知识共享
 * recommendCareLevel：分级诊疗推荐
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 机构资源 */
export interface InstitutionResource {
  name: string;
  level: 'tertiary' | 'secondary' | 'community';
  beds: number;
  doctors: number;
  equipment: string[];
}

/** 转诊建议 */
export interface ReferralSuggestion {
  direction: 'up' | 'down';
  from: string;
  to: string;
  reason: string;
}

/** 区域协同输出 */
export interface RegionalCollaborationResult {
  region: string;
  date: string;
  institutions: InstitutionResource[];
  referrals: ReferralSuggestion[];
  sharedCases: Array<{ caseId: string; hospital: string; diagnosis: string; resolution: string }>;
}

/**
 * 分级诊疗推荐（纯函数）。
 *
 * @param patientId 患者 ID
 * @param condition 病情描述
 * @returns 推荐就诊层级
 */
export function recommendCareLevel(patientId: string, condition: string): { level: string; reason: string } {
  const severeKeywords = ['心梗', '卒中', '休克', '大出血', '器官衰竭'];
  const moderateKeywords = ['肺炎', '骨折', '糖尿病', '高血压'];

  for (const kw of severeKeywords) {
    if (condition.includes(kw)) {
      return { level: 'tertiary', reason: `病情危重（${kw}），建议三级医院` };
    }
  }
  for (const kw of moderateKeywords) {
    if (condition.includes(kw)) {
      return { level: 'secondary', reason: `病情中等（${kw}），建议二级医院` };
    }
  }
  return { level: 'community', reason: '病情稳定，建议社区卫生服务中心' };
}

/**
 * 构建区域协同数据。
 *
 * @param region 区域
 * @param date 日期
 * @returns 医联体资源 + 转诊 + 知识共享
 */
export function buildRegionalCollaboration(region: string, date: string): RegionalCollaborationResult {
  const institutions: InstitutionResource[] = [
    { name: '区域中心医院', level: 'tertiary', beds: 1200, doctors: 350, equipment: ['CT', 'MRI', 'DSA'] },
    { name: '区级人民医院', level: 'secondary', beds: 500, doctors: 120, equipment: ['CT', '彩超'] },
    { name: '社区卫生服务中心', level: 'community', beds: 50, doctors: 25, equipment: ['彩超', '心电图'] },
  ];

  const referrals: ReferralSuggestion[] = [
    { direction: 'up', from: '社区卫生服务中心', to: '区域中心医院', reason: '急性心梗需PCI手术' },
    { direction: 'down', from: '区域中心医院', to: '社区卫生服务中心', reason: '术后康复期，转回社区随访' },
  ];

  const sharedCases = [
    { caseId: 'case-101', hospital: '区域中心医院', diagnosis: '急性心梗PCI术后', resolution: '社区随访+药物调整' },
  ];

  return { region, date, institutions, referrals, sharedCases };
}
