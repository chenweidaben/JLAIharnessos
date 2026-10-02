/**
 * 健澜科技 jlmedaios - 科研专病队列类型（M5-B）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

export interface CohortLabCriteria {
  itemCode?: string;
  itemName?: string;
  op: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

export interface CohortCriteria {
  include: {
    minAge?: number;
    maxAge?: number;
    gender?: string;
    diagnoses?: string[];
    tags?: string[];
    labs?: CohortLabCriteria[];
  };
  exclude: {
    diagnoses?: string[];
    tags?: string[];
    labs?: CohortLabCriteria[];
  };
}

export interface ResearchCohort {
  id: string;
  name: string;
  disease: string;
  diseaseCode: string | null;
  criteria: CohortCriteria;
  status: 'draft' | 'active' | 'archived';
  createdBy: string | null;
  lastRunAt: string | null;
  lastRunAdded: number;
  createdAt: string;
  updatedAt: string;
}

export interface CohortMember {
  id: string;
  cohortId: string;
  patientId: string;
  matchedAt: string;
  matchedRules: string[];
  dataSnapshot: Record<string, unknown>;
}

export interface CohortStats {
  total: number;
  byGender: Record<string, number>;
  ageBuckets: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
}

export interface CohortRunResult {
  cohortId: string;
  scanned: number;
  added: number;
  totalMembers: number;
}

export interface CreateCohortInput {
  name: string;
  disease: string;
  diseaseCode?: string | null;
  criteria: CohortCriteria;
}
