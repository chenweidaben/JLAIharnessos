/**
 * 健澜科技 jlmedaios - M607 DRG 分组
 *
 * GET  /api/v1/drg/cases                DRG 病例列表
 * POST /api/v1/drg/cases/group          分组计算（ICD-10 + ICD-9-CM3 → DRG 组）
 * GET  /api/v1/drg/groups               DRG 组目录
 *
 * 种子：8 个 DRG 分组病例（含 3 个超支、2 个结余）
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type DrgStatus = 'ungrouped' | 'grouped' | 'reviewing';

interface DrgCase {
  id: string;
  patientName: string;
  admissionNo: string;
  mainDiagnosis: string;
  mainDiagnosisCode: string;
  mainProcedure: string;
  mainProcedureCode: string;
  drgGroup: string | null;
  weight: number | null;
  totalCost: number;
  reimbursement: number | null;
  balance: number | null;
  los: number;
  status: DrgStatus;
}

const drgCases: DrgCase[] = [
  { id: 'DRG001', patientName: '张*三', admissionNo: 'ADM20261018001', mainDiagnosis: '肺炎', mainDiagnosisCode: 'J18.9', mainProcedure: '无', mainProcedureCode: '', drgGroup: 'ES1', weight: 1.05, totalCost: 8500, reimbursement: 9200, balance: 700, los: 6, status: 'grouped' },
  { id: 'DRG002', patientName: '李*四', admissionNo: 'ADM20261017002', mainDiagnosis: '急性阑尾炎', mainDiagnosisCode: 'K35.9', mainProcedure: '阑尾切除术', mainProcedureCode: '47.09', drgGroup: 'GB2', weight: 0.85, totalCost: 12000, reimbursement: 7800, balance: -4200, los: 5, status: 'grouped' },
  { id: 'DRG003', patientName: '王*五', admissionNo: 'ADM20261016003', mainDiagnosis: '冠心病', mainDiagnosisCode: 'I25.1', mainProcedure: '冠脉支架植入术', mainProcedureCode: '36.06', drgGroup: 'FM1', weight: 2.85, totalCost: 45000, reimbursement: 52000, balance: 7000, los: 8, status: 'grouped' },
  { id: 'DRG004', patientName: '赵*六', admissionNo: 'ADM20261019004', mainDiagnosis: '股骨颈骨折', mainDiagnosisCode: 'S72.0', mainProcedure: '人工髋关节置换术', mainProcedureCode: '81.51', drgGroup: 'IB3', weight: 3.20, totalCost: 68000, reimbursement: 62000, balance: -6000, los: 14, status: 'reviewing' },
  { id: 'DRG005', patientName: '钱*七', admissionNo: 'ADM20261020005', mainDiagnosis: '2型糖尿病', mainDiagnosisCode: 'E11.9', mainProcedure: '无', mainProcedureCode: '', drgGroup: null, weight: null, totalCost: 5200, reimbursement: null, balance: null, los: 4, status: 'ungrouped' },
  { id: 'DRG006', patientName: '孙*八', admissionNo: 'ADM20261015006', mainDiagnosis: '脑出血', mainDiagnosisCode: 'I61.9', mainProcedure: '颅内血肿清除术', mainProcedureCode: '01.24', drgGroup: 'AB1', weight: 4.50, totalCost: 95000, reimbursement: 110000, balance: 15000, los: 21, status: 'grouped' },
  { id: 'DRG007', patientName: '周*九', admissionNo: 'ADM20261018007', mainDiagnosis: '慢阻肺急性加重', mainDiagnosisCode: 'J44.1', mainProcedure: '无', mainProcedureCode: '', drgGroup: 'ES2', weight: 1.35, totalCost: 15000, reimbursement: 11800, balance: -3200, los: 9, status: 'grouped' },
  { id: 'DRG008', patientName: '吴*十', admissionNo: 'ADM20261020008', mainDiagnosis: '胆囊结石', mainDiagnosisCode: 'K80.2', mainProcedure: '腹腔镜胆囊切除术', mainProcedureCode: '51.23', drgGroup: null, weight: null, totalCost: 9800, reimbursement: null, balance: null, los: 3, status: 'ungrouped' },
];

const drgGroups = [
  { code: 'ES1', name: '呼吸系统感染/炎症伴合并症', weight: 1.05, reimbursement: 9200 },
  { code: 'ES2', name: '呼吸系统感染/炎症伴严重合并症', weight: 1.35, reimbursement: 11800 },
  { code: 'GB2', name: '阑尾手术伴合并症', weight: 0.85, reimbursement: 7800 },
  { code: 'FM1', name: '经皮心血管介入伴合并症', weight: 2.85, reimbursement: 52000 },
  { code: 'IB3', name: '髋膝关节置换伴严重合并症', weight: 3.20, reimbursement: 62000 },
  { code: 'AB1', name: '颅内手术伴严重合并症', weight: 4.50, reimbursement: 110000 },
];

export const m607Routes: RouteDef[] = [
  {
    path: '/api/v1/drg/cases',
    method: 'GET',
    auth: true,
    handle: (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      const status = c.query.get('status');
      let list = [...drgCases];
      if (status) list = list.filter(d => d.status === status);
      return json(ok({ cases: list, total: list.length }), 200);
    },
  },
  {
    path: '/api/v1/drg/cases/group',
    method: 'POST',
    auth: true,
    handle: async (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      let body: { caseId: string } | null = null;
      try { body = await c.body<{ caseId: string }>(); } catch { body = null; }
      if (!body) return json({ code: 400, message: 'invalid body' }, 400);
      const dc = drgCases.find(d => d.id === body.caseId);
      if (!dc) return json({ code: 404, message: 'case not found' }, 404);
      if (dc.status !== 'ungrouped') return json({ code: 409, message: `already ${dc.status}` }, 409);
      // 简单分组：根据主诊断前缀匹配
      let group = drgGroups[0];
      if (dc.mainDiagnosisCode.startsWith('J')) group = drgGroups[0];
      if (dc.mainDiagnosisCode.startsWith('K')) group = drgGroups[2];
      if (dc.mainDiagnosisCode.startsWith('I2')) group = drgGroups[3];
      dc.drgGroup = group.code;
      dc.weight = group.weight;
      dc.reimbursement = group.reimbursement;
      dc.balance = group.reimbursement - dc.totalCost;
      dc.status = 'grouped';
      return json(ok(dc), 200);
    },
  },
  {
    path: '/api/v1/drg/groups',
    method: 'GET',
    auth: true,
    handle: (c: Ctx) => {
      const authErr = requireAuth(c);
      if (authErr) return authErr;
      return json(ok({ groups: drgGroups }), 200);
    },
  },
];
