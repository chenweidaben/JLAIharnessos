/**
 * 健澜科技 jlmedaios - M478 P0 合规：医院运营实时看板（今日门急诊/住院实时/手术间实时）
 *
 * 今日门急诊量 / 住院实时在院 / 手术间实时排程
 * （research/projects、research/papers、research/grants 已存在，不重复建）。
 * 避开 M9-A dashboard/stats、M464 research 其他端点、M471-M477 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/operation/daily-visits - 今日门急诊量（科室/门诊人次/急诊人次/发热门诊人次/环比）5 条 */
async function handleDailyVisits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ODV-001', dept: '口径：全院门急诊汇总（今日截至 10:00）', outpatient: '门诊人次：1,286', emergency: '急诊人次：142', feverClinic: '发热门诊人次：18', mom: '环比：较昨日同时段 +6.2%（早高峰平稳）' },
    { id: 'ODV-002', dept: '科室：内科门诊（呼吸/消化/内分泌）', outpatient: '门诊人次：312', emergency: '急诊人次：0（专科门诊）', feverClinic: '发热门诊人次：0', mom: '环比：+4.5%' },
    { id: 'ODV-003', dept: '科室：外科门诊（普外/骨科/神外）', outpatient: '门诊人次：198', emergency: '急诊人次：0', feverClinic: '发热门诊人次：0', mom: '环比：持平' },
    { id: 'ODV-004', dept: '科室：急诊科（含抢救/留观）', outpatient: '门诊人次：0', emergency: '急诊人次：142（其中抢救 6、留观 11）', feverClinic: '发热门诊人次：18（独立通道）', mom: '环比：+9.8%（夜间急诊延续）' },
    { id: 'ODV-005', dept: '科室：妇产科门诊 + 儿科门诊', outpatient: '门诊人次：245（妇产 152、儿科 93）', emergency: '急诊人次：0', feverClinic: '发热门诊人次：0', mom: '环比：+3.1%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operation/inpatient-status - 住院实时（科室/在院/今日入院/今日出院/空床）5 条 */
async function handleInpatientStatus(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OIS-001', dept: '口径：全院住院汇总', inHouse: '在院：1,386 人', todayAdmit: '今日入院：62 人', todayDischarge: '今日出院：58 人', emptyBed: '空床：42 张（全院床位使用率 97.1%）' },
    { id: 'OIS-002', dept: '科室：呼吸与危重症内科', inHouse: '在院：58 人', todayAdmit: '今日入院：4 人', todayDischarge: '今日出院：3 人', emptyBed: '空床：2 张' },
    { id: 'OIS-003', dept: '科室：心血管内科（CCU 2 床）', inHouse: '在院：62 人', todayAdmit: '今日入院：3 人', todayDischarge: '今日出院：4 人', emptyBed: '空床：1 张（加床 2 张）' },
    { id: 'OIS-004', dept: '科室：普外科', inHouse: '在院：55 人', todayAdmit: '今日入院：5 人', todayDischarge: '今日出院：5 人', emptyBed: '空床：5 张' },
    { id: 'OIS-005', dept: '科室：ICU', inHouse: '在院：14 人', todayAdmit: '今日入院：1 人（转入）', todayDischarge: '今日出院：1 人（转普通病房）', emptyBed: '空床：2 张（共 16 床）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operation/operation-room - 手术间实时（手术间/正在手术/今日已完成/接台等待）5 条 */
async function handleOperationRoom(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OOR-001', room: '手术间：1#（普外科间）', ongoing: '正在手术：腹腔镜胆囊切除（第 2 台）', done: '今日已完成：3 台', waiting: '接台等待：1 台（患者已备皮等候）' },
    { id: 'OOR-002', room: '手术间：2#（骨科间）', ongoing: '正在手术：股骨内固定取出', done: '今日已完成：2 台', waiting: '接台等待：2 台' },
    { id: 'OOR-003', room: '手术间：3#（妇产科间）', ongoing: '正在手术：剖宫产', done: '今日已完成：4 台', waiting: '接台等待：0 台' },
    { id: 'OOR-004', room: '手术间：4#（神经外科间）', ongoing: '正在手术：硬膜下血肿引流（显微）', done: '今日已完成：1 台', waiting: '接台等待：1 台（术中耗时较长）' },
    { id: 'OOR-005', room: '手术间：5#（日间手术间）', ongoing: '正在手术：体表肿物切除', done: '今日已完成：6 台（日间周转快）', waiting: '接台等待：3 台' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m478Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/operation/daily-visits', handle: handleDailyVisits, auth: true },
  { method: 'GET', path: '/api/v1/operation/inpatient-status', handle: handleInpatientStatus, auth: true },
  { method: 'GET', path: '/api/v1/operation/operation-room', handle: handleOperationRoom, auth: true },
];
