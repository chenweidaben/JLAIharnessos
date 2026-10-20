/**
 * 健澜科技 jlmedaios - M307 互联网医院域
 *
 * 互联网预约/健康档案/随访管理
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/internet/appointments - 互联网预约 5 条 */
async function handleInternetAppointments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IA-001', apptNo: 'NET-20261020-001', patient: '王***', doctor: '李***主任医师', dept: '心血管内科', time: '2026-10-22 09:00' },
    { id: 'IA-002', apptNo: 'NET-20261020-002', patient: '李***', doctor: '陈***副主任医师', dept: '普外科', time: '2026-10-22 10:30' },
    { id: 'IA-003', apptNo: 'NET-20261020-003', patient: '张***', doctor: '王***主治医师', dept: '骨科', time: '2026-10-23 14:00' },
    { id: 'IA-004', apptNo: 'NET-20261020-004', patient: '赵***', doctor: '刘***主任医师', dept: '呼吸内科', time: '2026-10-23 15:30' },
    { id: 'IA-005', apptNo: 'NET-20261020-005', patient: '孙***', doctor: '张***副主任医师', dept: '神经内科', time: '2026-10-24 09:30' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/internet/health-records - 健康档案 5 条 */
async function handleInternetHealthRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IHR-001', patient: '王***', basicInfo: '男，58 岁，高血压 5 年', pastHistory: '2020 年行冠状动脉支架植入术', updateTime: '2026-10-15' },
    { id: 'IHR-002', patient: '李***', basicInfo: '女，45 岁，2 型糖尿病 3 年', pastHistory: '2022 年剖宫产手术史', updateTime: '2026-10-12' },
    { id: 'IHR-003', patient: '张***', basicInfo: '男，62 岁，慢阻肺 8 年', pastHistory: '长期吸烟史（已戒烟 2 年）', updateTime: '2026-10-10' },
    { id: 'IHR-004', patient: '赵***', basicInfo: '女，35 岁，健康体检', pastHistory: '无特殊疾病史', updateTime: '2026-09-28' },
    { id: 'IHR-005', patient: '孙***', basicInfo: '男，70 岁，冠心病+房颤', pastHistory: '2019 年心脏起搏器植入术', updateTime: '2026-10-18' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/internet/followup - 随访管理 5 条 */
async function handleInternetFollowup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IF-001', patient: '王***', type: '术后随访（冠脉支架）', time: '2026-10-25 10:00', doctor: '李***主任医师', status: '待随访' },
    { id: 'IF-002', patient: '李***', type: '糖尿病随访（血糖监测）', time: '2026-10-22 14:00', doctor: '陈***主治医师', status: '已完成' },
    { id: 'IF-003', patient: '张***', type: '慢阻肺随访（肺功能复查）', time: '2026-10-28 09:30', doctor: '刘***主任医师', status: '待随访' },
    { id: 'IF-004', patient: '孙***', type: '起搏器随访（远程监测）', time: '2026-10-21 16:00', doctor: '张***副主任医师', status: '已完成' },
    { id: 'IF-005', patient: '赵***', type: '产后随访（42 天复查）', time: '2026-11-01 11:00', doctor: '妇产科 周***主治医师', status: '待随访' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m307Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/internet/appointments', handle: handleInternetAppointments, auth: true },
  { method: 'GET', path: '/api/v1/internet/health-records', handle: handleInternetHealthRecords, auth: true },
  { method: 'GET', path: '/api/v1/internet/followup', handle: handleInternetFollowup, auth: true },
];
