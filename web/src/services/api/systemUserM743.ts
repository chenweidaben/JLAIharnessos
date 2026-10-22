/**
 * 健澜科技 jlmedaios - 用户管理 API（M743）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type UserStatus = 'active' | 'locked' | 'disabled';

export interface SystemUser {
  id: string;
  username: string;
  name: string;
  dept: string;
  role: string;
  status: UserStatus;
  permissions: string[];
  loginLogs: { time: string; ip: string; result: string }[];
}

export const USER_STATUS_META: Record<UserStatus, { label: string; color: string }> = {
  active: { label: '启用', color: 'green' },
  locked: { label: '已锁定', color: 'orange' },
  disabled: { label: '已禁用', color: 'red' },
};

const DEMO: SystemUser[] = [
  {
    id: 'SU-001',
    username: 'chenwei',
    name: '陈维',
    dept: '信息科',
    role: '系统管理员',
    status: 'active',
    permissions: ['user:list', 'role:list', 'dept:list', 'dict:list', 'audit:list'],
    loginLogs: [
      { time: '2026-10-22 08:30', ip: '10.20.30.40', result: '成功' },
      { time: '2026-10-21 18:20', ip: '10.20.30.40', result: '成功' },
    ],
  },
];

export interface UserListResult {
  items: SystemUser[];
  demo: boolean;
}

export async function fetchSystemUsers(): Promise<UserListResult> {
  try {
    const res = await get<{ items: SystemUser[] }>('/system/users');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
