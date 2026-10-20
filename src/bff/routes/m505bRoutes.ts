/**
 * 健澜科技 jlmedaios - M505b P0 合规重点（智慧服务三级）：医疗投诉处理管理 3 端点
 *
 * complaint/list 投诉列表、complaint/handle 处理记录、complaint/stats 投诉统计。
 * 与 M471 /patient/complaints、M485b /patient/complaint-summary、M497 /ethics/complaints、
 * M505 /one-stop/*、M504 /volunteer/*、/outpatient/* 路由区分（走 complaint/ 新前缀）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/complaint/list - 投诉列表（投诉人/被投诉科室/类型Tag/状态Tag）5 条 */
async function handleComplaintList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CL-001', complainant: '投诉人：张**（女，58 岁，门诊患者，2026-10-20 现场投诉）', dept: '被投诉科室：门诊收费处', type: '类型Tag：收费问题（认为门诊 B 超收费明细不清）', status: '状态Tag：处理中（2026-10-20 10:30 受理，限期 3 个工作日）' },
    { id: 'CL-002', complainant: '投诉人：李**家属（男，66 岁住院患者家属，2026-10-19 电话投诉）', dept: '被投诉科室：普外科病房', type: '类型Tag：服务态度（护士呼叫应答不及时）', status: '状态Tag：待受理（2026-10-19 16:00 转办，待护理部受理）' },
    { id: 'CL-003', complainant: '投诉人：王**（女，45 岁住院患者，2026-10-18 12345 热线转办）', dept: '被投诉科室：门诊药房', type: '类型Tag：医疗质量（发药交代不清）', status: '状态Tag：已办结（2026-10-19 17:00 办结，患者满意）' },
    { id: 'CL-004', complainant: '投诉人：赵**（男，72 岁急诊患者，2026-10-15 现场投诉）', dept: '被投诉科室：急诊科', type: '类型Tag：环境设施（急诊卫生间脏、排队叫号系统故障）', status: '状态Tag：不满意（2026-10-18 办结但患者仍不满意，需二次处理）' },
    { id: 'CL-005', complainant: '投诉人：孙**（女，52 岁门诊患者，2026-10-12 微信公众号投诉）', dept: '被投诉科室：心血管内科', type: '类型Tag：医德医风（医师未充分解释病情、态度生硬）', status: '状态Tag：已办结（2026-10-14 办结，基本满意）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/complaint/handle - 处理记录（投诉编号/受理人/处理时限Tag/处理结果Tag）5 条 */
async function handleComplaintHandle(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CH-001', no: '投诉编号：TS-2026-1020-001（对应 CL-001 收费投诉）', handler: '受理人：门诊办公室 王主任（工号 S001）', sla: '处理时限Tag：24-72h（2026-10-20 受理，限期 10-23 办结）', result: '处理结果Tag：满意（已向患者出具费用明细清单并解释，患者签字确认）' },
    { id: 'CH-002', no: '投诉编号：TS-2026-1019-002（对应 CL-002 护士应答投诉）', handler: '受理人：护理部 李护士长（工号 N001）', sla: '处理时限Tag：≤24h（2026-10-19 受理，2026-10-20 已办结）', result: '处理结果Tag：基本满意（已督促病房护士加强巡视频次，家属接受）' },
    { id: 'CH-003', no: '投诉编号：TS-2026-1018-003（对应 CL-003 药房发药投诉）', handler: '受理人：药剂科 周主管药师（工号 P001）', sla: '处理时限Tag：≤24h（2026-10-18 受理，当日办结）', result: '处理结果Tag：满意（药房已推行用药指导单书面签收制度，患者满意）' },
    { id: 'CH-004', no: '投诉编号：TS-2026-1015-004（对应 CL-004 急诊环境投诉）', handler: '受理人：后勤保障科 赵科长（工号 H001）', sla: '处理时限Tag：24-72h（2026-10-15 受理，2026-10-18 办结）', result: '处理结果Tag：不满意（卫生间已清洁但叫号系统未及时修复，需二次处理）' },
    { id: 'CH-005', no: '投诉编号：TS-2026-1012-005（对应 CL-005 医德医风投诉）', handler: '受理人：医务处 陈主任（工号 M001）', sla: '处理时限Tag：≤24h（2026-10-12 受理，2026-10-14 办结）', result: '处理结果Tag：基本满意（医师已当面向患者致歉并重新解释病情）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/complaint/stats - 投诉统计（月份/投诉量/办结率/满意率/平均处理时长）5 条 */
async function handleComplaintStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CSt-001', month: '月份：2026-10（本月累计，截至 10-20）', volume: '本月投诉量：42 件（较上月 -8 件，持续下降）', close: '办结率：92.9%（39/42 件已办结，3 件处理中）', satisfy: '满意率：85.7%（36/42 件满意或基本满意，6 件不满意）', avgTime: '平均处理时长：18.5 小时/件（较上月 -3.2h，提速见效）' },
    { id: 'CSt-002', month: '月份：2026-09（上月完整数据）', volume: '投诉量：50 件', close: '办结率：94.0%', satisfy: '满意率：84.0%', avgTime: '平均处理时长：21.7 小时/件' },
    { id: 'CSt-003', month: '月份：2026-08', volume: '投诉量：56 件（暑期高峰）', close: '办结率：91.1%', satisfy: '满意率：82.1%', avgTime: '平均处理时长：24.3 小时/件' },
    { id: 'CSt-004', month: '月份：2026-Q3 汇总（7-9 月）', volume: '季度投诉量：158 件', close: '季度办结率：92.4%', satisfy: '季度满意率：83.2%', avgTime: '季度平均处理时长：22.1 小时/件' },
    { id: 'CSt-005', month: '月份：2026-10 分类型统计', volume: '服务态度 12 / 医疗质量 8 / 收费问题 10 / 医德医风 6 / 环境设施 6', close: '办结率最高：收费问题 100%（10/10）', satisfy: '满意率最低：环境设施 66.7%（4/6，需加强后勤响应）', avgTime: '平均时长最短：服务态度 12.5h（最快办结）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m505bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/complaint/list', handle: handleComplaintList, auth: true },
  { method: 'GET', path: '/api/v1/complaint/handle', handle: handleComplaintHandle, auth: true },
  { method: 'GET', path: '/api/v1/complaint/stats', handle: handleComplaintStats, auth: true },
];
