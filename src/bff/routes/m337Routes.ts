/**
 * 健澜科技 jlmedaios - M337 检验检查 + 影像域
 *
 * 检验医嘱/检验结果 + 检查医嘱/检查结果/检查报告（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/lab/orders - 检验医嘱 5 条 */
async function handleLabOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LO-001', orderNo: 'ORD-LAB-2026-001', patient: '张***（男，65 岁，心内科住院患者）', testItem: '血常规 + 生化（肝肾功能、血糖、血脂）', doctor: '李***（心内科主治医师）', time: '2026-10-20 08:00:00' },
    { id: 'LO-002', orderNo: 'ORD-LAB-2026-002', patient: '王***（女，58 岁，普外科住院患者）', testItem: '血常规 + 凝血功能 + 感染四项（乙肝、丙肝、梅毒、HIV）', doctor: '王***（普外科副主任医师）', time: '2026-10-20 08:15:00' },
    { id: 'LO-003', orderNo: 'ORD-LAB-2026-003', patient: '刘***（男，72 岁，骨科住院患者）', testItem: '血常规 + 生化 + C 反应蛋白（CRP）+ 血沉（ESR）', doctor: '赵***（骨科主任医师）', time: '2026-10-20 08:30:00' },
    { id: 'LO-004', orderNo: 'ORD-LAB-2026-004', patient: '孙***（女，45 岁，普外科住院患者）', testItem: '血常规 + 甲状腺功能（TSH、FT3、FT4）', doctor: '周***（普外科副主任医师）', time: '2026-10-20 08:45:00' },
    { id: 'LO-005', orderNo: 'ORD-LAB-2026-005', patient: '吴***（男，60 岁，胸外科住院患者）', testItem: '血常规 + 血气分析 + 生化', doctor: '郑***（胸外科主任医师）', time: '2026-10-20 09:00:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/lab/results - 检验结果 5 条 */
async function handleLabResults(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LR-001', testNo: 'TEST-2026-001', item: '血常规（白细胞计数）', result: '6.5 × 10⁹/L', reference: '4.0-10.0 × 10⁹/L', time: '2026-10-20 09:30:00' },
    { id: 'LR-002', testNo: 'TEST-2026-002', item: '生化（空腹血糖）', result: '6.8 mmol/L（偏高）', reference: '3.9-6.1 mmol/L', time: '2026-10-20 09:30:00' },
    { id: 'LR-003', testNo: 'TEST-2026-003', item: '生化（总胆固醇）', result: '5.8 mmol/L（偏高）', reference: '<5.2 mmol/L', time: '2026-10-20 09:30:00' },
    { id: 'LR-004', testNo: 'TEST-2026-004', item: '凝血功能（凝血酶原时间 PT）', result: '12.5 秒（正常）', reference: '11-13.5 秒', time: '2026-10-20 09:45:00' },
    { id: 'LR-005', testNo: 'TEST-2026-005', item: '甲状腺功能（TSH）', result: '2.5 mIU/L（正常）', reference: '0.27-4.2 mIU/L', time: '2026-10-20 10:00:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/orders - 检查医嘱 5 条 */
async function handleRadiologyOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RO-001', orderNo: 'ORD-RAD-2026-001', patient: '张***（男，65 岁，心内科住院患者）', examBodyPart: '胸部 CT 平扫（评估肺部情况）', doctor: '李***（心内科主治医师）', time: '2026-10-20 09:00:00' },
    { id: 'RO-002', orderNo: 'ORD-RAD-2026-002', patient: '王***（女，58 岁，普外科住院患者）', examBodyPart: '腹部 B 超（肝胆胰脾）', doctor: '王***（普外科副主任医师）', time: '2026-10-20 09:15:00' },
    { id: 'RO-003', orderNo: 'ORD-RAD-2026-003', patient: '刘***（男，72 岁，骨科住院患者）', examBodyPart: '髋关节 X 线正侧位（评估骨折愈合）', doctor: '赵***（骨科主任医师）', time: '2026-10-20 09:30:00' },
    { id: 'RO-004', orderNo: 'ORD-RAD-2026-004', patient: '孙***（女，45 岁，普外科住院患者）', examBodyPart: '甲状腺 B 超（评估结节大小）', doctor: '周***（普外科副主任医师）', time: '2026-10-20 09:45:00' },
    { id: 'RO-005', orderNo: 'ORD-RAD-2026-005', patient: '吴***（男，60 岁，胸外科住院患者）', examBodyPart: '胸部 CT 增强（评估肺部病变）', doctor: '郑***（胸外科主任医师）', time: '2026-10-20 10:00:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/results - 检查结果 5 条 */
async function handleRadiologyResults(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RR-001', examNo: 'EXAM-2026-001', bodyPart: '胸部 CT 平扫', findings: '双肺纹理清晰，未见明显实变影；心脏大小形态正常；纵隔淋巴结无肿大', impression: '胸部 CT 平扫未见明显异常', doctor: '钱***（影像科主治医师）' },
    { id: 'RR-002', examNo: 'EXAM-2026-002', bodyPart: '腹部 B 超（肝胆胰脾）', findings: '肝脏大小形态正常，回声均匀；胆囊大小正常，壁不厚；胰腺、脾脏未见明显异常', impression: '腹部 B 超（肝胆胰脾）未见明显异常', doctor: '孙***（影像科主治医师）' },
    { id: 'RR-003', examNo: 'EXAM-2026-003', bodyPart: '髋关节 X 线正侧位', findings: '髋关节假体位置良好，假体周围未见明显透亮线（无松动迹象）；骨折线模糊（骨痂形成良好）', impression: '髋关节置换术后复查，假体位置良好，骨折愈合良好', doctor: '李***（影像科副主任医师）' },
    { id: 'RR-004', examNo: 'EXAM-2026-004', bodyPart: '甲状腺 B 超', findings: '甲状腺右叶可见一低回声结节，大小约 0.8×0.6cm，边界清，形态规则；TI-RADS 3 级', impression: '甲状腺右叶结节（TI-RADS 3 级，倾向良性，建议随访）', doctor: '周***（影像科主治医师）' },
    { id: 'RR-005', examNo: 'EXAM-2026-005', bodyPart: '胸部 CT 增强', findings: '右肺下叶可见一占位性病变，大小约 3.5×2.8cm，增强后呈不均匀强化；纵隔可见肿大淋巴结（短径约 1.5cm）', impression: '右肺下叶占位（考虑肺癌可能，建议进一步穿刺活检明确病理）', doctor: '郑***（影像科主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/reports - 检查报告 5 条 */
async function handleRadiologyReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RR-001', reportNo: 'REPORT-2026-001', patient: '张***（男，65 岁）', bodyPart: '胸部 CT 平扫', conclusion: '胸部 CT 平扫未见明显异常（建议定期体检复查）', doctor: '钱***（影像科主治医师）' },
    { id: 'RR-002', reportNo: 'REPORT-2026-002', patient: '王***（女，58 岁）', bodyPart: '腹部 B 超（肝胆胰脾）', conclusion: '腹部 B 超（肝胆胰脾）未见明显异常（建议每年体检复查）', doctor: '孙***（影像科主治医师）' },
    { id: 'RR-003', reportNo: 'REPORT-2026-003', patient: '刘***（男，72 岁）', bodyPart: '髋关节 X 线正侧位', conclusion: '髋关节置换术后复查，假体位置良好，骨折愈合良好（建议继续康复训练）', doctor: '李***（影像科副主任医师）' },
    { id: 'RR-004', reportNo: 'REPORT-2026-004', patient: '孙***（女，45 岁）', bodyPart: '甲状腺 B 超', conclusion: '甲状腺右叶结节（TI-RADS 3 级，倾向良性，建议 6 个月后复查甲状腺 B 超）', doctor: '周***（影像科主治医师）' },
    { id: 'RR-005', reportNo: 'REPORT-2026-005', patient: '吴***（男，60 岁）', bodyPart: '胸部 CT 增强', conclusion: '右肺下叶占位（考虑肺癌可能，建议尽快行穿刺活检明确病理，必要时胸外科会诊）', doctor: '郑***（影像科主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m337Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/lab/orders', handle: handleLabOrders, auth: true },
  { method: 'GET', path: '/api/v1/lab/results', handle: handleLabResults, auth: true },
  { method: 'GET', path: '/api/v1/radiology/orders', handle: handleRadiologyOrders, auth: true },
  { method: 'GET', path: '/api/v1/radiology/results', handle: handleRadiologyResults, auth: true },
  { method: 'GET', path: '/api/v1/radiology/reports', handle: handleRadiologyReports, auth: true },
];
