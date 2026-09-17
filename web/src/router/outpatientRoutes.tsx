/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 门诊场景路由定义（供主路由合并）：
 *   /outpatient                    门诊工作台
 *   /outpatient/consult/:encounterId  门诊问诊详情
 * 主路由（由框架 Agent 创建）可直接：children: [...outpatientRoutes]
 */
import type { RouteObject } from 'react-router-dom';
import OutpatientPage from '@/pages/OutpatientPage';
import OutpatientConsultPage from '@/pages/OutpatientConsultPage';

export const outpatientRoutes: RouteObject[] = [
  {
    path: '/outpatient',
    element: <OutpatientPage />,
  },
  {
    path: '/outpatient/consult/:encounterId',
    element: <OutpatientConsultPage />,
  },
];

export default outpatientRoutes;
