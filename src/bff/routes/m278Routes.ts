/**
 * 健澜科技 jlmedaios - M278 业务域扩展
 *
 * 医嘱列表/医嘱详情/药品列表/检验申请/检查申请/手术安排
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/order/list - 医嘱列表 8 条 */
async function handleOrderList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const orders = [
    { id: 'OL-001', orderNo: 'ORD-20261020-001', patient: '张***', item: '阿司匹林肠溶片 100mg qd po', doctor: '李***', status: '执行中' },
    { id: 'OL-002', orderNo: 'ORD-20261020-002', patient: '李***', item: '二甲双胍片 0.5g tid po', doctor: '赵***', status: '执行中' },
    { id: 'OL-003', orderNo: 'ORD-20261020-003', patient: '王***', item: '0.9% NaCl 100ml + 头孢呋辛 1.5g ivgtt q8h', doctor: '陈***', status: '已停止' },
    { id: 'OL-004', orderNo: 'ORD-20261020-004', patient: '赵***', item: '阿托伐他汀钙片 20mg qn po', doctor: '刘***', status: '执行中' },
    { id: 'OL-005', orderNo: 'ORD-20261020-005', patient: '陈***', item: '低分子肝素钠 4000IU ih q12h', doctor: '周***', status: '执行中' },
    { id: 'OL-006', orderNo: 'ORD-20261020-006', patient: '孙***', item: '奥美拉唑肠溶胶囊 20mg bid po', doctor: '吴***', status: '新开' },
    { id: 'OL-007', orderNo: 'ORD-20261020-007', patient: '周***', item: '心电监护 q4h', doctor: '郑***', status: '执行中' },
    { id: 'OL-008', orderNo: 'ORD-20261020-008', patient: '吴***', item: '低盐低脂饮食', doctor: '王***', status: '执行中' },
  ];
  return json(ok({ orders, totalCount: orders.length }));
}

/** GET /api/v1/order/detail - 医嘱详情 1 条 */
async function handleOrderDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const detail = {
    orderNo: 'ORD-20261020-001',
    patient: '张***',
    item: '阿司匹林肠溶片',
    dosage: '100mg',
    frequency: '每日一次（qd）',
    route: '口服（po）',
    doctor: '李***主任医师',
    startDate: '2026-10-20',
    endDate: '长期',
    status: '执行中',
    note: '饭后服用，注意观察有无出血倾向',
  };
  return json(ok(detail));
}

/** GET /api/v1/medication/list - 药品列表 8 条 */
async function handleMedicationList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const meds = [
    { id: 'MD-001', name: '阿司匹林肠溶片', spec: '100mg×30片', form: '肠溶片', price: '¥45.00', stock: 1200 },
    { id: 'MD-002', name: '二甲双胍片', spec: '0.5g×60片', form: '片剂', price: '¥32.00', stock: 800 },
    { id: 'MD-003', name: '阿托伐他汀钙片', spec: '20mg×14片', form: '片剂', price: '¥56.00', stock: 600 },
    { id: 'MD-004', name: '头孢呋辛酯片', spec: '0.25g×12片', form: '片剂', price: '¥28.00', stock: 900 },
    { id: 'MD-005', name: '0.9% 氯化钠注射液', spec: '100ml/袋', form: '注射液', price: '¥1.50', stock: 5000 },
    { id: 'MD-006', name: '低分子肝素钠注射液', spec: '4000IU/0.4ml', form: '注射液', price: '¥35.00', stock: 300 },
    { id: 'MD-007', name: '奥美拉唑肠溶胶囊', spec: '20mg×14粒', form: '胶囊', price: '¥22.00', stock: 700 },
    { id: 'MD-008', name: '布洛芬缓释胶囊', spec: '0.3g×20粒', form: '胶囊', price: '¥18.00', stock: 1000 },
  ];
  return json(ok({ medications: meds, totalCount: meds.length }));
}

/** GET /api/v1/lis/list - 检验申请列表 5 条 */
async function handleLisList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const requests = [
    { id: 'LL-001', applyNo: 'LIS-20261020-001', patient: '张***', item: '血常规（五分类）', doctor: '李***', status: '已完成' },
    { id: 'LL-002', applyNo: 'LIS-20261020-002', patient: '李***', item: '空腹血糖 + 糖化血红蛋白', doctor: '赵***', status: '已完成' },
    { id: 'LL-003', applyNo: 'LIS-20261020-003', patient: '王***', item: '肝功能（全套）', doctor: '陈***', status: '检验中' },
    { id: 'LL-004', applyNo: 'LIS-20261020-004', patient: '赵***', item: '肾功能 + 电解质', doctor: '刘***', status: '已完成' },
    { id: 'LL-005', applyNo: 'LIS-20261020-005', patient: '陈***', item: '凝血功能（四项）', doctor: '周***', status: '待采血' },
  ];
  return json(ok({ requests, totalCount: requests.length }));
}

/** GET /api/v1/pacs/list - 检查申请列表 5 条 */
async function handlePacsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const requests = [
    { id: 'PL-001', applyNo: 'PACS-20261020-001', patient: '张***', bodyPart: '胸部 CT（平扫）', doctor: '李***', status: '已完成' },
    { id: 'PL-002', applyNo: 'PACS-20261020-002', patient: '李***', bodyPart: '腹部 B 超', doctor: '赵***', status: '已完成' },
    { id: 'PL-003', applyNo: 'PACS-20261020-003', patient: '王***', bodyPart: '头颅 MRI', doctor: '陈***', status: '检查中' },
    { id: 'PL-004', applyNo: 'PACS-20261020-004', patient: '赵***', bodyPart: '腰椎 MRI', doctor: '刘***', status: '已完成' },
    { id: 'PL-005', applyNo: 'PACS-20261020-005', patient: '陈***', bodyPart: '心电图', doctor: '周***', status: '待检查' },
  ];
  return json(ok({ requests, totalCount: requests.length }));
}

/** GET /api/v1/surgery/list - 手术安排列表 5 条 */
async function handleSurgeryList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const surgeries = [
    { id: 'SL-001', name: '腹腔镜胆囊切除术', patient: '王***', dept: '普外科', time: '2026-10-21 08:30', doctor: '陈***' },
    { id: 'SL-002', name: '冠状动脉支架植入术', patient: '张***', dept: '心内科', time: '2026-10-21 10:00', doctor: '李***' },
    { id: 'SL-003', name: '人工髋关节置换术', patient: '赵***', dept: '骨科', time: '2026-10-21 14:00', doctor: '周***' },
    { id: 'SL-004', name: '甲状腺次全切除术', patient: '李***', dept: '普外科', time: '2026-10-22 09:00', doctor: '吴***' },
    { id: 'SL-005', name: '腹腔镜阑尾切除术', patient: '孙***', dept: '普外科', time: '2026-10-22 13:30', doctor: '郑***' },
  ];
  return json(ok({ surgeries, totalCount: surgeries.length }));
}

export const m278Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/order/list', handle: handleOrderList, auth: true },
  { method: 'GET', path: '/api/v1/order/detail', handle: handleOrderDetail, auth: true },
  { method: 'GET', path: '/api/v1/medication/list', handle: handleMedicationList, auth: true },
  { method: 'GET', path: '/api/v1/lis/list', handle: handleLisList, auth: true },
  { method: 'GET', path: '/api/v1/pacs/list', handle: handlePacsList, auth: true },
  { method: 'GET', path: '/api/v1/surgery/list', handle: handleSurgeryList, auth: true },
];
