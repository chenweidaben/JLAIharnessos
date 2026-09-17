/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 用户与权限管理 API
 */
import { get, post, put, del } from '../request';
import { delay } from '@/mock/utils';
import { env } from '@/utils/config';

export interface ManagedUser {
  id: string;
  username: string;
  name: string;
  department: string;
  roles: string[];
  enabled: boolean;
}

export const userApi = {
  async list(): Promise<ManagedUser[]> {
    if (env.mockEnabled) {
      await delay(120, 300);
      return [
        {
          id: 'u_1001',
          username: 'chenwei',
          name: '陈维',
          department: '医务处',
          roles: ['admin'],
          enabled: true,
        },
        {
          id: 'u_1002',
          username: 'doctor.li',
          name: '李晓东',
          department: '心内科',
          roles: ['doctor'],
          enabled: true,
        },
      ];
    }
    return get<ManagedUser[]>('/users');
  },
  create(data: Partial<ManagedUser> & { password: string }) {
    return post<ManagedUser>('/users', data);
  },
  update(id: string, data: Partial<ManagedUser>) {
    return put<ManagedUser>(`/users/${id}`, data);
  },
  remove(id: string) {
    return del<void>(`/users/${id}`);
  },
  enable(id: string) {
    return post<void>(`/users/${id}/enable`);
  },
  disable(id: string) {
    return post<void>(`/users/${id}/disable`);
  },
  async roles() {
    if (env.mockEnabled) {
      await delay(80, 200);
      return [
        { id: 'r_admin', code: 'admin', name: '系统管理员' },
        { id: 'r_doctor', code: 'doctor', name: '主治医师' },
      ];
    }
    return get('/users/roles');
  },
  assignPermissions(roleId: string, permissionIds: string[]) {
    return post<void>(`/users/roles/${roleId}/permissions`, { permissionIds });
  },
};
