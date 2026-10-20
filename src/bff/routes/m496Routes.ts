/**
 * 健澜科技 jlmedaios - M496 P0 合规：患者健康教育看板后端（补 2 端点缺口）
 *
 * 对接前端 web/src/services/api/healthEduBoard.ts：
 *   /health-edu/materials 已 200（已有确认不重建）；
 *   本批补建 /health-edu/activities（本月健康讲座）、/health-edu/coverage（宣教覆盖率）。
 * 避开 M476 /surgery/*、M494 /quality/*、M495 /day-surgery/*、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/health-edu/activities - 本月健康讲座（主题/主办科室/主讲人/参与人数/举办时间）5 条 */
async function handleHealthEduActivities(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HEA-001', topic: '讲座主题：世界心脏病日健康讲座（"知晓你的血压"）', dept: '主办科室：心血管内科', lecturer: '主讲人：王教授（主任医师）', attendees: '参与人数：86 人（住院患者 42 人/家属 38 人/门诊 6 人）', time: '举办时间：2026-09-29 14:00（门诊楼 3F 宣教室）' },
    { id: 'HEA-002', topic: '讲座主题：糖尿病自我管理小组（饮食与运动）', dept: '主办科室：内分泌科', lecturer: '主讲人：赵护士长（糖尿病教育护士）', attendees: '参与人数：32 人（小组工作坊形式）', time: '举办时间：2026-10-08 10:00（内分泌科宣教室）' },
    { id: 'HEA-003', topic: '讲座主题：孕产妇课堂（孕期营养与分娩准备）', dept: '主办科室：妇产科', lecturer: '主讲人：李主任医师（产科主任）', attendees: '参与人数：48 人（孕妇及家属）', time: '举办时间：2026-10-12 15:00（孕妇学校）' },
    { id: 'HEA-004', topic: '讲座主题：脑卒中康复训练（家庭照护实操）', dept: '主办科室：神经内科/康复医学科', lecturer: '主讲人：张教授（康复医学科主任）', attendees: '参与人数：42 人（脑梗患者及家属）', time: '举办时间：2026-10-15 14:30（康复科示教室）' },
    { id: 'HEA-005', topic: '讲座主题：肺癌防治科普（早筛早治）', dept: '主办科室：呼吸与危重症医学科/胸外科', lecturer: '主讲人：刘教授（呼吸科主任）', attendees: '参与人数：64 人（高危人群体检客户）', time: '举办时间：2026-10-18 09:30（门诊大厅健康讲堂）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/health-edu/coverage - 宣教覆盖率（科室/住院/门诊宣教率/满意度/同比）5 条 */
async function handleHealthEduCoverage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HEC-001', dept: '科室：心血管内科（在架患者 86 人）', inpatient: '住院患者宣教率：96.5%（83/86 人完成入院+用药+出院三次宣教）', outpatient: '门诊患者宣教率：88.2%（门诊 486/551 人）', satisfaction: '宣教满意度：94.2%（出院患者问卷）', yoy: '同比：+1.6pct（去年 92.6%）' },
    { id: 'HEC-002', dept: '科室：普外科（在架患者 72 人）', inpatient: '住院患者宣教率：92.8%（67/72 人）', outpatient: '门诊患者宣教率：78.5%（门诊 268/341 人）', satisfaction: '宣教满意度：91.6%', yoy: '同比：+0.8pct' },
    { id: 'HEC-003', dept: '科室：神经内科（在架患者 68 人）', inpatient: '住院患者宣教率：88.4%（60/68 人）', outpatient: '门诊患者宣教率：72.1%（门诊 196/272 人）', satisfaction: '宣教满意度：89.5%', yoy: '同比：-0.4pct（需加强门诊宣教）' },
    { id: 'HEC-004', dept: '科室：妇产科（在架患者 56 人）', inpatient: '住院患者宣教率：98.2%（55/56 人）', outpatient: '门诊患者宣教率：92.4%（孕妇学校覆盖）', satisfaction: '宣教满意度：96.8%', yoy: '同比：+2.2pct' },
    { id: 'HEC-005', dept: '科室：内分泌科（在架患者 64 人）', inpatient: '住院患者宣教率：94.6%（61/64 人）', outpatient: '门诊患者宣教率：85.2%（糖尿病健康教育门诊）', satisfaction: '宣教满意度：93.4%', yoy: '同比：+1.2pct' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m496Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/health-edu/activities', handle: handleHealthEduActivities, auth: true },
  { method: 'GET', path: '/api/v1/health-edu/coverage', handle: handleHealthEduCoverage, auth: true },
];
