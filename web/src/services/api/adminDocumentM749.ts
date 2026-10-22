/**
 * 健澜科技 jlmedaios - 公文管理 API（M749）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type DocStatus = 'draft' | 'issued' | 'received' | 'archived';

export interface AdminDocument {
  id: string;
  docNo: string;
  title: string;
  dept: string;
  issuedAt: string;
  status: DocStatus;
  content: string;
  receipt: string;
  disposition: string;
}

export const DOC_STATUS_META: Record<DocStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  issued: { label: '已发文', color: 'blue' },
  received: { label: '已收文', color: 'orange' },
  archived: { label: '已归档', color: 'green' },
};

const DEMO: AdminDocument[] = [
  {
    id: 'DC-001',
    docNo: '浙健澜〔2026〕38 号',
    title: '关于开展 2026 年度医疗质量安全专项检查的通知',
    dept: '医务处',
    issuedAt: '2026-10-18',
    status: 'issued',
    content: '各科室：为加强医疗质量安全管理，定于 11 月开展专项检查……',
    receipt: '2026-10-19 办公室签收',
    disposition: '分管副院长批示：按要求落实；医务处牵头。',
  },
];

export interface DocListResult {
  items: AdminDocument[];
  demo: boolean;
}

export async function fetchAdminDocuments(): Promise<DocListResult> {
  try {
    const res = await get<{ items: AdminDocument[] }>('/admin/documents');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
