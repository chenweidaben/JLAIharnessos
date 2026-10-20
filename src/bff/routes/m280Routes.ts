/**
 * 健澜科技 jlmedaios - M280 移动端 PDA 任务
 *
 * PDA 护理任务列表
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/mobile/pda-tasks - PDA 任务列表 5 条 */
async function handleMobilePdaTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const tasks = [
    { id: 'PT-001', taskNo: 'PDA-20261020-001', patient: '张***（312-05）', taskType: '体温测量', nurse: '陈护士', status: '待执行' },
    { id: 'PT-002', taskNo: 'PDA-20261020-002', patient: '李***（208-12）', taskType: '静脉输液', nurse: '刘护士', status: '执行中' },
    { id: 'PT-003', taskNo: 'PDA-20261020-003', patient: '王***（405-03）', taskType: '口服药发放', nurse: '王护士', status: '已完成' },
    { id: 'PT-004', taskNo: 'PDA-20261020-004', patient: '赵***（501-08）', taskType: '血糖监测', nurse: '孙护士', status: '待执行' },
    { id: 'PT-005', taskNo: 'PDA-20261020-005', patient: '陈***（210-02）', taskType: '护理评估', nurse: '周护士', status: '已完成' },
  ];
  return json(ok({ tasks, totalCount: tasks.length, pendingCount: 2, inProgressCount: 1, completedCount: 2 }));
}

export const m280Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/mobile/pda-tasks', handle: handleMobilePdaTasks, auth: true },
];
