/**
 * 健澜科技 jlmedaios - M488b 补差异：医生首页质量 Top10
 *
 * GET /api/v1/emr/homepage-doctor 医生首页质量 Top10
 *   （姓名/科室/首页合格率/缺陷数/排名/同比）5 条
 * 避开 M488·M475·M476·M481b·M485·M472·M473·M487 既有端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/homepage-doctor - 医生首页质量 Top10（姓名/科室/合格率/缺陷数/排名/同比）5 条 */
async function handleHomepageDoctor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EHD-001', name: '医生：王主任（心内科）', dept: '科室：心血管内科', pass: '首页合格率：99.2%', defects: '缺陷数：1 条（当月归档 86 份）', rank: '全院排名：Top 1（并列）', yoy: '同比：+2.4pct（去年 96.8%）' },
    { id: 'EHD-002', name: '医生：李主任（骨科）', dept: '科室：骨科', pass: '首页合格率：98.6%', defects: '缺陷数：2 条（归档 72 份）', rank: '全院排名：Top 3', yoy: '同比：+1.8pct' },
    { id: 'EHD-003', name: '医生：张医生（普外科）', dept: '科室：普外科', pass: '首页合格率：97.8%', defects: '缺陷数：3 条（归档 95 份）', rank: '全院排名：Top 5', yoy: '同比：+1.2pct' },
    { id: 'EHD-004', name: '医生：刘医生（呼吸内科）', dept: '科室：呼吸与危重症医学科', pass: '首页合格率：96.5%', defects: '缺陷数：5 条（归档 110 份）', rank: '全院排名：Top 8', yoy: '同比：+0.6pct' },
    { id: 'EHD-005', name: '医生：陈医生（神经内科）', dept: '科室：神经内科', pass: '首页合格率：95.2%', defects: '缺陷数：6 条（归档 68 份）', rank: '全院排名：Top 10', yoy: '同比：-0.4pct（需重点辅导）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m488bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/homepage-doctor', handle: handleHomepageDoctor, auth: true },
];
