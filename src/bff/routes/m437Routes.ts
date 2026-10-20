/**
 * 健澜科技 jlmedaios - M437 检验 LIS 深度（lab）
 *
 * 室内质控/报告审核
 * （specimens 标本流转、items-detail 检验项目、results-detail 检验结果、critical-values 危急值已存在，此处不重复）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/lab/quality-control - 室内质控（项目/质控品/靶值/偏差/质控状态）5 条 */
async function handleLabQualityControl(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LQC-001', item: '项目：谷丙转氨酶 ALT（生化分析仪）', qcMaterial: '质控品：Level-1 水平定值质控（批号 Q2026-09-L1）', target: '靶值：32.0 U/L', deviation: '偏差：+1.2%（标准差 0.6SD，在控）', qcStatus: '质控状态：在控（Westgard 规则通过，可发布结果）' },
    { id: 'LQC-002', item: '项目：血红蛋白 HGB（血细胞分析仪）', qcMaterial: '质控品：Level-2 正常水平（批号 Q2026-09-N2）', target: '靶值：150 g/L', deviation: '偏差：-0.8%（0.4SD，在控）', qcStatus: '质控状态：在控' },
    { id: 'LQC-003', item: '项目：血糖 GLU（生化分析仪）', qcMaterial: '质控品：Level-2 病理水平（批号 Q2026-09-P2）', target: '靶值：9.2 mmol/L', deviation: '偏差：+4.6%（2.3SD，1-3s 失控）', qcStatus: '质控状态：失控（已暂停该项目发报，待校准/复检）' },
    { id: 'LQC-004', item: '项目：白细胞计数 WBC（血细胞分析仪）', qcMaterial: '质控品：Level-1 低值（批号 Q2026-09-L1）', target: '靶值：5.8 x10^9/L', deviation: '偏差：+0.5%（0.3SD，在控）', qcStatus: '质控状态：在控' },
    { id: 'LQC-005', item: '项目：尿蛋白 PRO（尿液分析仪）', qcMaterial: '质控品：阴/阳性双水平（批号 Q2026-09-U）', target: '靶值：阴性 / 0.3g/L 阳性', deviation: '偏差：阴性符合，阳性符合（定性一致）', qcStatus: '质控状态：在控' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/lab/report-review - 报告审核（报告号/检验师/审核人/审核时间/状态）5 条 */
async function handleLabReportReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LRR-001', reportNo: '报告号：RPT-LAB-20261020-0118（血常规）', technician: '检验师：吴***（初级检验技师，工号 LAB-011）', reviewer: '审核人：郑***（主管检验师，工号 LAB-003）', reviewTime: '审核时间：2026-10-20 09:42:18', status: '状态：已审核发布（结果可推送临床与患者端）' },
    { id: 'LRR-002', reportNo: '报告号：RPT-LAB-20261020-0119（生化全套）', technician: '检验师：钱***（检验技师，工号 LAB-015）', reviewer: '审核人：郑***（主管检验师，工号 LAB-003）', reviewTime: '审核时间：2026-10-20 10:08:55', status: '状态：已审核发布' },
    { id: 'LRR-003', reportNo: '报告号：RPT-LAB-20261020-0120（尿常规+便常规）', technician: '检验师：孙***（初级检验技师，工号 LAB-020）', reviewer: '审核人：待上级审核（报告待签发）', reviewTime: '审核时间：待审核', status: '状态：待审核（结果已录入，等待复核）' },
    { id: 'LRR-004', reportNo: '报告号：RPT-LAB-20261020-0117（凝血四项）', technician: '检验师：吴***（初级检验技师，工号 LAB-011）', reviewer: '审核人：李***（主任检验师，工号 LAB-001）', reviewTime: '审核时间：2026-10-20 09:20:40', status: '状态：已审核发布（PT/INR 异常已备注提示）' },
    { id: 'LRR-005', reportNo: '报告号：RPT-LAB-20261019-0099（血气分析）', technician: '检验师：钱***（检验技师，工号 LAB-015）', reviewer: '审核人：郑***（主管检验师，工号 LAB-003）', reviewTime: '审核时间：2026-10-19 22:15:30', status: '状态：已审核发布（急诊夜班加急签发）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m437Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/lab/quality-control', handle: handleLabQualityControl, auth: true },
  { method: 'GET', path: '/api/v1/lab/report-review', handle: handleLabReportReview, auth: true },
];
