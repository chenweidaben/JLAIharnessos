/**
 * 健澜科技 jlmedaios - M505 P0 合规重点（智慧服务三级）：门诊一站式服务 3 端点
 *
 * one-stop/service 服务事项、one-stop/counter 窗口实时状态、one-stop/satisfaction 满意度。
 * 与 M476 /outpatient/queue·/outpatient/encounters/:id、M504 /volunteer/*、M503 /appointment/*、
 * M502 /prescription/*、/outpatient/* 路由区分（走 one-stop/ 新前缀）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/one-stop/service - 一站式服务事项（事项名称Tag/服务窗口/平均办理时长）5 条 */
async function handleOneStopService(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OSS-001', name: '事项名称Tag：咨询（就医流程/医保政策/检查报告解读）', window: '服务窗口：一站式服务中心 1 号窗（咨询导诊岗）', duration: '平均办理时长：3.5 分钟/件（本月累计 1,286 件）' },
    { id: 'OSS-002', name: '事项名称Tag：盖章（诊断证明/请假条/医保转诊单盖章）', window: '服务窗口：一站式服务中心 2 号窗（盖章岗）', duration: '平均办理时长：2.0 分钟/件（本月累计 860 件）' },
    { id: 'OSS-003', name: '事项名称Tag：退费（门诊退费/住院退费/检查退费）', window: '服务窗口：一站式服务中心 3 号窗（退费岗，需财务联动）', duration: '平均办理时长：8.5 分钟/件（本月累计 420 件，含审核）' },
    { id: 'OSS-004', name: '事项名称Tag：复印（病历复印/诊断证明复印/费用清单复印）', window: '服务窗口：一站式服务中心 4 号窗（病案复印岗）', duration: '平均办理时长：5.0 分钟/件（本月累计 380 件，含登记）' },
    { id: 'OSS-005', name: '事项名称Tag：医保（医保备案/异地结算/医保咨询）', window: '服务窗口：一站式服务中心 5 号窗（医保驻院岗）', duration: '平均办理时长：6.5 分钟/件（本月累计 520 件）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/one-stop/counter - 窗口实时状态（窗口编号/服务事项/状态Tag/排队人数）5 条 */
async function handleOneStopCounter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OSC-001', window: '窗口编号：1 号窗（咨询导诊）', service: '服务事项Tag：咨询', status: '状态Tag：开放（窗口工作人员在岗）', queue: '当前排队人数：3 人（平均等待 8 分钟）' },
    { id: 'OSC-002', window: '窗口编号：2 号窗（盖章）', service: '服务事项Tag：盖章', status: '状态Tag：办理中（正在为患者办理诊断证明盖章）', queue: '当前排队人数：5 人（平均等待 12 分钟）' },
    { id: 'OSC-003', window: '窗口编号：3 号窗（退费）', service: '服务事项Tag：退费', status: '状态Tag：繁忙（退费审核积压，已开备用窗口）', queue: '当前排队人数：8 人（平均等待 20 分钟，高峰时段）' },
    { id: 'OSC-004', window: '窗口编号：4 号窗（病案复印）', service: '服务事项Tag：复印', status: '状态Tag：暂停（午休 12:00-13:30，13:30 开放）', queue: '当前排队人数：0 人（暂停无排队）' },
    { id: 'OSC-005', window: '窗口编号：5 号窗（医保驻院）', service: '服务事项Tag：医保', status: '状态Tag：开放（医保专员在岗）', queue: '当前排队人数：2 人（平均等待 6 分钟）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/one-stop/satisfaction - 一站式满意度（服务事项/评分5分制/评价条数/同比）5 条 */
async function handleOneStopSatisfaction(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OSSt-001', service: '服务事项Tag：咨询', score: '满意度评分：4.6 分/5 分制（本月评价 862 条）', count: '评价条数：862 条（5 分占 68% / 4 分占 22% / 3 分占 8% / 2 分占 2%）', yoy: '同比：+0.2pct（去年 4.4 分）' },
    { id: 'OSSt-002', service: '服务事项Tag：盖章', score: '满意度评分：4.8 分/5 分制（本月评价 520 条）', count: '评价条数：520 条（5 分占 82% / 4 分占 14% / 3 分占 4%）', yoy: '同比：+0.1pct' },
    { id: 'OSSt-003', service: '服务事项Tag：退费', score: '满意度评分：4.2 分/5 分制（本月评价 380 条）', count: '评价条数：380 条（5 分占 56% / 4 分占 24% / 3 分占 14% / 2 分占 6%，退费流程慢导致扣分）', yoy: '同比：-0.3pct（需优化退费流程）' },
    { id: 'OSSt-004', service: '服务事项Tag：复印', score: '满意度评分：4.5 分/5 分制（本月评价 260 条）', count: '评价条数：260 条（5 分占 64% / 4 分占 26% / 3 分占 10%）', yoy: '同比：+0.3pct（复印等待时间缩短见效）' },
    { id: 'OSSt-005', service: '服务事项Tag：医保', score: '满意度评分：4.4 分/5 分制（本月评价 340 条）', count: '评价条数：340 条（5 分占 60% / 4 分占 24% / 3 分占 14% / 2 分占 2%）', yoy: '同比：+0.1pct（医保政策解答清晰度提升）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m505Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/one-stop/service', handle: handleOneStopService, auth: true },
  { method: 'GET', path: '/api/v1/one-stop/counter', handle: handleOneStopCounter, auth: true },
  { method: 'GET', path: '/api/v1/one-stop/satisfaction', handle: handleOneStopSatisfaction, auth: true },
];
