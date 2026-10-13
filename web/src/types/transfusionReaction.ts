/**
 * 健澜科技 jlmedaios - 输血反应类型（M71-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export type ReactionType = 'fever' | 'allergy' | 'hemolysis' | 'taco' | 'other';
export type ReactionSeverity = 'mild' | 'moderate' | 'severe';

export interface TransfusionReaction {
  id: string;
  patientId: string;
  transfusionId: string | null;
  reactionType: ReactionType;
  severity: ReactionSeverity;
  symptoms: string;
  blocked: boolean;
  reportedBy: string;
  createdAt: string;
}

export interface ReportInput {
  patientId: string;
  transfusionId?: string | null;
  reactionType: string;
  severity: string;
  symptoms: string;
}
