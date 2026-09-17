/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * Mock 用户数据（医生 / 护士 / 管理员，均为虚拟）
 */
import type { LoginResponse, UserInfo } from '@/types/user';
import { uid } from './utils';

export const mockUsers: UserInfo[] = [
  {
    id: uid('u_'),
    username: 'doctor_chen',
    realName: '陈**',
    gender: 'male',
    deptCode: 'internal',
    deptName: '呼吸内科',
    title: '主任医师',
    roles: ['doctor'],
    permissions: ['patient:view', 'order:write', 'chat:use'],
  },
  {
    id: uid('u_'),
    username: 'nurse_li',
    realName: '李**',
    gender: 'female',
    deptCode: 'internal',
    deptName: '呼吸内科',
    title: '主管护师',
    roles: ['nurse'],
    permissions: ['patient:view', 'vital:record'],
  },
  {
    id: uid('u_'),
    username: 'admin',
    realName: '系统管理员',
    gender: 'unknown',
    deptCode: 'admin',
    deptName: '信息科',
    title: '工程师',
    roles: ['admin'],
    permissions: ['*'],
  },
];

export function mockLogin(username: string): LoginResponse {
  const user = mockUsers.find((u) => u.username === username) ?? mockUsers[0];
  return {
    user,
    tokens: {
      accessToken: `mock-access-${Date.now()}`,
      refreshToken: `mock-refresh-${Date.now()}`,
      expiresIn: 7200,
    },
  };
}
