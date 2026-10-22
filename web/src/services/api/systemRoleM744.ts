/**
 * 健澜科技 jlmedaios - 角色权限管理 API（M744）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type RoleStatus = 'active' | 'disabled';

export interface SystemRole {
  id: string;
  name: string;
  code: string;
  userCount: number;
  status: RoleStatus;
  menuPermissions: string[];
  dataScope: string;
}

export const ROLE_STATUS_META: Record<RoleStatus, { label: string; color: string }> = {
  active: { label: '启用', color: 'green' },
  disabled: { label: '禁用', color: 'red' },
};

const DEMO: SystemRole[] = [
  {
    id: 'SR-001',
    name: '系统管理员',
    code: 'ROLE_ADMIN',
    userCount: 3,
    status: 'active',
    menuPermissions: ['dashboard', 'system/users', 'system/roles', 'system/depts', 'system/dict', 'system/audit'],
    dataScope: '全院全部数据',
  },
];

export interface RoleListResult {
  items: SystemRole[];
  demo: boolean;
}

export async function fetchSystemRoles(): Promise<RoleListResult> {
  try {
    const res = await get<{ items: SystemRole[] }>('/system/roles');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
