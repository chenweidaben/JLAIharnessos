/**
 * 健澜科技 jlmedaios - MDT 治疗方案类型（M67-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export interface TreatmentPlan {
  id: string;
  mdtConsultId: string;
  visitId: string;
  planType: 'chemotherapy' | 'surgery' | 'radiotherapy' | 'targeted' | 'immunotherapy' | 'supportive';
  draft: string;
  scheduledAt: string | null;
  status: 'draft' | 'confirmed' | 'cancelled';
  confirmedBy: string | null;
  createdAt: string;
}

export interface DraftPlanInput {
  mdtConsultId: string;
  visitId: string;
  departments: string[];
  conclusion: string;
  draft?: string;
}
