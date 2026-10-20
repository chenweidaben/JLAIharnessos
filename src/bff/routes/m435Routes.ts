/**
 * 健澜科技 jlmedaios - M435 药品供应链深度（pharmacy）
 *
 * 采购订单/入库记录/调价记录
 * （stocks-detail 库存明细、expiry 效期预警、suppliers-detail 供应商已存在，此处不重复）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/pharmacy/purchase-orders - 采购订单（订单号/药品/数量/供应商/状态）5 条 */
async function handlePharmPurchaseOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PPO-001', orderNo: '订单号：PO-2026-1018（集采集中采购）', drug: '药品：阿托伐他汀钙片 20mg*7 片（100 盒）', qty: '数量：1200 盒（含税单价 3.60 元/盒）', supplier: '供应商：国控浙江医药有限公司（GSP 持证）', status: '状态：已到货验收（入库完成，发票已到）' },
    { id: 'PPO-002', orderNo: '订单号：PO-2026-1019（常规补货）', drug: '药品：头孢克洛分散片 0.25g*12 片（50 盒）', qty: '数量：300 盒（单价 18.20 元/盒）', supplier: '供应商：九州通医药集团股份有限公司', status: '状态：配送中（物流在途，预计明日到库）' },
    { id: 'PPO-003', orderNo: '订单号：PO-2026-1017（急救短缺急采）', drug: '药品：肾上腺素注射液 1mg*10 支（20 盒）', qty: '数量：80 盒（应急通道加急）', supplier: '供应商：本地应急配送商（急救绿色通道）', status: '状态：已签收（特急，4 小时内到库）' },
    { id: 'PPO-004', orderNo: '订单号：PO-2026-1016（审批中）', drug: '药品：胰岛素德谷门冬双胰岛素注射液（30 支）', qty: '数量：120 支（单价 198.00 元/支，冷链）', supplier: '供应商：诺和诺德（中国）制药官方代理', status: '状态：待院长审批（预算与集采备案中）' },
    { id: 'PPO-005', orderNo: '订单号：PO-2026-1015（已取消）', drug: '药品：某竞品降压片（原拟替代采购）', qty: '数量：原 200 盒（因集采中选结果调整取消）', supplier: '供应商：原报价供应商（已通知解约）', status: '状态：已取消（集采中选后不再采购该品规）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/inbound - 入库记录（批号/药品/数量/入库人/时间）5 条 */
async function handlePharmInbound(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PIN-001', batchNo: '批号：ATV202609A（有效期至 2028-09-30）', drug: '药品：阿托伐他汀钙片 20mg*7 片', qty: '数量：1200 盒（验收合格，随货同行单齐全）', inboundUser: '入库人：药品验收员 吴***（工号 PH-012）', time: '时间：2026-10-20 08:50:22' },
    { id: 'PIN-002', batchNo: '批号：CP202608B（有效期至 2028-08-15）', drug: '药品：头孢克洛分散片 0.25g*12 片', qty: '数量：300 盒（抽检合格）', inboundUser: '入库人：药品验收员 郑***（工号 PH-018）', time: '时间：2026-10-20 09:15:40' },
    { id: 'PIN-003', batchNo: '批号：ADR202610C（有效期至 2027-10-01，冷链 2-8℃）', drug: '药品：胰岛素德谷门冬双胰岛素注射液', qty: '数量：120 支（冷链温度记录连续，验收合格）', inboundUser: '入库人：冷链药师 钱***（工号 PH-021）', time: '时间：2026-10-20 10:05:18' },
    { id: 'PIN-004', batchNo: '批号：NACL202607D（有效期至 2028-07-20）', drug: '药品：0.9% 氯化钠注射液 250ml（输液）', qty: '数量：500 瓶（常规大输液补货）', inboundUser: '入库人：库管员 孙***（工号 WH-006）', time: '时间：2026-10-20 10:42:55' },
    { id: 'PIN-005', batchNo: '批号：IBU202609E（有效期至 2028-09-05）', drug: '药品：布洛芬缓释胶囊 0.3g*20 粒', qty: '数量：240 盒（验收合格，陈列上架）', inboundUser: '入库人：药品验收员 吴***（工号 PH-012）', time: '时间：2026-10-20 11:10:33' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/price-adjust - 调价记录（药品/原价/新价/生效日/审批人）5 条 */
async function handlePharmPriceAdjust(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PPA-001', drug: '药品：阿托伐他汀钙片 20mg*7 片（集采中选）', oldPrice: '原价：12.80 元/盒', newPrice: '新价：3.60 元/盒（集采降价）', effectiveDate: '生效日：2026-10-01 起执行', approver: '审批人：药剂科主任 + 财务科（集采调价备案）' },
    { id: 'PPA-002', drug: '药品：硝苯地平控释片 30mg*7 片（国谈药品）', oldPrice: '原价：38.50 元/盒', newPrice: '新价：29.80 元/盒（国家谈判降价）', effectiveDate: '生效日：2026-10-15 起执行', approver: '审批人：医保办 + 药剂科' },
    { id: 'PPA-003', drug: '药品：生理盐水 250ml（常规大输液）', oldPrice: '原价：3.20 元/瓶', newPrice: '新价：3.00 元/瓶（采购成本微调）', effectiveDate: '生效日：2026-10-20 起执行', approver: '审批人：药剂科主任' },
    { id: 'PPA-004', drug: '药品：某自费保健类中成药（非医保）', oldPrice: '原价：86.00 元/盒', newPrice: '新价：79.00 元/盒（惠民让利）', effectiveDate: '生效日：2026-11-01 起执行', approver: '审批人：院长办公会审批' },
    { id: 'PPA-005', drug: '药品：胰岛素德谷门冬双胰岛素注射液（3ml 笔芯）', oldPrice: '原价：210.00 元/支', newPrice: '新价：198.00 元/支（供应商年度协议降价）', effectiveDate: '生效日：2026-10-08 起执行', approver: '审批人：药剂科 + 采购科' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m435Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/purchase-orders', handle: handlePharmPurchaseOrders, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/inbound', handle: handlePharmInbound, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/price-adjust', handle: handlePharmPriceAdjust, auth: true },
];
