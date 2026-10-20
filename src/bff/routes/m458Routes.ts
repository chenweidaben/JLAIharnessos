/**
 * 健澜科技 jlmedaios - M458 人事薪酬与培训档案（hr）
 *
 * 员工档案 / 科室排班 / 继教学分 / 职称晋升 / 薪酬核算
 * （attendance 考勤记录已存在，此处不重复）。
 * 本批为基础路径，与 M417 *-detail 详情版互不冲突。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/hr/staff-profile - 员工档案（工号/姓名/科室/岗位/入职日期）5 条 */
async function handleHrProfile(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPF-001', empNo: '工号：E1001', name: '姓名：王***（主任医师）', dept: '科室：心内科', position: '岗位：科主任 / 主任医师', onboard: '入职日期：2008-07-15' },
    { id: 'SPF-002', empNo: '工号：E1024', name: '姓名：刘***（主治医师）', dept: '科室：内分泌科', position: '岗位：主治医师（带组）', onboard: '入职日期：2015-09-01' },
    { id: 'SPF-003', empNo: '工号：E2031', name: '姓名：林***（主管护师）', dept: '科室：心内科病房', position: '岗位：护士长 / 主管护师', onboard: '入职日期：2011-03-10' },
    { id: 'SPF-004', empNo: '工号：E3056', name: '姓名：郑***（检验技师）', dept: '科室：检验科', position: '岗位：检验技师（组长）', onboard: '入职日期：2018-08-20' },
    { id: 'SPF-005', empNo: '工号：E4072', name: '姓名：黄***（行政专员）', dept: '科室：院办（行政管理）', position: '岗位：行政专员（文秘/会务）', onboard: '入职日期：2020-11-05' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/schedules - 科室排班（科室/班次/值班人/日期/轮换规则）5 条 */
async function handleHrSchedules(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SCH-001', dept: '科室：急诊科', shift: '班次：白班（08:00–20:00）', onCall: '值班人：张*** 住院医师 + 李*** 护士', date: '日期：2026-10-21（排班日）', rotate: '轮换规则：三班两倒，每 7 天轮换一次白/夜班' },
    { id: 'SCH-002', dept: '科室：心内科病房', shift: '班次：夜班（20:00–次日 08:00）', onCall: '值班人：赵*** 住院医师 + 林*** 护士', date: '日期：2026-10-21（夜班）', rotate: '轮换规则：科室内部轮值，月排表公示' },
    { id: 'SCH-003', dept: '科室：ICU', shift: '班次：三班倒（每班 8 小时）', onCall: '值班人：周*** 主治医师 + 2 名护理', date: '日期：2026-10-21（早班 06:00–14:00）', rotate: '轮换规则：早/中/夜班轮值，法定节假日双备班' },
    { id: 'SCH-004', dept: '科室：手术室', shift: '班次：日班（连台手术排程）', onCall: '值班人：孙*** 器械护士 + 巡回护士团队', date: '日期：2026-10-21（手术日）', rotate: '轮换规则：按手术日排班，备班随叫随到' },
    { id: 'SCH-005', dept: '科室：药房（门诊）', shift: '班次：行政班（08:00–17:30）', onCall: '值班人：黄*** 药师（窗口+审方）', date: '日期：2026-10-21（工作日）', rotate: '轮换规则：周末轮值 1 人，节假日按排班补休' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/training-credits - 继续医学教育学分（工号/年度/已修学分/要求学分/达标状态）5 条 */
async function handleHrTrainingCredits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TCR-001', empNo: '工号：E1001', year: '年度：2026', earned: '已修学分：24.5 分（I 类 8 + II 类 16.5）', required: '要求学分：年度≥25 分（执业周期内达标）', pass: '达标状态：未达标（差 0.5 分，需年底前补足）' },
    { id: 'TCR-002', empNo: '工号：E1024', year: '年度：2026', earned: '已修学分：28.0 分（I 类 10 + II 类 18）', required: '要求学分：年度≥25 分', pass: '达标状态：已达标（超额完成）' },
    { id: 'TCR-003', empNo: '工号：E2031', year: '年度：2026', earned: '已修学分：26.0 分（I 类 6 + II 类 20）', required: '要求学分：年度≥25 分', pass: '达标状态：已达标' },
    { id: 'TCR-004', empNo: '工号：E3056', year: '年度：2026', earned: '已修学分：18.0 分（I 类 4 + II 类 14）', required: '要求学分：年度≥25 分', pass: '达标状态：未达标（缺口 7 分，需补修）' },
    { id: 'TCR-005', empNo: '工号：E4072', year: '年度：2026', earned: '已修学分：25.5 分（I 类 5 + II 类 20.5）', required: '要求学分：年度≥25 分（行政岗同标准）', pass: '达标状态：已达标' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/promotion - 职称晋升（工号/现职称/申报职称/评审状态/年度）5 条 */
async function handleHrPromotion(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PRM-001', empNo: '工号：E1024', current: '现职称：主治医师（中级）', apply: '申报职称：副主任医师（副高）', status: '评审状态：材料已提交，进入院级评审', year: '年度：2026 申报年度' },
    { id: 'PRM-002', empNo: '工号：E2031', current: '现职称：主管护师（中级）', apply: '申报职称：副主任护师（副高）', status: '评审状态：公示通过，待省厅终审', year: '年度：2026 申报年度' },
    { id: 'PRM-003', empNo: '工号：E3056', current: '现职称：检验技师（初级）', apply: '申报职称：主管检验技师（中级）', status: '评审状态：材料审核中（论文/业绩待核）', year: '年度：2026 申报年度' },
    { id: 'PRM-004', empNo: '工号：E1001', current: '现职称：主任医师（正高）', apply: '申报职称：无（已达正高，转入人才梯队培养）', status: '评审状态：不参评（在岗带教）', year: '年度：2026' },
    { id: 'PRM-005', empNo: '工号：E4072', current: '现职称：行政专员（初级管理）', apply: '申报职称：行政管理中级（经济师方向）', status: '评审状态：准备申报材料（待业绩整理）', year: '年度：2026 申报年度' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/payroll - 薪酬核算（工号/月份/基本工资/绩效/应发状态）5 条 */
async function handleHrPayroll(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PAY-001', empNo: '工号：E1001', month: '月份：2026-09', base: '基本工资：人民币 12,800.00 元', perf: '绩效：人民币 9,600.00 元（科室绩效系数）', status: '应发状态：已核算（待发放，个税已预扣）' },
    { id: 'PAY-002', empNo: '工号：E1024', month: '月份：2026-09', base: '基本工资：人民币 9,200.00 元', perf: '绩效：人民币 6,800.00 元', status: '应发状态：已核算（待发放）' },
    { id: 'PAY-003', empNo: '工号：E2031', month: '月份：2026-09', base: '基本工资：人民币 8,600.00 元', perf: '绩效：人民币 5,400.00 元（护理绩效）', status: '应发状态：已核算（待发放）' },
    { id: 'PAY-004', empNo: '工号：E3056', month: '月份：2026-09', base: '基本工资：人民币 7,800.00 元', perf: '绩效：人民币 4,200.00 元', status: '应发状态：核算中（加班/考勤待核）' },
    { id: 'PAY-005', empNo: '工号：E4072', month: '月份：2026-09', base: '基本工资：人民币 6,500.00 元', perf: '绩效：人民币 2,800.00 元（行政绩效）', status: '应发状态：已核算（待发放）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m458Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/hr/staff-profile', handle: handleHrProfile, auth: true },
  { method: 'GET', path: '/api/v1/hr/schedules', handle: handleHrSchedules, auth: true },
  { method: 'GET', path: '/api/v1/hr/training-credits', handle: handleHrTrainingCredits, auth: true },
  { method: 'GET', path: '/api/v1/hr/promotion', handle: handleHrPromotion, auth: true },
  { method: 'GET', path: '/api/v1/hr/payroll', handle: handleHrPayroll, auth: true },
];
