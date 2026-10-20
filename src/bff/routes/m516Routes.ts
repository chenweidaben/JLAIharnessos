/**
 * 健澜科技 jlmedaios - M516 P0 合规重点（电子病历五级·单病种深度）：单病种质控深度 3 端点
 *
 * disease/process 单病种过程质控、disease/outcome 单病种结局指标、disease/complications 并发症监控。
 * 与 M474 /quality/disease 概览区分（走 disease/ 新前缀）；与 M515 /safety/*、M514 /infection/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/disease/process - 单病种过程质控（病种Tag/质控指标Tag/科室）5 条 */
async function handleDiseaseProcess(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DP-001', disease: '病种Tag：急性心梗蓝（STEMI）', indicator: '质控指标Tag：指标完成率≥90%绿（D2B ≤90min 完成率 92%，目标 ≥90%）', dept: '科室：心血管内科' },
    { id: 'DP-002', disease: '病种Tag：脑卒中橙（急性缺血性卒中）', indicator: '质控指标Tag：70-90%橙（DNT ≤60min 完成率 78%，目标 ≥80%，需提升）', dept: '科室：神经内科' },
    { id: 'DP-003', disease: '病种Tag：肺炎红（成人社区获得性肺炎）', indicator: '质控指标Tag：指标完成率≥90%绿（抗生素 4h 内给药率 95%）', dept: '科室：呼吸内科' },
    { id: 'DP-004', disease: '病种Tag：髋部骨折紫（老年髋部骨折）', indicator: '质控指标Tag：70-90%橙（48h 内手术率 82%，目标 ≥90%，需优化术前评估流程）', dept: '科室：骨科' },
    { id: 'DP-005', disease: '病种Tag：剖宫产绿（剖宫产）', indicator: '质控指标Tag：指标完成率≥90%绿（术前抗生素 30min 给药率 96%）', dept: '科室：妇产科' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/disease/outcome - 单病种结局指标（病种Tag/病死率Tag/再入院率/平均住院日）5 条 */
async function handleDiseaseOutcome(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DO-001', disease: '病种Tag：急性心梗蓝（STEMI）', mortality: '病死率Tag：<1%绿（住院病死率 0.8%，优于全国平均 2.5%）', readmit: '31 天再入院率：3.2%（目标 ≤5%）', los: '平均住院日：7.5 天（优于全国平均 9.2 天）' },
    { id: 'DO-002', disease: '病种Tag：脑卒中橙（急性缺血性卒中）', mortality: '病死率Tag：1-5%橙（住院病死率 3.5%，与全国平均持平）', readmit: '31 天再入院率：5.8%（目标 ≤6%）', los: '平均住院日：12.0 天（与全国平均持平）' },
    { id: 'DO-003', disease: '病种Tag：肺炎红（成人 CAP）', mortality: '病死率Tag：1-5%橙（住院病死率 2.8%，需关注重症患者）', readmit: '31 天再入院率：4.5%（目标 ≤5%）', los: '平均住院日：9.5 天（优于全国平均 11.0 天）' },
    { id: 'DO-004', disease: '病种Tag：髋部骨折紫（老年髋部骨折）', mortality: '病死率Tag：1-5%橙（住院病死率 3.2%，老年患者基础病多）', readmit: '31 天再入院率：6.5%（目标 ≤8%）', los: '平均住院日：14.5 天（与全国平均持平）' },
    { id: 'DO-005', disease: '病种Tag：剖宫产绿（剖宫产）', mortality: '病死率Tag：<1%绿（住院病死率 0.1%，极低）', readmit: '31 天再入院率：1.2%（目标 ≤2%）', los: '平均住院日：5.0 天（优于全国平均 6.5 天）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/disease/complications - 并发症监控（病种Tag/并发症类型Tag/发生率Tag）5 条 */
async function handleDiseaseComplications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DC-001', disease: '病种Tag：急性心梗蓝（STEMI）', complication: '并发症类型Tag：出血橙（PCI 术后穿刺部位出血）', rate: '发生率Tag：<2%绿（1.5%，优于全国平均 2.8%）' },
    { id: 'DC-002', disease: '病种Tag：脑卒中橙（急性缺血性卒中）', complication: '并发症类型Tag：感染红（卒中相关性肺炎）', rate: '发生率Tag：2-5%橙（3.8%，目标 ≤5%，需加强吞咽评估）' },
    { id: 'DC-003', disease: '病种Tag：髋部骨折紫（老年髋部骨折）', complication: '并发症类型Tag：血栓紫（下肢深静脉血栓）', rate: '发生率Tag：2-5%橙（2.5%，目标 ≤3%，需加强抗凝预防）' },
    { id: 'DC-004', disease: '病种Tag：剖宫产绿（剖宫产）', complication: '并发症类型Tag：伤口不愈蓝（腹部切口脂肪液化）', rate: '发生率Tag：<2%绿（1.2%，优于全国平均 2.0%）' },
    { id: 'DC-005', disease: '病种Tag：肺炎红（成人 CAP）', complication: '并发症类型Tag：感染红（耐药菌二重感染）', rate: '发生率Tag：2-5%橙（2.2%，需合理使用抗生素）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m516Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/disease/process', handle: handleDiseaseProcess, auth: true },
  { method: 'GET', path: '/api/v1/disease/outcome', handle: handleDiseaseOutcome, auth: true },
  { method: 'GET', path: '/api/v1/disease/complications', handle: handleDiseaseComplications, auth: true },
];
