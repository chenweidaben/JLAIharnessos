/**
 * 健澜科技 jlmedaios - M609 CDR 临床数据中心查询
 *
 * GET /api/v1/cdr/patients/:id/overview    患者全景概览
 * GET /api/v1/cdr/query                    通用 CDR 查询（按实体类型）
 * GET /api/v1/cdr/stats                    CDR 数据量统计
 *
 * 种子：患者概览聚合 + 实体计数
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

const patientOverview = {
  patientId: 'P001',
  name: '张*三',
  gender: 'male',
  age: 62,
  mrn: 'MR001',
  allergies: ['青霉素', '磺胺类'],
  chronicDiseases: ['高血压3级', '2型糖尿病', '冠心病'],
  recentAdmissions: [
    { admissionNo: 'ADM20261018001', dept: '呼吸内科', admitDate: '2026-10-18', dischargeDate: '2026-10-20', diagnosis: '肺炎' },
    { admissionNo: 'ADM20260901002', dept: '心内科', admitDate: '2026-09-01', dischargeDate: '2026-09-08', diagnosis: '心绞痛' },
  ],
  recentLabs: [
    { item: '血常规白细胞', value: '12.5', unit: '×10^9/L', abnormal: 'high', date: '2026-10-19' },
    { item: 'C反应蛋白', value: '85', unit: 'mg/L', abnormal: 'high', date: '2026-10-19' },
    { item: '空腹血糖', value: '8.2', unit: 'mmol/L', abnormal: 'high', date: '2026-10-18' },
    { item: '血红蛋白', value: '115', unit: 'g/L', abnormal: 'low', date: '2026-10-18' },
  ],
  recentMeds: [
    { name: '头孢呋辛钠', dose: '1.5g', route: 'IV', frequency: 'q8h', startDate: '2026-10-18' },
    { name: '二甲双胍', dose: '0.5g', route: 'PO', frequency: 'bid', startDate: '2026-09-01' },
    { name: '阿司匹林', dose: '100mg', route: 'PO', frequency: 'qd', startDate: '2026-09-01' },
  ],
};

const cdrStats = {
  totalPatients: 128560,
  totalAdmissions: 89230,
  totalLabs: 15600000,
  totalPrescriptions: 2340000,
  totalImagingReports: 456000,
  totalNursingRecords: 8900000,
  syncRate: 99.2,
  lastSyncTime: '2026-10-22 06:00:00',
};

export const m609Routes: RouteDef[] = [
  {
    path: '/api/v1/cdr/patients/:id/overview',
    method: 'GET',
    auth: true,
    handle: (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      const { id } = c.params;
      if (id === 'P001') return json(ok(patientOverview), 200);
      return json({ code: 404, message: 'patient not found' }, 404);
    },
  },
  {
    path: '/api/v1/cdr/query',
    method: 'GET',
    auth: true,
    handle: (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      const entity = c.query.get('entity') || 'patient';
      const limit = parseInt(c.query.get('limit') || '10', 10);
      // 通用查询：返回实体类型 + 样例数据
      const samples: Record<string, unknown[]> = {
        patient: [{ id: 'P001', name: '张*三' }, { id: 'P002', name: '李*四' }],
        lab: [{ id: 'LAB001', patientId: 'P001', item: '血常规', date: '2026-10-19' }],
        prescription: [{ id: 'RX001', patientId: 'P001', drug: '头孢呋辛', date: '2026-10-18' }],
      };
      const data = samples[entity] || [];
      return json(ok({ entity, total: data.length, limit, data: data.slice(0, limit) }), 200);
    },
  },
  {
    path: '/api/v1/cdr/stats',
    method: 'GET',
    auth: true,
    handle: (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      return json(ok(cdrStats), 200);
    },
  },
];
