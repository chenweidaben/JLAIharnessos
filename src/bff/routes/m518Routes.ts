/**
 * 健澜科技 jlmedaios - M518 P0 合规重点（智慧服务三级·药品追溯深度）：药品追溯深度监控 2 端点缺口
 *
 * pharmacy/trace 药品追溯、pharmacy/cold-chain 冷链监控、pharmacy/expiry 近效期预警（已 200 不重建）。
 * 与 M484 /pharmacy/quality 概览区分（走 pharmacy/ 子前缀）；与 M517b /anesthesia/*、M517 /anesthesia/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/pharmacy/trace - 药品追溯（药品名称/批号Tag/追溯码/生产企业/配送企业/收货科室/全程温度Tag）5 条 */
async function handlePharmacyTrace(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PT-001', drug: '药品名称：注射用头孢曲松钠（1g/支）', batch: '批号Tag：20260815（有效期至 2028-08-14）', code: '追溯码：8123456789012345（国家药品追溯平台已上传）', producer: '生产企业：华北制药股份有限公司', distributor: '配送企业：浙江医药股份有限公司', dept: '收货科室：静配中心（PIVAS）', temp: '全程温度Tag：2-8℃绿（从生产到收货全程温度记录完整，无断链）' },
    { id: 'PT-002', drug: '药品名称：重组人胰岛素注射液（300IU/3ml）', batch: '批号Tag：20260901（有效期至 2028-08-31）', code: '追溯码：8123456789012346（已上传）', producer: '生产企业：诺和诺德（中国）制药有限公司', distributor: '配送企业：国药控股浙江有限公司', dept: '收货科室：内分泌科病房（病区药房）', temp: '全程温度Tag：2-8℃绿（冷链运输全程温度监控正常）' },
    { id: 'PT-003', drug: '药品名称：注射用泮托拉唑钠（40mg/支）', batch: '批号Tag：20260720（有效期至 2028-07-19）', code: '追溯码：8123456789012347（已上传）', producer: '生产企业：杭州中美华东制药有限公司', distributor: '配送企业：浙江英特药业有限责任公司', dept: '收货科室：静配中心（PIVAS）', temp: '全程温度Tag：常温绿（15-25℃，无需冷链）' },
    { id: 'PT-004', drug: '药品名称：盐酸吗啡注射液（10mg/1ml）', batch: '批号Tag：20260810（有效期至 2028-08-09）', code: '追溯码：8123456789012348（麻精药品追溯码，国家麻精药品追溯平台）', producer: '生产企业：东北制药集团股份有限公司', distributor: '配送企业：浙江医药股份有限公司（麻精药品专送）', dept: '收货科室：麻醉科药房（麻精药品专库）', temp: '全程温度Tag：常温绿（15-25℃，麻精药品全程双人双锁）' },
    { id: 'PT-005', drug: '药品名称：人血白蛋白（10g/50ml）', batch: '批号Tag：20260615（有效期至 2028-06-14）', code: '追溯码：8123456789012349（血液制品追溯码，国家血液制品追溯平台）', producer: '生产企业：上海莱士血液制品股份有限公司', distributor: '配送企业：国药控股浙江有限公司（血液制品专送）', dept: '收货科室：输血科（血液制品专库）', temp: '全程温度Tag：2-8℃绿（冷链运输全程温度监控正常）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/cold-chain - 冷链监控（药品名称/温度Tag/记录时间/异常报警Tag）5 条 */
async function handlePharmacyColdChain(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PCC-001', drug: '药品名称：重组人胰岛素注射液（病区药房冰箱 1 号）', temp: '温度Tag：2-8℃绿（当前 5.2℃，处于标准范围）', time: '记录时间：2026-10-20 14:00（每 5min 自动记录）', alarm: '异常报警Tag：无（近 24h 无报警）' },
    { id: 'PCC-002', drug: '药品名称：人血白蛋白（输血科冰箱 2 号）', temp: '温度Tag：2-8℃绿（当前 6.8℃，接近上限但未超标）', time: '记录时间：2026-10-20 14:00', alarm: '异常报警Tag：无（近 24h 无报警，但需关注温度趋势）' },
    { id: 'PCC-003', drug: '药品名称：注射用头孢曲松钠（静配中心冷库 1 号）', temp: '温度Tag：<2℃橙（当前 1.2℃，低于下限）', time: '记录时间：2026-10-20 06:00（夜间制冷故障）', alarm: '异常报警Tag：已报警红（系统自动报警，已通知后勤维修，10:00 修复）' },
    { id: 'PCC-004', drug: '药品名称：麻精药品（麻醉科药房冰箱 3 号）', temp: '温度Tag：2-8℃绿（当前 4.5℃，处于标准范围）', time: '记录时间：2026-10-20 14:00', alarm: '异常报警Tag：无（近 24h 无报警）' },
    { id: 'PCC-005', drug: '药品名称：疫苗（预防保健科冰箱 4 号）', temp: '温度Tag：>8℃红（当前 9.5℃，高于上限）', time: '记录时间：2026-10-19 15:00（开门时间过长）', alarm: '异常报警Tag：已报警橙（系统自动报警，30min 内恢复正常，疫苗已评估效价不受影响）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m518Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/trace', handle: handlePharmacyTrace, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/cold-chain', handle: handlePharmacyColdChain, auth: true },
];
