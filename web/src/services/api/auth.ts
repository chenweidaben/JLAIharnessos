/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 认证相关 API
 */
import { post, get } from '../request';
import { mockLogin } from '@/mock/users';
import { delay } from '@/mock/utils';
import { env } from '@/utils/config';
import type { LoginRequest, LoginResponse, UserInfo } from '@/types/user';

export async function loginApi(payload: LoginRequest): Promise<LoginResponse> {
  if (env.mockEnabled) {
    await delay(300, 600);
    return mockLogin(payload.username);
  }
  return post<LoginResponse>('/auth/login', payload);
}

export async function fetchProfile(): Promise<UserInfo> {
  if (env.mockEnabled) {
    await delay(100, 200);
    return mockLogin('doctor_chen').user;
  }
  return get<UserInfo>('/auth/profile');
}

export async function logoutApi(): Promise<void> {
  if (env.mockEnabled) return;
  await post('/auth/logout');
}
