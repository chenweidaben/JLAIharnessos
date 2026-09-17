/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 根组件：注入全局错误处理 / 401 跳转 / 消息提示
 */
import { useEffect } from 'react';
import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';

import AppRoutes from '@/router';
import { ErrorBoundary } from '@/components/common';
import { setupRequestHandlers } from '@/services/request';

export default function App() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  useEffect(() => {
    setupRequestHandlers({
      onError: (msg: string) => message.error(msg),
      onUnauthorized: () => navigate('/login', { replace: true }),
    });
  }, [message, navigate]);

  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}
