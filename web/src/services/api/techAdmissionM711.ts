/**
 * 健澜科技 jlmedaios - 医疗技术准入管理 API（M711）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type TechLevel = 'class1' | 'class2' | 'class3' | 'class4';
export type TechStatus = 'planning' | 'approved' | 'active' | 'suspended';

export interface TechAdmission {
  id: string;
  name: string;
  category: string;
  level: TechLevel;
  status: TechStatus;
  admittedAt: string | null;
  description: string;
  operatorQualification: string;
  equipment: string;
  ethicsReview: string;
}

export const TECH_LEVEL_META: Record<TechLevel, { label: string; color: string }> = {
  class1: { label: 'Ⅰ 类', color: 'green' },
  class2: { label: 'Ⅱ 类', color: 'blue' },
  class3: { label: 'Ⅲ 类', color: 'orange' },
  class4: { label: 'Ⅳ 类', color: 'red' },
};

export const TECH_STATUS_META: Record<TechStatus, { label: string; color: string }> = {
  planning: { label: '申报中', color: 'orange' },
  approved: { label: '已批准', color: 'blue' },
  active: { label: '开展中', color: 'green' },
  suspended: { label: '暂停', color: 'red' },
};

const DEMO: TechAdmission[] = [
  {
    id: 'TA-001',
    name: '经皮冠状动脉介入治疗（PCI）',
    category: '心血管介入',
    level: 'class4',
    status: 'active',
    admittedAt: '2025-03-15',
    description: '经皮冠状动脉球囊扩张及支架植入治疗冠心病。',
    operatorQualification: '心内科医师 ≥5 年介入经验，通过国家介入培训。',
    equipment: 'DSA、血管内超声（IVUS）、主动脉内球囊反搏泵（IABP）。',
    ethicsReview: '伦理委员会 2025-02-10 批件（编号 EC-2025-008）。',
  },
  {
    id: 'TA-002',
    name: '磁导航辅助神经外科手术',
    category: '神经外科新技术',
    level: 'class3',
    status: 'planning',
    admittedAt: null,
    description: '磁导航辅助下颅内病变精确定位与切除。',
    operatorQualification: '拟开展医师需完成 ≥20 例尸体解剖培训。',
    equipment: '磁导航系统、术中 MRI。',
    ethicsReview: '伦理审查进行中。',
  },
];

export interface TechListResult {
  items: TechAdmission[];
  demo: boolean;
}

export async function fetchTechAdmissions(): Promise<TechListResult> {
  try {
    const res = await get<{ items: TechAdmission[] }>('/tech/admissions');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
