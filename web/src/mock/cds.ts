/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 临床决策支持(CDS) Mock
 */
export const mockCDSRules = [
  {
    id: 'cds_01',
    code: 'DDI_WARFARIN_ASA',
    name: '华法林+阿司匹林出血风险',
    severity: 'critical' as const,
    enabled: true,
  },
  {
    id: 'cds_02',
    code: 'LAB_TROPONIN',
    name: '肌钙蛋白危急值',
    severity: 'critical' as const,
    enabled: true,
  },
  {
    id: 'cds_03',
    code: 'SEPSIS_QSOFA',
    name: '脓毒症早识别',
    severity: 'warning' as const,
    enabled: true,
  },
];

export const mockDrugInfo: Record<
  string,
  { name: string; indications: string; contraindications: string }
> = {
  头孢呋辛: {
    name: '头孢呋辛',
    indications: '敏感菌呼吸道/泌尿道感染',
    contraindications: '头孢类过敏者禁用',
  },
  华法林: {
    name: '华法林钠',
    indications: '血栓栓塞、房颤抗凝',
    contraindications: '活动性出血、妊娠',
  },
};

export const mockDrugInteractions = [
  {
    drugA: '华法林',
    drugB: '阿司匹林',
    severity: 'major' as const,
    description: '显著增加出血风险',
    suggestion: '评估后避免长期联用',
  },
];
