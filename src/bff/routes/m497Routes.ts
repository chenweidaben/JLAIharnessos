/**
 * 健澜科技 jlmedaios - M497 P0 合规：医德医风考评 3 端点
 *
 * ethics/evaluation 医德考评、ethics/complaints 投诉核查（院内医德口径）、
 * ethics/rewards 表彰奖励。
 * 与 M471 /patient/complaints（投诉明细）、M485b /patient/complaint-summary（投诉汇总）区分；
 * 与 M479 /patient-safety/*、M496 /health-edu/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/ethics/evaluation - 医德考评（科室/医师/考评得分/等次/年度）5 条 */
async function handleEthicsEvaluation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EE-001', dept: '科室：心血管内科', doctor: '医师：王教授（主任医师，从医 22 年）', score: '考评得分：96.5 分（满分 100）', grade: '等次：优秀（年度 2025）', year: '年度：2025 年度考评（全院 862 名医师参评）' },
    { id: 'EE-002', dept: '科室：普外科', doctor: '医师：李教授（主任医师，从医 18 年）', score: '考评得分：92.8 分', grade: '等次：良好', year: '年度：2025 年度考评' },
    { id: 'EE-003', dept: '科室：妇产科', doctor: '医师：陈主任（副主任医师，从医 12 年）', score: '考评得分：88.4 分', grade: '等次：一般（需改进医患沟通）', year: '年度：2025 年度考评' },
    { id: 'EE-004', dept: '科室：急诊科', doctor: '医师：刘医生（主治医师，从医 6 年）', score: '考评得分：90.2 分', grade: '等次：良好', year: '年度：2025 年度考评' },
    { id: 'EE-005', dept: '科室：神经内科', doctor: '医师：张教授（主任医师，从医 25 年）', score: '考评得分：98.6 分', grade: '等次：优秀（连续 3 年优秀）', year: '年度：2025 年度考评' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/ethics/complaints - 投诉核查（投诉摘要/被投诉人/日期/核查结论/处理结果）5 条 */
async function handleEthicsComplaints(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ECP-001', content: '投诉摘要：患者反映门诊医师态度生硬、解释不充分（2026-09-12）', respondent: '被投诉人：某门诊内科张医生（主治医师）', date: '投诉日期：2026-09-12（患者现场投诉）', conclusion: '核查结论：属实（监控录像 + 同事旁证）', result: '处理结果：科室内部批评教育 + 扣当月绩效 5% + 向患者当面致歉' },
    { id: 'ECP-002', content: '投诉摘要：家属认为护士输液操作不熟练、让患者多扎了一针', respondent: '被投诉人：某外科病房李护士', date: '投诉日期：2026-09-18', conclusion: '核查结论：部分属实（血管条件差 + 操作不熟练叠加）', result: '处理结果：护理部通报 + 限期 1 个月强化操作训练 + 跟踪复评' },
    { id: 'ECP-003', content: '投诉摘要：患者反映收费明细不透明、存在重复收费嫌疑', respondent: '被投诉人：收费处王收银员（岗位）', date: '投诉日期：2026-09-22', conclusion: '核查结论：不属实（明细核对一致，为患者误解）', result: '处理结果：向患者出具明细清单 + 解释收费政策 + 归档' },
    { id: 'ECP-004', content: '投诉摘要：家属反映医师未及时告知病情、沟通不到位', respondent: '被投诉人：某肿瘤科刘主治', date: '投诉日期：2026-10-02', conclusion: '核查结论：属实（病情告知谈话签字不完整）', result: '处理结果：医务处约谈 + 补签谈话记录 + 纳入个人医德档案' },
    { id: 'ECP-005', content: '投诉摘要：患者反映药房发药时未交代用法用量', respondent: '被投诉人：门诊药房赵药师', date: '投诉日期：2026-10-08', conclusion: '核查结论：部分属实（口头交代但未书面记录）', result: '处理结果：药房内部整改 + 推行用药指导单书面签收制度' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/ethics/rewards - 表彰奖励（奖励名/获奖人/颁奖级别/颁奖时间）5 条 */
async function handleEthicsRewards(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ER-001', name: '奖励名称：浙江省"优秀医师奖"（省医师协会颁发）', winner: '获奖人：王教授（心血管内科主任）', level: '颁奖级别：省级（浙江省卫健委/省医师协会）', time: '颁奖时间：2026-08-19（中国医师节表彰）' },
    { id: 'ER-002', name: '奖励名称：杭州市"最美护士"（市卫健委评选）', winner: '获奖人：赵护士长（内分泌科）', level: '颁奖级别：市级（杭州市卫健委）', time: '颁奖时间：2026-05-12（国际护士节表彰）' },
    { id: 'ER-003', name: '奖励名称：医院"年度优秀科主任"（院级评选）', winner: '获奖人：李教授（普外科主任）', level: '颁奖级别：院级（健澜科技医院党委）', time: '颁奖时间：2026-01-15（年度总结表彰大会）' },
    { id: 'ER-004', name: '奖励名称：余杭区"志愿服务先进个人"（区卫健局）', winner: '获奖人：刘医生（急诊科主治医师）', level: '颁奖级别：区级（余杭区卫健局）', time: '颁奖时间：2026-03-05（学雷锋日表彰）' },
    { id: 'ER-005', name: '奖励名称：医院"医德医风标兵"（连续 3 年考评优秀）', winner: '获奖人：张教授（神经内科主任）', level: '颁奖级别：院级（健澜科技医院党委）', time: '颁奖时间：2026-01-15（与年度优秀科主任同期表彰）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m497Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/ethics/evaluation', handle: handleEthicsEvaluation, auth: true },
  { method: 'GET', path: '/api/v1/ethics/complaints', handle: handleEthicsComplaints, auth: true },
  { method: 'GET', path: '/api/v1/ethics/rewards', handle: handleEthicsRewards, auth: true },
];
