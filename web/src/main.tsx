/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 应用入口：Provider 嵌套 BrowserRouter + ConfigProvider + AntdApp
 */
// antd v5 官方 React 19 兼容补丁：必须在 react/react-dom/antd 被使用前最先引入，
// 修复 React 19 下静态 message/notification/modal 无法创建 holder（提示不弹出）等兼容问题。
import '@ant-design/v5-patch-for-react-19';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import App from './App';
import { jlTheme } from './styles/antd-theme';
import { useAuthStore } from './store/authStore';
import './styles/index.css';

dayjs.locale('zh-cn');

const container = document.getElementById('root');
if (!container) {
  throw new Error('未找到 #root 挂载节点');
}

// 在首次渲染前「同步」恢复本地登录态（localStorage 读取与 restoreSession 均为同步）。
// 否则路由守卫 RequireAuth/RequirePermission 在首帧渲染阶段读到未登录态，会在
// useEffect 恢复会话之前就重定向到 /login（整页刷新 / 直接打开深链时的时序竞争）。
useAuthStore.getState().restoreSession();

createRoot(container).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={jlTheme}>
      <AntdApp notification={{ maxCount: 5, placement: 'topRight' }}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
);
