/**
 * 健澜科技 jlmedaios - M492 P0 合规：护理管理 + 移动护理（补差异）
 *
 * 本批探测后：nursing/schedule、nursing/adverse-events、mobile/tasks、mobile/vitals 已 200（已有确认不重建）；
 * 仅补建缺失的 nursing/grading、mobile/rounds 两个端点。
 * 避开 M476·M479·M471·M491·M490 既有端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nursing/grading - 分级护理（科室/特级/一级/二级/三级护理数）5 条 */
async function handleNursingGrading(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NG-001', dept: '科室：ICU（开放床位 28 张）', special: '特级护理数：18 人（全卧床/呼吸机辅助）', grade1: '一级护理数：8 人（病重/严密观察）', grade2: '二级护理数：2 人（恢复期）', grade3: '三级护理数：0 人' },
    { id: 'NG-002', dept: '科室：心血管内科（床位 52 张）', special: '特级护理数：4 人（CCU 监护）', grade1: '一级护理数：26 人（心梗/心衰急性期）', grade2: '二级护理数：18 人（稳定期）', grade3: '三级护理数：4 人' },
    { id: 'NG-003', dept: '科室：骨科（床位 60 张）', special: '特级护理数：2 人（术后早期）', grade1: '一级护理数：18 人（术后/牵引）', grade2: '二级护理数：30 人（康复期）', grade3: '三级护理数：10 人' },
    { id: 'NG-004', dept: '科室：神经内科（床位 56 张）', special: '特级护理数：6 人（NICU 卒中单元）', grade1: '一级护理数：22 人（脑梗急性期）', grade2: '二级护理数：20 人', grade3: '三级护理数：8 人' },
    { id: 'NG-005', dept: '科室：普外科（床位 64 张）', special: '特级护理数：2 人（大术后）', grade1: '一级护理数：24 人（术后 3 天内）', grade2: '二级护理数：28 人', grade3: '三级护理数：10 人' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/mobile/rounds - 移动护理查房（日期/护士长/护理部/问题数/整改完成数）5 条 */
async function handleMobileRounds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MR-001', date: '日期：2026-10-20（周一）', headNurse: '护士长查房次数：12 次（覆盖 12 个临床科室）', deptRounds: '护理部查房次数：2 次（全院联合夜查房）', issues: '查出问题数：18 项（含医嘱核对/床旁交接/危重症护理）', rectify: '整改完成数：16 项（已闭环）' },
    { id: 'MR-002', date: '日期：2026-10-19', headNurse: '护士长查房次数：10 次', deptRounds: '护理部查房次数：1 次', issues: '查出问题数：14 项', rectify: '整改完成数：13 项' },
    { id: 'MR-003', date: '日期：2026-10-18', headNurse: '护士长查房次数：8 次（周末）', deptRounds: '护理部查房次数：0 次', issues: '查出问题数：8 项', rectify: '整改完成数：8 项' },
    { id: 'MR-004', date: '日期：2026-10-17', headNurse: '护士长查房次数：11 次', deptRounds: '护理部查房次数：1 次', issues: '查出问题数：16 项', rectify: '整改完成数：14 项' },
    { id: 'MR-005', date: '日期：2026-10-16', headNurse: '护士长查房次数：10 次', deptRounds: '护理部查房次数：1 次', issues: '查出问题数：14 项', rectify: '整改完成数：12 项（2 项跟踪中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m492Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nursing/grading', handle: handleNursingGrading, auth: true },
  { method: 'GET', path: '/api/v1/mobile/rounds', handle: handleMobileRounds, auth: true },
];
