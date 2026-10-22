/**
 * 健澜科技 jlmedaios - 字典管理 API（M746）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type DictStatus = 'active' | 'disabled';

export interface Dictionary {
  id: string;
  code: string;
  name: string;
  itemCount: number;
  status: DictStatus;
  items: { itemCode: string; itemName: string; sort: number; status: DictStatus }[];
}

export const DICT_STATUS_META: Record<DictStatus, { label: string; color: string }> = {
  active: { label: '启用', color: 'green' },
  disabled: { label: '禁用', color: 'red' },
};

const DEMO: Dictionary[] = [
  {
    id: 'DC-001',
    code: 'DICT_GENDER',
    name: '性别字典',
    itemCount: 2,
    status: 'active',
    items: [
      { itemCode: 'M', itemName: '男', sort: 1, status: 'active' },
      { itemCode: 'F', itemName: '女', sort: 2, status: 'active' },
    ],
  },
];

export interface DictListResult {
  items: Dictionary[];
  demo: boolean;
}

export async function fetchDictionaries(): Promise<DictListResult> {
  try {
    const res = await get<{ items: Dictionary[] }>('/system/dictionaries');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
