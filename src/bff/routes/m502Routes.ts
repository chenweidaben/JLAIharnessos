/**
 * 健澜科技 jlmedaios - M502 P0 合规重点：处方点评管理 3 端点
 *
 * prescription/review 处方点评记录、prescription/feedback 点评反馈、prescription/stats 处方统计。
 * 与 M453/M484 /pharmacy/prescription-review、M493 /pharmacy/antibiotic-rate·/injection-rate、
 * M501 /privacy/*、M500 /waste/*、M499 /mdt/*、/outpatient/* 路由区分（走 prescription/ 新前缀）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/prescription/review - 处方点评记录（科室/医师/处方类型Tag/点评结果Tag）5 条 */
async function handlePrescriptionReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PR-001', dept: '科室：心血管内科（门诊处方）', doctor: '医师姓名：王教授（主任医师，工号 D001）', type: '处方类型Tag：普通处方（门诊，2026-10-18 开具）', result: '点评结果Tag：合理（用药适应症/遴选/用法用量均符合规范）' },
    { id: 'PR-002', dept: '科室：急诊科', doctor: '医师姓名：刘医生（主治医师，工号 D208）', type: '处方类型Tag：急诊处方（2026-10-19 开具）', result: '点评结果Tag：不合理（抗菌药物遴选不适宜，详见 feedback）' },
    { id: 'PR-003', dept: '科室：儿科', doctor: '医师姓名：陈主任（副主任医师，工号 D116）', type: '处方类型Tag：儿科处方（2026-10-17 开具）', result: '点评结果Tag：用药不适宜（用法用量不适宜，儿童剂量偏大）' },
    { id: 'PR-004', dept: '科室：麻醉科', doctor: '医师姓名：李教授（主任医师，工号 D021）', type: '处方类型Tag：麻醉处方（红色，2026-10-16 开具）', result: '点评结果Tag：合理（麻醉药品使用符合规范，双签字齐全）' },
    { id: 'PR-005', dept: '科室：内分泌科', doctor: '医师姓名：赵医生（主治医师，工号 D232）', type: '处方类型Tag：普通处方（2026-10-20 开具）', result: '点评结果Tag：不合理（联合用药不适宜，存在重复降糖）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/prescription/feedback - 点评反馈（问题类型Tag/整改要求）5 条 */
async function handlePrescriptionFeedback(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PF-001', problem: '问题类型Tag：适应症不适宜（刘医生急诊处方：上呼吸道感染无指征使用抗菌药物）', dept: '对应科室：急诊科', doctor: '被反馈医师：刘医生（工号 D208）', require: '整改要求：①立即停用该处方 ②补学《抗菌药物临床应用指导原则》 ③一周内提交整改报告 ④纳入月度绩效考核' },
    { id: 'PF-002', problem: '问题类型Tag：遴选药品不适宜（儿科处方：应选儿童适宜剂型，开具成人片剂）', dept: '对应科室：儿科', doctor: '被反馈医师：陈主任（工号 D116）', require: '整改要求：①更换为儿童混悬液剂型 ②儿科医师统一培训儿童用药剂型 ③下次点评复查' },
    { id: 'PF-003', problem: '问题类型Tag：用法用量不适宜（儿科处方：阿莫西林剂量超出儿童每日最大量）', dept: '对应科室：儿科', doctor: '被反馈医师：陈主任（工号 D116）', require: '整改要求：①立即调整剂量 ②补学儿童药物剂量计算方法 ③纳入科室用药培训重点' },
    { id: 'PF-004', problem: '问题类型Tag：联合用药不适宜（内分泌科处方：二甲双胍 + 格列本脲重复降糖，低血糖风险）', dept: '对应科室：内分泌科', doctor: '被反馈医师：赵医生（工号 D232）', require: '整改要求：①停用其中一种 ②调整为单药起始 ③糖尿病门诊处方专项点评 ④扣当月绩效 5%' },
    { id: 'PF-005', problem: '问题类型Tag：适应症不适宜（门诊处方：无指征使用质子泵抑制剂预防应激性溃疡）', dept: '对应科室：消化内科', doctor: '被反馈医师：周医生（工号 D245）', require: '整改要求：①停用 PPI ②学习 PPI 预防使用指征 ③ 1 个月内复查同类处方' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/prescription/stats - 处方统计（月份/处方总量/合理率/不合理率/重点监控占比）5 条 */
async function handlePrescriptionStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PS-001', month: '月份：2026-10（本月累计，截至 10-20）', total: '处方总量：18,620 张（门诊 16,820 / 急诊 1,480 / 儿科 320）', rational: '合理率：92.6%（17,240/18,620 张点评合理）', irrational: '不合理率：7.4%（1,380 张不合理，较上月 +0.6pct）', key: '重点监控药品处方占比：3.2%（596 张，限方管控内）' },
    { id: 'PS-002', month: '月份：2026-09（上月完整数据）', total: '处方总量：22,480 张', rational: '合理率：93.2%', irrational: '不合理率：6.8%', key: '重点监控药品处方占比：3.5%' },
    { id: 'PS-003', month: '月份：2026-08', total: '处方总量：21,860 张', rational: '合理率：92.8%', irrational: '不合理率：7.2%', key: '重点监控药品处方占比：3.8%（环比下降，管控见效）' },
    { id: 'PS-004', month: '月份：2026-07', total: '处方总量：20,980 张', rational: '合理率：91.5%', irrational: '不合理率：8.5%（暑期儿科处方高峰，不合理率偏高）', key: '重点监控药品处方占比：4.2%' },
    { id: 'PS-005', month: '月份：2026-Q3 汇总（7-9 月）', total: '处方总量：65,320 张', rational: '合理率：92.5%（季度平均）', irrational: '不合理率：7.5%', key: '重点监控药品处方占比：3.8%（季度累计，达标）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m502Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/prescription/review', handle: handlePrescriptionReview, auth: true },
  { method: 'GET', path: '/api/v1/prescription/feedback', handle: handlePrescriptionFeedback, auth: true },
  { method: 'GET', path: '/api/v1/prescription/stats', handle: handlePrescriptionStats, auth: true },
];
