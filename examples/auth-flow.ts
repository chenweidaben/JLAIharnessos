/**
 * 健澜科技数智医院智能体 - 示例：认证流程
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { authApi } from '@/services/api';
import { tokenManager } from '@/services/http';

export async function loginDemo(username: string, password: string) {
  const res = await authApi.login({ username, password });
  // 写入令牌（http 拦截器自动读取并附带 Authorization）
  tokenManager.set(res.accessToken, res.refreshToken, res.expiresIn);

  const me = await authApi.getUserInfo();
  const menus = await authApi.getMenus();
  console.log('欢迎，', me.name, '菜单数', menus.length);
}

// 401 时 http 层会自动用 refreshToken 重放一次；仍失败则派发 jianlan:unauthorized
window.addEventListener('jianlan:unauthorized', () => {
  location.href = '/login';
});
