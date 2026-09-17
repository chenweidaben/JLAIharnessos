/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 住院查房场景 - 路由配置（供主路由合并注册）
 *
 * 用法：
 *   import { wardRoutes } from '@/router/wardRoutes';
 *   createBrowserRouter([...wardRoutes, ...其他业务路由]);
 */
import type { RouteObject } from 'react-router-dom';
import WardWorkbench from '@/pages/ward/WardWorkbench';
import RoundDetail from '@/pages/ward/RoundDetail';

export const wardRoutes: RouteObject[] = [
  {
    path: '/ward',
    element: <WardWorkbench />,
  },
  {
    path: '/ward/round/:patientId',
    element: <RoundDetail />,
  },
];
