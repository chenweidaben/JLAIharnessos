/**
 * 健澜科技 jlmedaios - M503 P0 合规重点（智慧服务三级）：门诊预约管理 2 端点缺口
 *
 * appointment/records 已 200（已有确认不重建）；本批补建 appointment/schedule、appointment/stats。
 * 与 M476 /outpatient/queue·/outpatient/encounters/:id、M502 /prescription/*、M501 /privacy/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/appointment/schedule - 今日出诊排班（科室/医师/职称Tag/挂号费/剩余号源）5 条 */
async function handleAppointmentSchedule(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AS-001', dept: '科室：心血管内科（门诊楼 2F）', doctor: '医师姓名：王教授（主任医师，工号 D001）', title: '职称Tag：主任医师（特需门诊）', fee: '挂号费：300 元/号', remaining: '剩余号源：今日已约 28/30，剩 2 个号源（上午 09:00-11:00）' },
    { id: 'AS-002', dept: '科室：普外科（门诊楼 3F）', doctor: '医师姓名：李教授（主任医师，工号 D021）', title: '职称Tag：主任医师（普通专家门诊）', fee: '挂号费：100 元/号', remaining: '剩余号源：今日已约 42/50，剩 8 个号源（下午 14:00-16:30）' },
    { id: 'AS-003', dept: '科室：妇产科（门诊楼 4F）', doctor: '医师姓名：陈主任（副主任医师，工号 D116）', title: '职称Tag：副主任医师（普通专家门诊）', fee: '挂号费：60 元/号', remaining: '剩余号源：今日已约 35/40，剩 5 个号源（上午 08:30-11:30）' },
    { id: 'AS-004', dept: '科室：急诊科（急诊楼 1F）', doctor: '医师姓名：刘医生（主治医师，工号 D208）', title: '职称Tag：主治医师（急诊内科）', fee: '挂号费：20 元/号（24h 全天接诊）', remaining: '剩余号源：急诊实时挂号，无号源上限' },
    { id: 'AS-005', dept: '科室：内分泌科（门诊楼 2F）', doctor: '医师姓名：赵医生（主治医师，工号 D232）', title: '职称Tag：主治医师（普通门诊）', fee: '挂号费：10 元/号', remaining: '剩余号源：今日已约 48/50，剩 2 个号源（下午 13:30-16:30）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/appointment/stats - 预约统计（日期/预约量/预约率/爽约率/分时预约占比）5 条 */
async function handleAppointmentStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AST-001', date: '日期：2026-10-20（今日）', volume: '今日预约量：1,860 人次（其中特需 60 / 专家 860 / 普通 940）', rate: '预约率：92.6%（已预约 1,860 / 可放号源 2,008）', noShow: '爽约率：3.8%（71 人次爽约，提前 24h 短信提醒后下降）', timeSlot: '分时预约占比：78.5%（1,460/1,860 人次选择 30 分钟分时预约）' },
    { id: 'AST-002', date: '日期：2026-10-19（昨日）', volume: '预约量：1,780 人次', rate: '预约率：91.2%', noShow: '爽约率：4.2%', timeSlot: '分时预约占比：76.2%' },
    { id: 'AST-003', date: '日期：2026-10-18（前日）', volume: '预约量：1,620 人次（周日）', rate: '预约率：88.5%（周末号源宽松）', noShow: '爽约率：5.6%（周末爽约率偏高）', timeSlot: '分时预约占比：72.4%' },
    { id: 'AST-004', date: '日期：2026-10-Q4 汇总（10 月 1-20 日）', volume: '累计预约量：36,820 人次', rate: '平均预约率：91.8%', noShow: '平均爽约率：4.1%（较 Q3 -0.6pct，短信提醒见效）', timeSlot: '分时预约占比：76.8%（智慧服务三级达标）' },
    { id: 'AST-005', date: '日期：2026-10-20 分渠道统计', volume: '微信 860 / 支付宝 420 / 自助机 320 / 窗口 180 / 114 平台 80', rate: '线上预约率：90.4%（1,680/1,860 人次线上）', noShow: '窗口预约爽约率：6.8%（最高，建议引导线上）', timeSlot: '微信渠道分时预约占比：86.2%（最高）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m503Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/appointment/schedule', handle: handleAppointmentSchedule, auth: true },
  { method: 'GET', path: '/api/v1/appointment/stats', handle: handleAppointmentStats, auth: true },
];
