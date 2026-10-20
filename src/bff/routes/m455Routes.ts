/**
 * 健澜科技 jlmedaios - M455 低值耗材供应链（consumable）
 *
 * 耗材库存 / 科室领用 / 库存盘点 / 供应商 / 采购单 / 效期管理
 * 避开后勤设备、药品采购入库、院内药房调剂口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/consumable/inventory - 耗材库存（耗材号/名称/规格/库存量/库位）5 条 */
async function handleConInventory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CIV-001', sku: '耗材号：CS-1001（一次性医用手套）', name: '名称：乳胶检查手套（无粉）', spec: '规格：M 号，100 只/盒', stock: '库存量：320 盒', location: '库位：耗材库 A-03-02' },
    { id: 'CIV-002', sku: '耗材号：CS-1002（医用口罩）', name: '名称：一次性医用外科口罩（三层）', spec: '规格：50 只/盒，独立包装可选', stock: '库存量：560 盒', location: '库位：耗材库 A-01-05' },
    { id: 'CIV-003', sku: '耗材号：CS-1003（注射器）', name: '名称：一次性使用无菌注射器（带针）', spec: '规格：5mL，100 支/盒', stock: '库存量：180 盒', location: '库位：耗材库 B-02-01' },
    { id: 'CIV-004', sku: '耗材号：CS-1004（输液贴）', name: '名称：医用透气输液贴（透气型）', spec: '规格：7cm×3.5cm，200 片/盒', stock: '库存量：95 盒', location: '库位：耗材库 B-04-03' },
    { id: 'CIV-005', sku: '耗材号：CS-1005（消毒棉球）', name: '名称：医用脱脂消毒棉球（独立袋）', spec: '规格：0.5g/粒，25 粒/袋', stock: '库存量：410 袋', location: '库位：耗材库 C-01-02' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/consumable/requisitions - 科室领用（领用号/科室/耗材/数量/领用人）5 条 */
async function handleConRequisitions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CRQ-001', reqNo: '领用号：REQ-20261020-011', dept: '科室：心内科病房', sku: '耗材：一次性注射器 5mL（CS-1003）', qty: '数量：20 盒', receiver: '领用人：护士 林***（NE-218）' },
    { id: 'CRQ-002', reqNo: '领用号：REQ-20261020-012', dept: '科室：急诊科', sku: '耗材：医用外科口罩（CS-1002）', qty: '数量：30 盒', receiver: '领用人：护士 郑***（NE-102）' },
    { id: 'CRQ-003', reqNo: '领用号：REQ-20261019-033', dept: '科室：手术室', sku: '耗材：乳胶检查手套 M 号（CS-1001）', qty: '数量：40 盒', receiver: '领用人：器械护士 孙***（OR-009）' },
    { id: 'CRQ-004', reqNo: '领用号：REQ-20261019-044', dept: '科室：检验科', sku: '耗材：消毒棉球独立袋（CS-1005）', qty: '数量：15 袋', receiver: '领用人：检验技师 黄***（LB-031）' },
    { id: 'CRQ-005', reqNo: '领用号：REQ-20261018-055', dept: '科室：输液室', sku: '耗材：输液贴（CS-1004）', qty: '数量：12 盒', receiver: '领用人：护士 周***（NE-156）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/consumable/stocktaking - 库存盘点（盘点号/库位/账存/实存/差异）5 条 */
async function handleConStocktaking(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CST-001', countNo: '盘点号：STK-20261020-01', location: '库位：耗材库 A-03-02（手套区）', book: '账存：320 盒', actual: '实存：318 盒', diff: '差异：-2 盒（盘亏，已登记待核）' },
    { id: 'CST-002', countNo: '盘点号：STK-20261020-02', location: '库位：耗材库 A-01-05（口罩区）', book: '账存：560 盒', actual: '实存：560 盒', diff: '差异：0（账实相符）' },
    { id: 'CST-003', countNo: '盘点号：STK-20261019-03', location: '库位：耗材库 B-02-01（注射器区）', book: '账存：180 盒', actual: '实存：181 盒', diff: '差异：+1 盒（盘盈，待复核）' },
    { id: 'CST-004', countNo: '盘点号：STK-20261019-04', location: '库位：耗材库 B-04-03（输液贴区）', book: '账存：95 盒', actual: '实存：95 盒', diff: '差异：0（账实相符）' },
    { id: 'CST-005', countNo: '盘点号：STK-20261018-05', location: '库位：耗材库 C-01-02（棉球区）', book: '账存：410 袋', actual: '实存：406 袋', diff: '差异：-4 袋（盘亏，抽查领用登记核对）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/consumable/suppliers - 供应商（供应商号/名称/资质/品类/评级）5 条 */
async function handleConSuppliers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CSP-001', supNo: '供应商号：SUP-A01（华东医用耗材有限公司）', name: '名称：华东医用耗材有限公司', qual: '资质：营业执照/医疗器械经营许可证齐全，年度核验有效', category: '品类：手套/口罩/注射耗材等通用低值耗材', rating: '评级：A（年度供货及时率 99%，质量稳定）' },
    { id: 'CSP-002', supNo: '供应商号：SUP-B02（康洁卫生材料厂）', name: '名称：康洁卫生材料厂', qual: '资质：生产许可证/产品注册证齐全，质检报告随货', category: '品类：棉球/纱布/消毒敷料类', rating: '评级：B（偶有批次包装瑕疵，已反馈改进）' },
    { id: 'CSP-003', supNo: '供应商号：SUP-C03（恒安医疗器械供应站）', name: '名称：恒安医疗器械供应站', qual: '资质：经营许可证有效，授权代理链条完整', category: '品类：输液器/输液贴等输液配套耗材', rating: '评级：A（价格合理，售后响应快）' },
    { id: 'CSP-004', supNo: '供应商号：SUP-D04（绿源防护用品厂）', name: '名称：绿源防护用品厂', qual: '资质：生产/注册证齐全，灭菌批次可追溯', category: '品类：医用口罩/防护手套等防护耗材', rating: '评级：B（供货波动，旺季需提前备货）' },
    { id: 'CSP-005', supNo: '供应商号：SUP-E05（民生医用批发部）', name: '名称：民生医用批发部', qual: '资质：经营许可有效，基础资质齐全', category: '品类：杂项低值耗材（文具/清洁/辅助用品）', rating: '评级：C（仅限补充采购，不进入主供应商名录）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/consumable/purchase-orders - 采购单（单号/品项/数量/金额/状态）5 条 */
async function handleConPo(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CPO-001', poNo: '单号：PO-20261020-01', item: '品项：乳胶检查手套 M 号（CS-1001）', qty: '数量：500 盒', amount: '金额：人民币 9,800.00 元', status: '状态：已下单待发货（SUP-A01）' },
    { id: 'CPO-002', poNo: '单号：PO-20261020-02', item: '品项：医用外科口罩（CS-1002）', qty: '数量：800 盒', amount: '金额：人民币 12,400.00 元', status: '状态：在途配送中（SUP-A01）' },
    { id: 'CPO-003', poNo: '单号：PO-20261019-03', item: '品项：一次性注射器 5mL（CS-1003）', qty: '数量：300 盒', amount: '金额：人民币 7,200.00 元', status: '状态：已到货入库（验收合格）' },
    { id: 'CPO-004', poNo: '单号：PO-20261019-04', item: '品项：消毒棉球独立袋（CS-1005）', qty: '数量：200 袋', amount: '金额：人民币 2,600.00 元', status: '状态：已到货待验收（SUP-B02）' },
    { id: 'CPO-005', poNo: '单号：PO-20261018-05', item: '品项：输液贴（CS-1004）', qty: '数量：150 盒', amount: '金额：人民币 1,950.00 元', status: '状态：已完成（到货入库、对账完结）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/consumable/expiry - 效期管理（耗材号/批号/失效日期/剩余天数/预警）5 条 */
async function handleConExpiry(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CEX-001', sku: '耗材号：CS-1003（注射器）', batch: '批号：B20250318', expiry: '失效日期：2027-03-17', remain: '剩余天数：约 483 天（充裕）', alert: '预警：正常（绿色，无需处理）' },
    { id: 'CEX-002', sku: '耗材号：CS-1005（消毒棉球）', batch: '批号：B20250622', expiry: '失效日期：2026-12-21', remain: '剩余天数：约 62 天（临期）', alert: '预警：临期黄色（优先发放使用，避免过期）' },
    { id: 'CEX-003', sku: '耗材号：CS-1002（外科口罩）', batch: '批号：B20250910', expiry: '失效日期：2027-09-09', remain: '剩余天数：约 690 天（充裕）', alert: '预警：正常（绿色）' },
    { id: 'CEX-004', sku: '耗材号：CS-1001（乳胶手套）', batch: '批号：B20241130', expiry: '失效日期：2026-11-29', remain: '剩余天数：约 40 天（临期）', alert: '预警：临期黄色（加快领用，盘查库存）' },
    { id: 'CEX-005', sku: '耗材号：CS-1004（输液贴）', batch: '批号：B20240815', expiry: '失效日期：2026-08-14（已过期）', remain: '剩余天数：已过期（封存隔离，禁止使用）', alert: '预警：过期红色（立即下架报废，登记销毁记录）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m455Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/consumable/inventory', handle: handleConInventory, auth: true },
  { method: 'GET', path: '/api/v1/consumable/requisitions', handle: handleConRequisitions, auth: true },
  { method: 'GET', path: '/api/v1/consumable/stocktaking', handle: handleConStocktaking, auth: true },
  { method: 'GET', path: '/api/v1/consumable/suppliers', handle: handleConSuppliers, auth: true },
  { method: 'GET', path: '/api/v1/consumable/purchase-orders', handle: handleConPo, auth: true },
  { method: 'GET', path: '/api/v1/consumable/expiry', handle: handleConExpiry, auth: true },
];
