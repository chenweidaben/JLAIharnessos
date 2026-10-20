/**
 * 健澜科技 jlmedaios - M504 P0 合规重点（智慧服务三级）：志愿服务管理 3 端点
 *
 * volunteer/team 志愿队伍、volunteer/activity 志愿活动、volunteer/stats 志愿统计。
 * 与 M503 /appointment/*、M502 /prescription/*、M501 /privacy/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/volunteer/team - 志愿队伍（队伍名/所属部门/人数/负责人/联系电话）5 条 */
async function handleVolunteerTeam(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'VT-001', name: '队伍名称：门诊导医志愿服务队（成立于 2018 年）', dept: '所属部门：门诊部（门诊办公室主管）', count: '人数：32 人（退休医护 12 / 在校医学生 16 / 社会志愿者 4）', leader: '负责人：王护士长（退休心血管内科，工号 V001）', phone: '联系电话：0571-8888-1234（门诊办公室内线 8001）' },
    { id: 'VT-002', name: '队伍名称：病房陪伴志愿服务队', dept: '所属部门：护理部（社工部联合管理）', count: '人数：18 人（心理专业学生 10 / 社会志愿者 8）', leader: '负责人：李社工（医务社工，工号 S003）', phone: '联系电话：0571-8888-5678（社工部内线 8002）' },
    { id: 'VT-003', name: '队伍名称：安宁疗护志愿服务队', dept: '所属部门：姑息医学科（安宁疗护中心）', count: '人数：12 人（心理咨询师 4 / 宗教人士 2 / 社会志愿者 6）', leader: '负责人：陈主任（姑息医学科主任）', phone: '联系电话：0571-8888-9012（安宁中心内线 8003）' },
    { id: 'VT-004', name: '队伍名称：疫情防控志愿服务队（常设）', dept: '所属部门：预防保健科', count: '人数：24 人（检验科技师 6 / 护士 12 / 社会志愿者 6）', leader: '负责人：赵医生（预防保健科主治医师）', phone: '联系电话：0571-8888-3456（预防保健科内线 8004）' },
    { id: 'VT-005', name: '队伍名称：健康宣讲志愿服务队', dept: '所属部门：宣传科 / 健康教育科', count: '人数：16 人（临床医师 8 / 护师 4 / 营养师 2 / 运动康复师 2）', leader: '负责人：周营养师（健康教育科主管技师）', phone: '联系电话：0571-8888-7890（健康教育科内线 8005）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/volunteer/activity - 志愿活动（活动名/时间/地点/服务时长Tag/参与人数）5 条 */
async function handleVolunteerActivity(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'VA-001', name: '活动名称：门诊导医志愿服务（每日常态化）', time: '举办时间：2026-10-20（今日 08:00-11:30）', place: '地点：门诊楼 1F 大厅 / 各楼层导医台', duration: '服务时长Tag：4-8h（人均 3.5h/日）', attendees: '参与人数：12 人（今日排班）' },
    { id: 'VA-002', name: '活动名称：病房陪伴志愿服务（住院患者心理疏导）', time: '举办时间：2026-10-19（昨日 14:00-16:00）', place: '地点：普外科 / 神经内科病房', duration: '服务时长Tag：≤4h（人均 2h/次）', attendees: '参与人数：6 人（昨日排班）' },
    { id: 'VA-003', name: '活动名称：世界精神卫生日健康宣讲（安宁疗护主题）', time: '举办时间：2026-10-10（上周六 09:00-11:30）', place: '地点：门诊楼 3F 健康讲堂', duration: '服务时长Tag：4-8h（人均 4h/次）', attendees: '参与人数：8 人 + 现场听众 64 人' },
    { id: 'VA-004', name: '活动名称：社区义诊志愿服务（进社区）', time: '举办时间：2026-10-18（上周日 08:30-12:00）', place: '地点：余杭区某社区服务中心', duration: '服务时长Tag：>8h（人均 6h/次，含往返）', attendees: '参与人数：14 人（含医师/护士/志愿者）' },
    { id: 'VA-005', name: '活动名称：安宁疗护志愿者培训（月度）', time: '举办时间：2026-10-15（本月 14:00-17:00）', place: '地点：安宁疗护中心示教室', duration: '服务时长Tag：≤4h（人均 3h/次）', attendees: '参与人数：12 人（安宁队新老队员）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/volunteer/stats - 志愿统计（月份/注册志愿者数/本月服务时长/人均时长/服务人次）5 条 */
async function handleVolunteerStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'VS-001', month: '月份：2026-10（本月累计，截至 10-20）', registered: '注册志愿者数：102 人（较上月 +6 人新注册）', hours: '本月服务时长：1,286 小时（导医 620 / 陪伴 180 / 宣讲 120 / 义诊 160 / 培训 96 / 其他 110）', perCapita: '人均时长：12.6h/人（本月）', served: '服务人次：3,860 人次（导医 2,400 / 陪伴 180 患者 / 宣讲 640 / 义诊 640）' },
    { id: 'VS-002', month: '月份：2026-09（上月完整数据）', registered: '注册志愿者数：96 人', hours: '本月服务时长：1,420 小时', perCapita: '人均时长：14.8h/人（上月）', served: '服务人次：4,120 人次' },
    { id: 'VS-003', month: '月份：2026-08', registered: '注册志愿者数：88 人', hours: '本月服务时长：1,180 小时', perCapita: '人均时长：13.4h/人', served: '服务人次：3,580 人次' },
    { id: 'VS-004', month: '月份：2026-Q3 汇总（7-9 月）', registered: '注册志愿者数：96 人（季末）', hours: '季度总时长：3,860 小时', perCapita: '人均时长：40.2h/人（季度累计）', served: '季度服务人次：11,460 人次' },
    { id: 'VS-005', month: '月份：2026-10 分队伍统计', registered: '导医队 32 / 陪伴队 18 / 安宁队 12 / 防疫队 24 / 宣讲队 16', hours: '导医队 620h / 陪伴队 180h / 安宁队 96h / 防疫队 220h / 宣讲队 170h', perCapita: '导医队人均 19.4h（最高）/ 防疫队人均 9.2h', served: '导医队 2,400 人次（占 62%，主力队伍）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m504Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/volunteer/team', handle: handleVolunteerTeam, auth: true },
  { method: 'GET', path: '/api/v1/volunteer/activity', handle: handleVolunteerActivity, auth: true },
  { method: 'GET', path: '/api/v1/volunteer/stats', handle: handleVolunteerStats, auth: true },
];
