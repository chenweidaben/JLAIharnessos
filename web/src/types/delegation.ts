/**
 * 健澜科技 jlmedaios - 家属代办授权 类型（M3-Q）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface DelegationScopeMeta {
  code: string;
  label: string;
  risk: 'low' | 'medium' | 'high';
}

export interface DelegationRecord {
  id: string;
  profileId: string;
  granterAccountId: string;
  scopes: string[];
  action: 'grant' | 'update' | 'revoke';
  status: 'active' | 'revoked';
  note: string | null;
  createdAt: string;
}

export interface GrantDelegationInput {
  profileId: string;
  scopes: string[];
  note?: string;
  confirmHighRisk?: boolean;
}

export interface RevokeDelegationInput {
  profileId: string;
  note?: string;
}
