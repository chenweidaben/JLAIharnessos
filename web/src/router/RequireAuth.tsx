/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 路由守卫：登录态校验 + 权限控制
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useUserStore } from '@/store/userStore';

interface RequireAuthProps {
  children: ReactNode;
  permission?: string;
}

export function RequireAuth({ children, permission }: RequireAuthProps) {
  const location = useLocation();
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const hasPermission = useUserStore((s) => s.hasPermission);

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}
