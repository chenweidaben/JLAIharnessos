/**
 * 健澜科技 jlmedaios - M260 业务域继续扩展
 *
 * 医嘱套餐/CDS套餐审查/LIS检验/PACS影像/药房处方/输血记录
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、医嘱套餐 ==================== */

/** GET /api/v1/order/sets - 医嘱套餐 5 条 */
async function handleOrderSets(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const sets = [
    { id: 'OS-001', name: '心内科常规入院套餐', itemCount: 12, applicableDept: '心内科', price: '¥1,280.00', status: '启用' },
    { id: 'OS-002', name: '糖尿病初筛套餐', itemCount: 8, applicableDept: '内分泌科', price: '¥680.00', status: '启用' },
    { id: 'OS-003', name: '骨科术前检查套餐', itemCount: 15, applicableDept: '骨科', price: '¥1,850.00', status: '启用' },
    { id: 'OS-004', name: '急诊抢救套餐', itemCount: 20, applicableDept: '急诊医学科', price: '¥2,500.00', status: '启用' },
    { id: 'OS-005', name: '老年综合评估套餐', itemCount: 18, applicableDept: '老年医学科', price: '¥2,200.00', status: '停用' },
  ];

  return json(ok({ sets, totalCount: sets.length }));
}

/** GET /api/v1/cds/order-set - CDS 医嘱套餐审查 5 条 */
async function handleCdsOrderSet(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reviews = [
    { id: 'COS-001', order: '心内科常规入院套餐（OS-001）', matchedSet: '心内科常规入院套餐', advice: '套餐完整，建议附加肌钙蛋白', riskWarning: '注意患者肾功能（造影剂风险）', status: '已通过' },
    { id: 'COS-002', order: '糖尿病初筛套餐（OS-002）', matchedSet: '糖尿病初筛套餐', advice: '建议加查 HbA1c', riskWarning: '空腹血糖需空腹 8h 以上', status: '需修改' },
    { id: 'COS-003', order: '骨科术前检查套餐（OS-003）', matchedSet: '骨科术前检查套餐', advice: '套餐完整', riskWarning: '凝血功能异常需停用抗凝药', status: '已通过' },
    { id: 'COS-004', order: '急诊抢救套餐（OS-004）', matchedSet: '急诊抢救套餐', advice: '建议附加血气分析', riskWarning: '开通绿色通道', status: '需修改' },
    { id: 'COS-005', order: '老年综合评估套餐（OS-005）', matchedSet: '老年综合评估套餐', advice: '套餐已停用，建议替换为 OS-001', riskWarning: '停用套餐勿使用', status: '已拦截' },
  ];

  return json(ok({ reviews, totalCount: reviews.length }));
}

/* ==================== 二、LIS/PACS ==================== */

/** GET /api/v1/lis/results - 检验报告 5 条 */
async function handleLisResults(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const results = [
    { id: 'LR-001', patient: '张***', testItem: '血常规（五分类）', result: 'WBC 6.5×10⁹/L，Hb 135g/L，PLT 220×10⁹/L', refRange: 'WBC 4-10，Hb 120-160，PLT 100-300', doctor: '检验科 陈医生' },
    { id: 'LR-002', patient: '李***', testItem: '空腹血糖', result: '7.2 mmol/L ↑', refRange: '3.9-6.1 mmol/L', doctor: '检验科 王医生' },
    { id: 'LR-003', patient: '王***', testItem: '肝功能（全套）', result: 'ALT 45 U/L ↑，AST 38 U/L，TBIL 15 μmol/L', refRange: 'ALT 0-40，AST 0-40，TBIL 3.4-20.5', doctor: '检验科 陈医生' },
    { id: 'LR-004', patient: '赵***', testItem: '肾功能（全套）', result: 'Cr 95 μmol/L，BUN 5.2 mmol/L，eGFR 85', refRange: 'Cr 44-133，BUN 2.9-8.2，eGFR >90', doctor: '检验科 李医生' },
    { id: 'LR-005', patient: '陈***', testItem: '血脂四项', result: 'TC 5.8 mmol/L ↑，LDL 3.6 mmol/L ↑，TG 1.8 mmol/L，HDL 1.2 mmol/L', refRange: 'TC <5.2，LDL <3.4，TG <1.7，HDL >1.0', doctor: '检验科 王医生' },
  ];

  return json(ok({ results, totalCount: results.length }));
}

/** GET /api/v1/pacs/reports - 影像报告 5 条 */
async function handlePacsReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reports = [
    { id: 'PR-001', patient: '张***', bodyPart: '胸部 CT（平扫）', diagnosis: '双肺未见明显异常，心影不大', doctor: '放射科 刘主任', time: '2026-10-20 09:30' },
    { id: 'PR-002', patient: '李***', bodyPart: '腹部 B 超', diagnosis: '脂肪肝（轻度），胆囊未见异常', doctor: '超声科 陈医生', time: '2026-10-20 10:00' },
    { id: 'PR-003', patient: '王***', bodyPart: '头颅 MRI', diagnosis: '脑内未见明显占位性病变，轻度脑白质脱髓鞘', doctor: '放射科 刘主任', time: '2026-10-19 15:00' },
    { id: 'PR-004', patient: '赵***', bodyPart: '腰椎 MRI', diagnosis: 'L4/5 椎间盘轻度膨出，硬膜囊受压不明显', doctor: '放射科 周医生', time: '2026-10-20 10:25' },
    { id: 'PR-005', patient: '陈***', bodyPart: '心电图', diagnosis: '窦性心律，正常心电图', doctor: '功能科 吴医生', time: '2026-10-20 08:50' },
  ];

  return json(ok({ reports, totalCount: reports.length }));
}

/* ==================== 三、药房/输血 ==================== */

/** GET /api/v1/pharmacy/prescriptions - 药房处方 5 条 */
async function handlePharmacyPrescriptions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const prescriptions = [
    { id: 'PP-001', rxNo: 'RX-20261020-001', patient: '张***', meds: '阿司匹林肠溶片 100mg×30 片', amount: '¥45.00', status: '已发药' },
    { id: 'PP-002', rxNo: 'RX-20261020-002', patient: '李***', meds: '二甲双胍片 0.5g×60 片', amount: '¥32.00', status: '已审核' },
    { id: 'PP-003', rxNo: 'RX-20261020-003', patient: '王***', meds: '阿托伐他汀钙片 20mg×14 片', amount: '¥56.00', status: '已发药' },
    { id: 'PP-004', rxNo: 'RX-20261020-004', patient: '赵***', meds: '头孢呋辛酯片 0.25g×12 片', amount: '¥28.00', status: '已退药' },
    { id: 'PP-005', rxNo: 'RX-20261020-005', patient: '陈***', meds: '布洛芬缓释胶囊 0.3g×20 粒', amount: '¥18.00', status: '已发药' },
  ];

  return json(ok({ prescriptions, totalCount: prescriptions.length }));
}

/** GET /api/v1/transfusion/records - 输血记录 5 条 */
async function handleTransfusionRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'TR-001', patient: '王***', bloodType: 'A 型 Rh 阳性', amount: '悬浮红细胞 2U', reaction: '无输血反应', status: '已输血' },
    { id: 'TR-002', patient: '李***', bloodType: 'O 型 Rh 阳性', amount: '血浆 400ml', reaction: '轻度发热（已处理）', status: '观察中' },
    { id: 'TR-003', patient: '张***', bloodType: 'B 型 Rh 阳性', amount: '血小板 1治疗量', reaction: '无输血反应', status: '已结束' },
    { id: 'TR-004', patient: '赵***', bloodType: 'AB 型 Rh 阴性', amount: '悬浮红细胞 4U', reaction: '无输血反应', status: '已输血' },
    { id: 'TR-005', patient: '陈***', bloodType: 'A 型 Rh 阳性', amount: '全血 200ml', reaction: '无输血反应', status: '已结束' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

export const m260Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/order/sets', handle: handleOrderSets, auth: true },
  { method: 'GET', path: '/api/v1/cds/order-set', handle: handleCdsOrderSet, auth: true },
  { method: 'GET', path: '/api/v1/lis/results', handle: handleLisResults, auth: true },
  { method: 'GET', path: '/api/v1/pacs/reports', handle: handlePacsReports, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/prescriptions', handle: handlePharmacyPrescriptions, auth: true },
  { method: 'GET', path: '/api/v1/transfusion/records', handle: handleTransfusionRecords, auth: true },
];
