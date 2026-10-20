/**
 * 健澜科技 jlmedaios - M441 病案管理深度（archive）
 *
 * 病案编目/ICD编码/病案归档/病案借阅/病案质控/病案检索
 * 聚焦病案编目归档（区别于 emr/copies 病历复印口径）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/archive/cataloging - 病案编目（病案号/患者/出院诊断/编目员/编目时间）5 条 */
async function handleArcCataloging(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ACG-001', mrNo: '病案号：MRN-2026-001188（心内科出院）', patient: '患者：张***（男，65 岁）', dischargeDx: '出院诊断：冠状动脉粥样硬化性心脏病、不稳定型心绞痛、高血压 2 级', cataloger: '编目员：吴***（病案室，工记 ARC-011）', catalogTime: '编目时间：2026-10-19 14:20:18' },
    { id: 'ACG-002', mrNo: '病案号：MRN-2026-002340（内分泌科出院）', patient: '患者：李***（女，58 岁）', dischargeDx: '出院诊断：2 型糖尿病、高脂血症、脂肪肝', cataloger: '编目员：郑***（ARC-018）', catalogTime: '编目时间：2026-10-19 15:05:40' },
    { id: 'ACG-003', mrNo: '病案号：MRN-2026-004512（骨科出院）', patient: '患者：王***（男，72 岁）', dischargeDx: '出院诊断：左膝关节骨性关节炎、人工膝关节置换术后', cataloger: '编目员：吴***（ARC-011）', catalogTime: '编目时间：2026-10-20 09:12:33' },
    { id: 'ACG-004', mrNo: '病案号：MRN-2026-006671（普外科出院）', patient: '患者：陈***（男，45 岁）', dischargeDx: '出院诊断：阑尾炎（急性）、阑尾切除术后', cataloger: '编目员：待编目（病历已签收待处理）', catalogTime: '编目时间：待处理' },
    { id: 'ACG-005', mrNo: '病案号：MRN-2026-007820（妇产科出院）', patient: '患者：赵***（女，32 岁）', dischargeDx: '出院诊断：顺产足月分娩、产后恢复良好', cataloger: '编目员：郑***（ARC-018）', catalogTime: '编目时间：2026-10-20 10:40:55' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/archive/icd-codes - ICD编码（病案号/主诊断ICD-10/手术ICD-9-CM3/编码员/校验）5 条 */
async function handleArcIcdCodes(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AIC-001', mrNo: '病案号：MRN-2026-001188（冠心病）', mainDx: '主诊断 ICD-10：I25.101（冠状动脉粥样硬化性心脏病）', surgeryCode: '手术 ICD-9-CM3：36.06（冠状动脉支架置入，如涉及）', coder: '编码员：钱***（编码岗 COD-003）', verify: '校验：双人复核通过（主诊断与手术编码匹配）' },
    { id: 'AIC-002', mrNo: '病案号：MRN-2026-002340（2 型糖尿病）', mainDx: '主诊断 ICD-10：E11.900（2 型糖尿病伴无并发症）', surgeryCode: '手术 ICD-9-CM3：无（内科保守治疗，无手术）', coder: '编码员：钱***（COD-003）', verify: '校验：复核通过（并发症编码按病历补充）' },
    { id: 'AIC-003', mrNo: '病案号：MRN-2026-004512（膝关节置换）', mainDx: '主诊断 ICD-10：M17.101（单侧膝关节骨性关节炎）', surgeryCode: '手术 ICD-9-CM3：81.54（人工膝关节置换术）', coder: '编码员：孙***（COD-007）', verify: '校验：复核通过（手术部位与术式一致）' },
    { id: 'AIC-004', mrNo: '病案号：MRN-2026-006671（阑尾炎）', mainDx: '主诊断 ICD-10：K35.900（急性阑尾炎）', surgeryCode: '手术 ICD-9-CM3：47.09（阑尾切除术）', coder: '编码员：待编码（待编目后录入）', verify: '校验：待校验' },
    { id: 'AIC-005', mrNo: '病案号：MRN-2026-007820（顺产）', mainDx: '主诊断 ICD-10：O80.000（足月顺产单胎活产）', surgeryCode: '手术 ICD-9-CM3：无（自然分娩，无器械助产）', coder: '编码员：孙***（COD-007）', verify: '校验：复核通过（分娩结局编码完整）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/archive/filing - 病案归档（病案号/柜号/架号/归档人/时间/状态）5 条 */
async function handleArcFiling(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AFI-001', mrNo: '病案号：MRN-2026-001188（已归档）', cabinet: '柜号：A 区档案柜 12 号', shelf: '架号：第 3 层（按年度-月份排列）', filer: '归档人：吴***（ARC-011）', time: '时间：2026-10-19 16:00:10', status: '状态：已归档上架（可被检索调阅）' },
    { id: 'AFI-002', mrNo: '病案号：MRN-2026-002340（已归档）', cabinet: '柜号：A 区档案柜 12 号', shelf: '架号：第 3 层', filer: '归档人：郑***（ARC-018）', time: '时间：2026-10-19 16:20:45', status: '状态：已归档上架' },
    { id: 'AFI-003', mrNo: '病案号：MRN-2026-004512（待归档）', cabinet: '柜号：待分配（编目完成后归档）', shelf: '架号：待分配', filer: '归档人：待归档', time: '时间：待归档', status: '状态：待归档（编目/编码完成中）' },
    { id: 'AFI-004', mrNo: '病案号：MRN-2025-01102（历史病历，已入密集架）', cabinet: '柜号：B 区密集架 5 列', shelf: '架号：2025 年度层', filer: '归档人：吴***（ARC-011）', time: '时间：2025-12-30 11:00:00', status: '状态：已归档（满 1 年入密集架）' },
    { id: 'AFI-005', mrNo: '病案号：MRN-2026-007820（已归档）', cabinet: '柜号：A 区档案柜 13 号', shelf: '架号：第 1 层', filer: '归档人：郑***（ARC-018）', time: '时间：2026-10-20 11:25:30', status: '状态：已归档上架' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/archive/loans - 病案借阅（借阅号/病案号/借阅人/用途/归还状态）5 条 */
async function handleArcLoans(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ALN-001', loanNo: '借阅号：LOAN-20261020-01', mrNo: '病案号：MRN-2026-001188（冠心病）', borrower: '借阅人：心内科 王*** 主任医师（科内教学查房）', purpose: '用途：病例教学与临床讨论（院内借阅，限时 7 天）', returnStatus: '归还状态：借阅中（未归还，到期提醒已设）' },
    { id: 'ALN-002', loanNo: '借阅号：LOAN-20261019-02', mrNo: '病案号：MRN-2026-002340（糖尿病）', borrower: '借阅人：内分泌科 刘*** 主治医师（随访随访对照）', purpose: '用途：慢病随访对比（院内借阅）', returnStatus: '归还状态：已归还（2026-10-19 17:00 还回档案室）' },
    { id: 'ALN-003', loanNo: '借阅号：LOAN-20261018-03', mrNo: '病案号：MRN-2025-01102（历史病历）', borrower: '借阅人：医保办（DRG 病组对照核查）', purpose: '用途：医保结算与病案首页核查（跨科室借阅）', returnStatus: '归还状态：借阅中（已超期 2 天，已催还）' },
    { id: 'ALN-004', loanNo: '借阅号：LOAN-20261020-04', mrNo: '病案号：MRN-2026-004512（膝关节置换）', borrower: '借阅人：骨科 赵*** 主任医师（术后病例复盘）', purpose: '用途：手术病例复盘与质控（院内借阅）', returnStatus: '归还状态：借阅中' },
    { id: 'ALN-005', loanNo: '借阅号：LOAN-20261017-05（已归还）', mrNo: '病案号：MRN-2026-006671（阑尾炎）', borrower: '借阅人：普外科 孙*** 主治医师（病例书写复盘）', purpose: '用途：病历书写质量复盘（院内借阅）', returnStatus: '归还状态：已归还（2026-10-17 当日归还）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/archive/quality - 病案质控（病案号/缺陷项/甲级率/整改/质控员）5 条 */
async function handleArcQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AQL-001', mrNo: '病案号：MRN-2026-001188（冠心病）', defect: '缺陷项：首页主要诊断选择可优化、缺出院随访指导记录', gradeARate: '甲级率：本病案评定为乙级（存在可整改缺陷）', rectify: '整改：已退回主治医师补充随访记录，限期修改', qcOfficer: '质控员：质控科 李***（QC-005）' },
    { id: 'AQL-002', mrNo: '病案号：MRN-2026-002340（糖尿病）', defect: '缺陷项：无明显缺陷（病程记录完整、首页规范）', gradeARate: '甲级率：甲级病案（符合甲级标准）', rectify: '整改：无需整改，直接归档', qcOfficer: '质控员：质控科 李***（QC-005）' },
    { id: 'AQL-003', mrNo: '病案号：MRN-2026-004512（膝关节置换）', defect: '缺陷项：手术记录签名不全、术前讨论记录缺失', gradeARate: '甲级率：乙级病案（缺陷需补全）', rectify: '整改：退回骨科补全签名与术前讨论，重新提交质控', qcOfficer: '质控员：质控科 王***（QC-009）' },
    { id: 'AQL-004', mrNo: '病案号：MRN-2026-007820（顺产）', defect: '缺陷项：新生儿记录与产妇记录衔接说明可补充', gradeARate: '甲级率：甲级病案（基本无缺陷）', rectify: '整改：无需整改，归档', qcOfficer: '质控员：质控科 王***（QC-009）' },
    { id: 'AQL-005', mrNo: '病案号：MRN-2026-006671（阑尾炎，待质控）', defect: '缺陷项：待质控（编目完成后进入质控流程）', gradeARate: '甲级率：待评定', rectify: '整改：待质控完成后定级', qcOfficer: '质控员：待分配' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/archive/retrievals - 病案检索（病案号/患者/住院号/调出状态/经办人）5 条 */
async function handleArcRetrievals(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ART-001', mrNo: '病案号：MRN-2026-001188', patient: '患者：张***（男，65 岁）', inpatientNo: '住院号：INP-2026-3301', pullStatus: '调出状态：已调出（供心内科教学借阅）', handler: '经办人：病案室 吴***（ARC-011）' },
    { id: 'ART-002', mrNo: '病案号：MRN-2026-002340', patient: '患者：李***（女，58 岁）', inpatientNo: '住院号：INP-2026-3388', pullStatus: '调出状态：在架（未调出，可检索定位）', handler: '经办人：系统检索（柜 A-12-3 定位）' },
    { id: 'ART-003', mrNo: '病案号：MRN-2025-01102', patient: '患者：钱***（男，68 岁，2025 年出院）', inpatientNo: '住院号：INP-2025-9021', pullStatus: '调出状态：已调出（供医保办核查）', handler: '经办人：病案室 郑***（ARC-018）' },
    { id: 'ART-004', mrNo: '病案号：MRN-2026-004512', patient: '患者：王***（男，72 岁）', inpatientNo: '住院号：INP-2026-3456', pullStatus: '调出状态：已调出（供骨科病例复盘）', handler: '经办人：病案室 吴***（ARC-011）' },
    { id: 'ART-005', mrNo: '病案号：MRN-2026-007820', patient: '患者：赵***（女，32 岁）', inpatientNo: '住院号：INP-2026-3502', pullStatus: '调出状态：在架（已归档未调出）', handler: '经办人：系统检索（柜 A-13-1 定位）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m441Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/archive/cataloging', handle: handleArcCataloging, auth: true },
  { method: 'GET', path: '/api/v1/archive/icd-codes', handle: handleArcIcdCodes, auth: true },
  { method: 'GET', path: '/api/v1/archive/filing', handle: handleArcFiling, auth: true },
  { method: 'GET', path: '/api/v1/archive/loans', handle: handleArcLoans, auth: true },
  { method: 'GET', path: '/api/v1/archive/quality', handle: handleArcQuality, auth: true },
  { method: 'GET', path: '/api/v1/archive/retrievals', handle: handleArcRetrievals, auth: true },
];
