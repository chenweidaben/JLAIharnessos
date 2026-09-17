/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 路由守卫与权限控制：
 * - AuthGuard：登录态校验（未登录跳转 /login）
 * - RequirePermission / PermissionWrapper：路由级 / 组件级权限
 * - usePermission / useHasRole：按钮级权限 Hook
 * - SessionTimeoutWatcher：会话临期提醒（剩余 5 分钟）与超时自动登出
 * 说明：与既有 router/RequireAuth.tsx 并存，本文件面向 RBAC 全量权限体系。
 */
import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { App as AntdApp } from 'antd';

import { useAuthStore } from '@/store/authStore';

/* ------------------------------------------------------------------ */
/* 路由级：登录态校验                                                    */
/* ------------------------------------------------------------------ */
export function AuthGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // 首次进入尝试从本地恢复会话
  useEffect(() => {
    if (!isAuthenticated) restoreSession();
  }, [isAuthenticated, restoreSession]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/* 路由级 / 页面级：权限校验                                              */
/* ------------------------------------------------------------------ */
interface RequirePermissionProps {
  permission?: string;
  role?: string | string[];
  children: ReactNode;
}

export function RequirePermission({ permission, role, children }: RequirePermissionProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasRole = useAuthStore((s) => s.hasRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/403" replace />;
  if (role && !hasRole(role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/* 组件级：无权限隐藏或禁用                                                */
/* ------------------------------------------------------------------ */
interface PermissionWrapperProps {
  code: string;
  mode?: 'hide' | 'disable';
  children: ReactNode;
}

export function PermissionWrapper({ code, mode = 'hide', children }: PermissionWrapperProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const allowed = hasPermission(code);
  if (allowed) return <>{children}</>;
  if (mode === 'disable') {
    return (
      <span aria-disabled style={{ opacity: 0.5, pointerEvents: 'none' }}>
        {children}
      </span>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Hook：按钮级 / 任意粒度权限判定                                        */
/* ------------------------------------------------------------------ */
export function usePermission() {
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.roles);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasRole = useAuthStore((s) => s.hasRole);
  return { permissions, roles, hasPermission, hasRole };
}

/* ------------------------------------------------------------------ */
/* 会话超时：剩余 5 分钟提醒，超时自动登出                                 */
/* ------------------------------------------------------------------ */
const WARN_MS = 5 * 60 * 1000;

export function SessionTimeoutWatcher() {
  const accessExpiresAt = useAuthStore((s) => s.accessExpiresAt);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const refreshAccessToken = useAuthStore((s) => s.refreshAccessToken);
  const { modal } = AntdApp.useApp();

  useEffect(() => {
    if (!isAuthenticated || !accessExpiresAt) return undefined;
    let warned = false;

    const timer = window.setInterval(() => {
      const remain = accessExpiresAt - Date.now();
      if (remain <= 0) {
        window.clearInterval(timer);
        logout();
        window.location.href = '/login';
        return;
      }
      if (!warned && remain <= WARN_MS) {
        warned = true;
        modal.warning({
          title: '会话即将过期',
          content: `您的登录状态将在 ${Math.ceil(remain / 60000)} 分钟后失效，请及时保存工作。`,
          okText: '保持登录',
          cancelText: '退出登录',
          onOk: async () => {
            await refreshAccessToken();
            warned = false;
          },
          onCancel: () => logout(),
        });
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [accessExpiresAt, isAuthenticated, logout, refreshAccessToken, modal]);

  return null;
}
