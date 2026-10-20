/**
 * 健澜科技 jlmedaios - M281 移动端扩展 + 智能服务
 *
 * 移动生命体征/移动扫码/智能服务排队
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/mobile/vitals - 移动护理生命体征 5 条 */
async function handleMobileVitals(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const vitals = [
    { id: 'MV-001', patient: '张***（312-05）', temperature: '36.8℃', pulse: '72 次/分', bloodPressure: '128/82 mmHg', time: '2026-10-20 08:00' },
    { id: 'MV-002', patient: '李***（208-12）', temperature: '37.2℃', pulse: '80 次/分', bloodPressure: '135/85 mmHg', time: '2026-10-20 08:30' },
    { id: 'MV-003', patient: '王***（405-03）', temperature: '36.5℃', pulse: '68 次/分', bloodPressure: '120/75 mmHg', time: '2026-10-20 09:00' },
    { id: 'MV-004', patient: '赵***（501-08）', temperature: '38.5℃', pulse: '95 次/分', bloodPressure: '145/90 mmHg', time: '2026-10-20 09:30' },
    { id: 'MV-005', patient: '陈***（210-02）', temperature: '36.7℃', pulse: '75 次/分', bloodPressure: '130/80 mmHg', time: '2026-10-20 10:00' },
  ];
  return json(ok({ vitals, totalCount: vitals.length }));
}

/** GET /api/v1/mobile/scan - 移动扫码记录 5 条 */
async function handleMobileScan(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const scans = [
    { id: 'MS-001', scanType: '药品条码', patient: '张***', medication: '阿司匹林肠溶片 100mg', time: '2026-10-20 08:35', scanner: '陈护士' },
    { id: 'MS-002', scanType: '患者腕带', patient: '李***', medication: '—', time: '2026-10-20 09:00', scanner: '刘护士' },
    { id: 'MS-003', scanType: '输液条码', patient: '王***', medication: '0.9% NaCl 100ml', time: '2026-10-20 09:20', scanner: '王护士' },
    { id: 'MS-004', scanType: '药品条码', patient: '赵***', medication: '二甲双胍片 0.5g', time: '2026-10-20 09:45', scanner: '孙护士' },
    { id: 'MS-005', scanType: '标本条码', patient: '陈***', medication: '血常规标本', time: '2026-10-20 10:10', scanner: '周护士' },
  ];
  return json(ok({ scans, totalCount: scans.length }));
}

/** GET /api/v1/smart-service/queue - 智能服务排队 5 条 */
async function handleSmartServiceQueue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const queues = [
    { id: 'SQ-001', window: '门诊收费 1 号窗', waitingCount: 8, currentNo: 'A025', avgWaitTime: '12 分钟', status: '服务中' },
    { id: 'SQ-002', window: '门诊收费 2 号窗', waitingCount: 5, currentNo: 'B018', avgWaitTime: '8 分钟', status: '服务中' },
    { id: 'SQ-003', window: '医保结算 1 号窗', waitingCount: 12, currentNo: 'C032', avgWaitTime: '20 分钟', status: '繁忙' },
    { id: 'SQ-004', window: '药房取药 1 号窗', waitingCount: 15, currentNo: 'D010', avgWaitTime: '15 分钟', status: '服务中' },
    { id: 'SQ-005', window: '检验采血窗口', waitingCount: 6, currentNo: 'E008', avgWaitTime: '10 分钟', status: '服务中' },
  ];
  return json(ok({ queues, totalCount: queues.length }));
}

export const m281Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/mobile/vitals', handle: handleMobileVitals, auth: true },
  { method: 'GET', path: '/api/v1/mobile/scan', handle: handleMobileScan, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/queue', handle: handleSmartServiceQueue, auth: true },
];
