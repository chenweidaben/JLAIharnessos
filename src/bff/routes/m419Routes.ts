/**
 * 健澜科技 jlmedaios - M419 P1 业务扩展：药品物资深度打磨（详情版）
 *
 * 药品目录详情/库存管理详情/采购管理详情/供应商管理详情/预警管理详情/效期管理详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/pharmacy/drugs-detail - 药品目录详情 5 条 */
async function handlePharmacyDrugsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PDD-001', drugName: 'Drug-001：阿托伐他汀钙片（立普妥）', spec: '规格：20mg×7 片/盒', dosageForm: '剂型：片剂（口服）', price: '价格：35.00 元/盒（集采中标价，原零售价 65.00 元/盒）', status: '状态：在用（国家基药，医保甲类，心血管疾病一线用药）' },
    { id: 'PDD-002', drugName: 'Drug-002：注射用头孢曲松钠（罗氏芬）', spec: '规格：1.0g/支', dosageForm: '剂型：注射剂（静脉滴注）', price: '价格：8.00 元/支（集采中标价，原零售价 25.00 元/支）', status: '状态：在用（国家基药，医保甲类，抗感染一线用药）' },
    { id: 'PDD-003', drugName: 'Drug-003：阿司匹林肠溶片（拜阿司匹灵）', spec: '规格：100mg×30 片/盒', dosageForm: '剂型：片剂（口服，肠溶片）', price: '价格：15.00 元/盒（集采中标价，原零售价 28.00 元/盒）', status: '状态：在用（国家基药，医保甲类，心血管疾病预防用药）' },
    { id: 'PDD-004', drugName: 'Drug-004：二甲双胍缓释片（格华止）', spec: '规格：0.5g×30 片/盒', dosageForm: '剂型：片剂（口服，缓释片）', price: '价格：12.00 元/盒（集采中标价，原零售价 22.00 元/盒）', status: '状态：在用（国家基药，医保甲类，2 型糖尿病一线用药）' },
    { id: 'PDD-005', drugName: 'Drug-005：人血白蛋白（20%）', spec: '规格：20%，50ml/瓶（10g）', dosageForm: '剂型：注射剂（静脉滴注）', price: '价格：350.00 元/瓶（自费，非医保）', status: '状态：在用（血液制品，危重病人救治用药）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/stocks-detail - 库存管理详情 5 条 */
async function handlePharmacyStocksDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PSD-001', drugName: '药品：阿托伐他汀钙片（立普妥）20mg×7 片/盒', spec: '规格：20mg×7 片/盒', stock: '库存：1500 盒（库房 1200 盒 + 门诊药房 300 盒）', unit: '单位：盒', location: '库位：库房 A-01-03（常温库，15-25℃）' },
    { id: 'PSD-002', drugName: '药品：注射用头孢曲松钠（罗氏芬）1.0g/支', spec: '规格：1.0g/支', stock: '库存：2000 支（库房 1500 支 + 急诊药房 500 支）', unit: '单位：支', location: '库位：库房 B-02-05（阴凉库，≤20℃）' },
    { id: 'PSD-003', drugName: '药品：阿司匹林肠溶片（拜阿司匹灵）100mg×30 片/盒', spec: '规格：100mg×30 片/盒', stock: '库存：800 盒（库房 600 盒 + 门诊药房 200 盒）', unit: '单位：盒', location: '库位：库房 A-01-05（常温库，15-25℃）' },
    { id: 'PSD-004', drugName: '药品：二甲双胍缓释片（格华止）0.5g×30 片/盒', spec: '规格：0.5g×30 片/盒', stock: '库存：1000 盒（库房 800 盒 + 门诊药房 200 盒）', unit: '单位：盒', location: '库位：库房 A-02-01（常温库，15-25℃）' },
    { id: 'PSD-005', drugName: '药品：人血白蛋白（20%）50ml/瓶（10g）', spec: '规格：20%，50ml/瓶（10g）', stock: '库存：50 瓶（库房 30 瓶 + 急诊药房 20 瓶）', unit: '单位：瓶', location: '库位：冷库 C-01-02（2-8℃ 冷藏库）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/purchases-detail - 采购管理详情 5 条 */
async function handlePharmacyPurchasesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PPD-001', drugName: '药品：阿托伐他汀钙片（立普妥）20mg×7 片/盒', quantity: '数量：5000 盒（月度采购量）', unitPrice: '单价：35.00 元/盒（集采中标价）', supplier: '供应商：国药控股杭州有限公司（国药控股）', time: '采购时间：2026-10-15（月度集中采购）' },
    { id: 'PPD-002', drugName: '药品：注射用头孢曲松钠（罗氏芬）1.0g/支', quantity: '数量：10000 支（月度采购量）', unitPrice: '单价：8.00 元/支（集采中标价）', supplier: '供应商：上海医药杭州有限公司（上海医药）', time: '采购时间：2026-10-15（月度集中采购）' },
    { id: 'PPD-003', drugName: '药品：阿司匹林肠溶片（拜阿司匹灵）100mg×30 片/盒', quantity: '数量：3000 盒（月度采购量）', unitPrice: '单价：15.00 元/盒（集采中标价）', supplier: '供应商：国药控股杭州有限公司（国药控股）', time: '采购时间：2026-10-15（月度集中采购）' },
    { id: 'PPD-004', drugName: '药品：二甲双胍缓释片（格华止）0.5g×30 片/盒', quantity: '数量：4000 盒（月度采购量）', unitPrice: '单价：12.00 元/盒（集采中标价）', supplier: '供应商：华润医药杭州有限公司（华润医药）', time: '采购时间：2026-10-15（月度集中采购）' },
    { id: 'PPD-005', drugName: '药品：人血白蛋白（20%）50ml/瓶（10g）', quantity: '数量：200 瓶（季度采购量）', unitPrice: '单价：350.00 元/瓶（市场调节价）', supplier: '供应商：上海莱士血液制品股份有限公司（上海莱士）', time: '采购时间：2026-10-10（季度集中采购）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/suppliers-detail - 供应商管理详情 5 条 */
async function handlePharmacySuppliersDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PSD-001', supplierName: 'Supplier-001：国药控股杭州有限公司', contactPerson: '联系人：王***（采购部经理，电话：138-0000-0001）', qualification: '资质：药品经营许可证（GSP 认证通过），医疗器械经营许可证，营业执照', rating: '评级：A 级（优秀，合作 10 年，年采购额 5000 万元，零质量投诉）', status: '状态：合格供应商（在册，可正常采购）' },
    { id: 'PSD-002', supplierName: 'Supplier-002：上海医药杭州有限公司', contactPerson: '联系人：李***（销售部经理，电话：138-0000-0002）', qualification: '资质：药品经营许可证（GSP 认证通过），医疗器械经营许可证，营业执照', rating: '评级：A 级（优秀，合作 8 年，年采购额 3000 万元，零质量投诉）', status: '状态：合格供应商（在册，可正常采购）' },
    { id: 'PSD-003', supplierName: 'Supplier-003：华润医药杭州有限公司', contactPerson: '联系人：张***（采购部经理，电话：138-0000-0003）', qualification: '资质：药品经营许可证（GSP 认证通过），医疗器械经营许可证，营业执照', rating: '评级：B+ 级（良好，合作 5 年，年采购额 2000 万元，1 次质量投诉已整改）', status: '状态：合格供应商（在册，可正常采购）' },
    { id: 'PSD-004', supplierName: 'Supplier-004：上海莱士血液制品股份有限公司', contactPerson: '联系人：赵***（销售总监，电话：138-0000-0004）', qualification: '资质：药品生产许可证（GMP 认证通过），血液制品生产许可证，营业执照', rating: '评级：A 级（优秀，合作 12 年，年采购额 500 万元，零质量投诉）', status: '状态：合格供应商（在册，可正常采购）' },
    { id: 'PSD-005', supplierName: 'Supplier-005：华东医药股份有限公司', contactPerson: '联系人：钱***（采购部经理，电话：138-0000-0005）', qualification: '资质：药品经营许可证（GSP 认证通过），医疗器械经营许可证，营业执照', rating: '评级：B 级（合格，合作 3 年，年采购额 1000 万元，2 次质量投诉已整改）', status: '状态：合格供应商（在册，可正常采购）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/warnings-detail - 预警管理详情 5 条 */
async function handlePharmacyWarningsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PWD-001', drugName: '药品：阿托伐他汀钙片（立普妥）20mg×7 片/盒', warningType: '预警类型：库存下限预警', stock: '当前库存：300 盒（门诊药房）', threshold: '预警阈值：下限 200 盒（低于 200 盒触发预警）', status: '状态：预警中（已通知库房补货，预计 2026-10-21 到货 500 盒）' },
    { id: 'PWD-002', drugName: '药品：注射用头孢曲松钠（罗氏芬）1.0g/支', warningType: '预警类型：库存下限预警', stock: '当前库存：500 支（急诊药房）', threshold: '预警阈值：下限 300 支（低于 300 支触发预警）', status: '状态：预警中（已通知库房补货，预计 2026-10-21 到货 1000 支）' },
    { id: 'PWD-003', drugName: '药品：人血白蛋白（20%）50ml/瓶（10g）', warningType: '预警类型：效期预警（近效期）', stock: '当前库存：20 瓶（急诊药房）', threshold: '预警阈值：近效期 3 个月（距有效期不足 3 个月触发预警）', status: '状态：预警中（生产日期 2025-10-01，有效期 2027-09-30，距效期 11 个月，已优先使用）' },
    { id: 'PWD-004', drugName: '药品：阿司匹林肠溶片（拜阿司匹灵）100mg×30 片/盒', warningType: '预警类型：库存上限预警', stock: '当前库存：800 盒（库房）', threshold: '预警阈值：上限 1000 盒（超过 1000 盒触发预警）', status: '状态：预警中（当前库存 800 盒，未超过上限，无需采购）' },
    { id: 'PWD-005', drugName: '药品：二甲双胍缓释片（格华止）0.5g×30 片/盒', warningType: '预警类型：效期预警（近效期）', stock: '当前库存：200 盒（门诊药房）', threshold: '预警阈值：近效期 6 个月（距有效期不足 6 个月触发预警）', status: '状态：预警中（生产日期 2025-05-01，有效期 2027-04-30，距效期 18 个月，正常使用中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/expiry-detail - 效期管理详情 5 条 */
async function handlePharmacyExpiryDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PED-001', drugName: '药品：注射用头孢曲松钠（罗氏芬）1.0g/支', batchNo: '批号：20260301（生产批号）', expiryDate: '有效期：2028-02-29（生产日期 2026-03-01，有效期 24 个月）', stock: '库存：1500 支（库房，距效期 28 个月）', status: '状态：正常（远效期，可正常使用）' },
    { id: 'PED-002', drugName: '药品：人血白蛋白（20%）50ml/瓶（10g）', batchNo: '批号：20251001（生产批号）', expiryDate: '有效期：2027-09-30（生产日期 2025-10-01，有效期 24 个月）', stock: '库存：30 瓶（库房，距效期 11 个月）', status: '状态：近效期（距效期 11 个月，优先使用急诊药房库存）' },
    { id: 'PED-003', drugName: '药品：阿托伐他汀钙片（立普妥）20mg×7 片/盒', batchNo: '批号：20260601（生产批号）', expiryDate: '有效期：2028-05-31（生产日期 2026-06-01，有效期 24 个月）', stock: '库存：1200 盒（库房，距效期 31 个月）', status: '状态：正常（远效期，可正常使用）' },
    { id: 'PED-004', drugName: '药品：阿司匹林肠溶片（拜阿司匹灵）100mg×30 片/盒', batchNo: '批号：20260101（生产批号）', expiryDate: '有效期：2028-12-31（生产日期 2026-01-01，有效期 36 个月）', stock: '库存：600 盒（库房，距效期 38 个月）', status: '状态：正常（远效期，可正常使用）' },
    { id: 'PED-005', drugName: '药品：二甲双胍缓释片（格华止）0.5g×30 片/盒', batchNo: '批号：20250901（生产批号）', expiryDate: '有效期：2027-08-31（生产日期 2025-09-01，有效期 24 个月）', stock: '库存：800 盒（库房，距效期 10 个月）', status: '状态：近效期（距效期 10 个月，优先使用门诊药房库存）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m419Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/drugs-detail', handle: handlePharmacyDrugsDetail, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/stocks-detail', handle: handlePharmacyStocksDetail, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/purchases-detail', handle: handlePharmacyPurchasesDetail, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/suppliers-detail', handle: handlePharmacySuppliersDetail, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/warnings-detail', handle: handlePharmacyWarningsDetail, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/expiry-detail', handle: handlePharmacyExpiryDetail, auth: true },
];
