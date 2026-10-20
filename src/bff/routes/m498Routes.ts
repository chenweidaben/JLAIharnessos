/**
 * 健澜科技 jlmedaios - M498 P0 合规：医疗技术临床应用管理 3 端点
 *
 * tech/catalog 医疗技术目录、tech/authority 医师手术授权、tech/quality 技术质量监测。
 * 与 M476 /surgery/*·/anesthesia/*、M495 /day-surgery/*、M497 /ethics/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/tech/catalog - 医疗技术目录（技术名/级别Tag/开展科室/风险等级Tag）5 条 */
async function handleTechCatalog(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TC-001', name: '技术名称：腹腔镜胆囊切除术（LC）', level: '级别Tag：二级备案（限制类医疗技术，院级备案）', dept: '开展科室：普外科（年开展 486 例）', risk: '风险等级Tag：中风险（并发症率 <1%）' },
    { id: 'TC-002', name: '技术名称：冠状动脉支架植入术（PCI）', level: '级别Tag：三级审批（限制类，需省级卫健行政部门审批）', dept: '开展科室：心血管内科（年开展 218 例）', risk: '风险等级Tag：高风险（术中死亡率 <0.5%）' },
    { id: 'TC-003', name: '技术名称：人工髋关节置换术', level: '级别Tag：二级备案（限制类）', dept: '开展科室：骨科（年开展 96 例）', risk: '风险等级Tag：中高风险（感染率 <1%）' },
    { id: 'TC-004', name: '技术名称：无痛胃肠镜检查', level: '级别Tag：一级准入（常规类，院级准入）', dept: '开展科室：消化内科（年开展 3,260 例）', risk: '风险等级Tag：低风险（并发症率 0.1%）' },
    { id: 'TC-005', name: '技术名称：肿瘤深部热疗（微波消融）', level: '级别Tag：三级审批（限制类，需省级审批）', dept: '开展科室：肿瘤科（年开展 68 例）', risk: '风险等级Tag：中风险（局部出血/感染）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tech/authority - 医师手术授权（医师/科室/授权级别Tag/授权日期/有效期至）5 条 */
async function handleTechAuthority(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TA-001', doctor: '医师姓名：王教授（心血管内科主任医师）', dept: '科室：心血管内科', level: '授权级别Tag：四级（可主刀 PCI / 永久起搏器植入等四级手术）', date: '授权日期：2024-01-15（医院技术委员会审批）', expiry: '有效期至：2027-01-14（3 年有效期）' },
    { id: 'TA-002', doctor: '医师姓名：李教授（普外科主任医师）', dept: '科室：普外科', level: '授权级别Tag：四级（可主刀腹腔镜胃癌根治/胰十二指肠切除）', date: '授权日期：2024-03-20', expiry: '有效期至：2027-03-19' },
    { id: 'TA-003', doctor: '医师姓名：陈主任（骨科副主任医师）', dept: '科室：骨科', level: '授权级别Tag：三级（可主刀髋/膝关节置换，四级手术需副高以上带教）', date: '授权日期：2025-06-10', expiry: '有效期至：2028-06-09' },
    { id: 'TA-004', doctor: '医师姓名：刘医生（消化内科主治医师）', dept: '科室：消化内科', level: '授权级别Tag：二级（可主刀胃肠镜下息肉切除/止血）', date: '授权日期：2025-09-01', expiry: '有效期至：2028-08-31' },
    { id: 'TA-005', doctor: '医师姓名：张教授（肿瘤科主任医师）', dept: '科室：肿瘤科', level: '授权级别Tag：四级（可主刀微波消融、射频消融等限制类技术）', date: '授权日期：2024-05-12', expiry: '有效期至：2027-05-11' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tech/quality - 技术质量监测（技术/例数/并发症率/成功率/质控评级Tag）5 条 */
async function handleTechQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TQ-001', name: '技术名称：腹腔镜胆囊切除术（LC）', cases: '开展例数：486 例（2026 年累计）', complication: '并发症率：0.8%（胆漏 2 例/出血 2 例）', success: '成功率：99.2%（术中无中转开腹）', grade: '质控评级Tag：优（连续 3 个季度达优）' },
    { id: 'TQ-002', name: '技术名称：冠状动脉支架植入术（PCI）', cases: '开展例数：218 例', complication: '并发症率：1.4%（冠脉穿孔 1 例/造影剂肾病 2 例）', success: '成功率：98.6%（支架成功释放）', grade: '质控评级Tag：良（并发症率略高于院均）' },
    { id: 'TQ-003', name: '技术名称：人工髋关节置换术', cases: '开展例数：96 例', complication: '并发症率：1.0%（切口感染 1 例/脱位 0 例）', success: '成功率：99.0%（假体位置良好）', grade: '质控评级Tag：优' },
    { id: 'TQ-004', name: '技术名称：无痛胃肠镜检查', cases: '开展例数：3,260 例', complication: '并发症率：0.1%（麻醉意外 1 例/出血 2 例）', success: '成功率：99.9%（检查完成率）', grade: '质控评级Tag：优' },
    { id: 'TQ-005', name: '技术名称：肿瘤深部热疗（微波消融）', cases: '开展例数：68 例', complication: '并发症率：2.9%（局部出血 1 例/感染 1 例）', success: '成功率：95.6%（肿瘤完全消融 65/68）', grade: '质控评级Tag：一般（并发症率偏高，需改进）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m498Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/tech/catalog', handle: handleTechCatalog, auth: true },
  { method: 'GET', path: '/api/v1/tech/authority', handle: handleTechAuthority, auth: true },
  { method: 'GET', path: '/api/v1/tech/quality', handle: handleTechQuality, auth: true },
];
