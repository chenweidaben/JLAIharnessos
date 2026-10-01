/**
 * 健澜科技 jlmedaios - 智能导诊/预问诊 类型（M3-P）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface DepartmentRecommendation {
  department: string;
  confidence: number;
  matchedKeywords: string[];
  reason: string;
}

export interface TriageSession {
  id: string;
  accountId: string | null;
  patientId: string | null;
  symptoms: string;
  dialog: { role: string; content: string }[];
  recommendations: DepartmentRecommendation[];
  chosenDepartment: string | null;
  engineType: 'rule' | 'llm' | 'hybrid';
  status: 'open' | 'completed';
  createdAt: string;
  completedAt: string | null;
}

export interface PreliminaryHistoryInput {
  chiefComplaint: string;
  presentIllness: string;
  pastHistory?: string | null;
  medications?: string | null;
  allergies?: string | null;
  onsetTime?: string | null;
  accompanyingSymptoms?: string[] | null;
}

export interface PreliminaryConsultation {
  id: string;
  triageSessionId: string | null;
  accountId: string | null;
  patientId: string | null;
  targetDepartment: string | null;
  chiefComplaint: string | null;
  presentIllness: string | null;
  pastHistory: string | null;
  medications: string | null;
  allergies: string | null;
  structured: Record<string, unknown>;
  reportText: string | null;
  engineType: 'form' | 'llm' | 'hybrid';
  status: 'draft' | 'completed' | 'consumed';
  createdAt: string;
  completedAt: string | null;
}

export interface StartTriageInput {
  symptoms: string;
  patientId?: string | null;
}

export interface SubmitPreliminaryInput {
  triageSessionId?: string | null;
  patientId?: string | null;
  targetDepartment?: string | null;
  history: PreliminaryHistoryInput;
}
