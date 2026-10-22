/**
 * 健澜科技 jlmedaios - M606 院感暴发预警
 *
 * GET  /api/v1/infection/outbreaks                暴发预警列表
 * POST /api/v1/infection/outbreaks/:id/verify    预警核实
 * GET  /api/v1/infection/surveillance           院感监测趋势（日/周）
 *
 * 种子：5 条预警（含 2 条已核实、1 条暴发确认）
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type RiskLevel = 'high' | 'medium' | 'low';
type VerifyStatus = 'pending' | 'verified' | 'false_alarm';

interface Outbreak {
  id: string;
  deptCode: string;
  deptName: string;
  infectionType: string;
  caseCount: number;
  threshold: number;
  riskLevel: RiskLevel;
  onsetDate: string;
  verifyStatus: VerifyStatus;
  verifier: string | null;
  verifiedAt: string | null;
  note: string;
}

const outbreaks: Outbreak[] = [
  { id: 'OB001', deptCode: 'ICU', deptName: '重症医学科', infectionType: '呼吸机相关性肺炎', caseCount: 5, threshold: 3, riskLevel: 'high', onsetDate: '2026-10-15', verifyStatus: 'verified', verifier: '感控科', verifiedAt: '2026-10-16', note: '暴发确认，已启动隔离措施' },
  { id: 'OB002', deptCode: 'WARD01', deptName: '呼吸内科一病区', infectionType: '多重耐药菌', caseCount: 4, threshold: 3, riskLevel: 'high', onsetDate: '2026-10-18', verifyStatus: 'verified', verifier: '感控科', verifiedAt: '2026-10-19', note: '已隔离 3 例，追踪接触者' },
  { id: 'OB003', deptCode: 'WARD02', deptName: '普外科二病区', infectionType: '手术部位感染', caseCount: 2, threshold: 3, riskLevel: 'medium', onsetDate: '2026-10-19', verifyStatus: 'pending', verifier: null, verifiedAt: null, note: '待核实' },
  { id: 'OB004', deptCode: 'NICU', deptName: '新生儿科', infectionType: '导管相关血流感染', caseCount: 2, threshold: 2, riskLevel: 'medium', onsetDate: '2026-10-20', verifyStatus: 'pending', verifier: null, verifiedAt: null, note: '待核实' },
  { id: 'OB005', deptCode: 'WARD03', deptName: '骨科三病区', infectionType: '尿路感染', caseCount: 1, threshold: 3, riskLevel: 'low', onsetDate: '2026-10-20', verifyStatus: 'false_alarm', verifier: '感控科', verifiedAt: '2026-10-20', note: '偶发病例，非暴发' },
];

const surveillance = [
  { date: '2026-10-14', totalInfections: 12, deviceRelated: 5, mdro: 3 },
  { date: '2026-10-15', totalInfections: 15, deviceRelated: 7, mdro: 4 },
  { date: '2026-10-16', totalInfections: 14, deviceRelated: 6, mdro: 5 },
  { date: '2026-10-17', totalInfections: 18, deviceRelated: 8, mdro: 6 },
  { date: '2026-10-18', totalInfections: 16, deviceRelated: 7, mdro: 6 },
  { date: '2026-10-19', totalInfections: 20, deviceRelated: 9, mdro: 8 },
  { date: '2026-10-20', totalInfections: 17, deviceRelated: 8, mdro: 7 },
];

export const m606Routes: RouteDef[] = [
  {
    path: '/api/v1/infection/outbreaks',
    method: 'GET',
    auth: true,
    handle: (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      const status = c.query.get('status');
      let list = [...outbreaks];
      if (status) list = list.filter(o => o.verifyStatus === status);
      return json(ok({ outbreaks: list, total: list.length }), 200);
    },
  },
  {
    path: '/api/v1/infection/outbreaks/:id/verify',
    method: 'POST',
    auth: true,
    handle: async (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      const { id } = c.params;
      let body: { verifyStatus: VerifyStatus; note?: string } | null = null;
      try { body = await c.body<{ verifyStatus: VerifyStatus; note?: string }>(); } catch { body = null; }
      if (!body) return json({ code: 400, message: 'invalid body' }, 400);
      const ob = outbreaks.find(o => o.id === id);
      if (!ob) return json({ code: 404, message: 'outbreak not found' }, 404);
      if (ob.verifyStatus !== 'pending') return json({ code: 409, message: `already ${ob.verifyStatus}` }, 409);
      ob.verifyStatus = body.verifyStatus;
      ob.verifier = 'current_user';
      ob.verifiedAt = new Date().toISOString();
      if (body.note) ob.note = body.note;
      return json(ok(ob), 200);
    },
  },
  {
    path: '/api/v1/infection/surveillance',
    method: 'GET',
    auth: true,
    handle: (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      return json(ok({ surveillance }), 200);
    },
  },
];
