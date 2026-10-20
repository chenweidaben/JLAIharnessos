/**
 * 健澜科技 jlmedaios - M519 P0 合规重点（医疗质量安全·输血质控深度）
 *
 * 真实输血业务闭环：申请→审批→交叉配血→发血→床旁双人核对→输注开始/结束→不良反应监测→上报
 *
 * 字段契约（生产级结构化）：
 *   ApplicationRow: {
 *     id, patient, mrn,
 *     bloodType: 'A'|'B'|'O'|'AB', rh: 'positive'|'negative',
 *     component: 'RBC'|'plasma'|'platelet'|'cryoprecipitate',
 *     amountMl: number, dept, diagnosis,
 *     preHb: number|null, prePlt: number|null, preINR: number|null,
 *     indication: 'anemia'|'thrombocytopenia'|'coagulopathy'|'perioperative',
 *     crossmatchStatus: 'pending'|'matched'|'mismatch',
 *     status: 'draft'|'approved'|'issued'|'transfusing'|'completed'|'returned',
 *     issuedAt: string|null, transfusedAt: string|null, completedAt: string|null,
 *     nurseDoubleCheck: boolean
 *   }
 *   ReactionRow: {
 *     id, patient, mrn,
 *     reactionType: 'fever'|'allergy'|'hemolysis'|'bacterial'|'circulatoryOverload'|'hypocalcemia',
 *     occurredAt, severity: 'mild'|'moderate'|'severe',
 *     bloodProduct: string, lotNumber: string,
 *     treatment, resolved: boolean, resolvedAt: string|null, reportRequired: boolean
 *   }
 *   Stats: { todayApplications, todayTransfused, monthReactions, severeReactionRate, matchRate, onTimeRate }
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/transfusion/applications - 输血申请全流程 8 条 */
async function handleTransfusionApplications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    {
      id: 'TA-20261020-001', patient: '张**', mrn: 'ZY202610150032',
      bloodType: 'O', rh: 'positive', component: 'RBC', amountMl: 400,
      dept: '消化内科', diagnosis: '上消化道出血，Hb 68g/L',
      preHb: 68, prePlt: 142, preINR: 1.1,
      indication: 'anemia', crossmatchStatus: 'matched',
      status: 'completed',
      issuedAt: '2026-10-20T09:20:00+08:00',
      transfusedAt: '2026-10-20T09:45:00+08:00',
      completedAt: '2026-10-20T11:10:00+08:00',
      nurseDoubleCheck: true,
    },
    {
      id: 'TA-20261020-002', patient: '李**', mrn: 'ZY202610180117',
      bloodType: 'A', rh: 'positive', component: 'platelet', amountMl: 250,
      dept: '血液内科', diagnosis: 'AML 化疗后骨髓抑制，Plt 18×10⁹/L',
      preHb: 82, prePlt: 18, preINR: 1.3,
      indication: 'thrombocytopenia', crossmatchStatus: 'matched',
      status: 'transfusing',
      issuedAt: '2026-10-20T13:50:00+08:00',
      transfusedAt: '2026-10-20T14:10:00+08:00',
      completedAt: null,
      nurseDoubleCheck: true,
    },
    {
      id: 'TA-20261020-003', patient: '王**', mrn: 'ZY202610190089',
      bloodType: 'B', rh: 'positive', component: 'plasma', amountMl: 400,
      dept: 'ICU', diagnosis: '感染性休克合并 DIC，INR 2.8',
      preHb: 95, prePlt: 58, preINR: 2.8,
      indication: 'coagulopathy', crossmatchStatus: 'matched',
      status: 'issued',
      issuedAt: '2026-10-20T15:00:00+08:00',
      transfusedAt: null, completedAt: null,
      nurseDoubleCheck: false,
    },
    {
      id: 'TA-20261020-004', patient: '赵**', mrn: 'ZY202610170203',
      bloodType: 'AB', rh: 'positive', component: 'RBC', amountMl: 800,
      dept: '心外科', diagnosis: 'CABG 术中失血，Hb 72g/L',
      preHb: 72, prePlt: 96, preINR: 1.4,
      indication: 'perioperative', crossmatchStatus: 'matched',
      status: 'completed',
      issuedAt: '2026-10-20T08:30:00+08:00',
      transfusedAt: '2026-10-20T09:00:00+08:00',
      completedAt: '2026-10-20T10:45:00+08:00',
      nurseDoubleCheck: true,
    },
    {
      id: 'TA-20261020-005', patient: '孙**', mrn: 'JZ202610200045',
      bloodType: 'A', rh: 'negative', component: 'RBC', amountMl: 400,
      dept: '急诊创伤外科', diagnosis: '脾破裂失血性休克，RhD 阴性应急取血',
      preHb: 58, prePlt: 88, preINR: 1.6,
      indication: 'perioperative', crossmatchStatus: 'matched',
      status: 'transfusing',
      issuedAt: '2026-10-20T14:40:00+08:00',
      transfusedAt: '2026-10-20T15:00:00+08:00',
      completedAt: null,
      nurseDoubleCheck: true,
    },
    {
      id: 'TA-20261020-006', patient: '周**', mrn: 'ZY202610160054',
      bloodType: 'O', rh: 'positive', component: 'cryoprecipitate', amountMl: 150,
      dept: '肝病科', diagnosis: '肝硬化纤溶亢进，纤维蛋白原 1.2g/L',
      preHb: 88, prePlt: 65, preINR: 1.9,
      indication: 'coagulopathy', crossmatchStatus: 'pending',
      status: 'approved',
      issuedAt: null, transfusedAt: null, completedAt: null,
      nurseDoubleCheck: false,
    },
    {
      id: 'TA-20261020-007', patient: '吴**', mrn: 'ZY202610140178',
      bloodType: 'B', rh: 'positive', component: 'RBC', amountMl: 400,
      dept: '胃肠外科', diagnosis: '胃癌术后贫血，Hb 78g/L',
      preHb: 78, prePlt: 210, preINR: 1.0,
      indication: 'anemia', crossmatchStatus: 'matched',
      status: 'returned',
      issuedAt: '2026-10-20T07:50:00+08:00',
      transfusedAt: null, completedAt: null,
      nurseDoubleCheck: false,
    },
    {
      id: 'TA-20261020-008', patient: '郑**', mrn: 'ZY202610200061',
      bloodType: 'A', rh: 'positive', component: 'RBC', amountMl: 200,
      dept: '骨科', diagnosis: '股骨骨折术前备血，Hb 105g/L',
      preHb: 105, prePlt: 180, preINR: 1.0,
      indication: 'perioperative', crossmatchStatus: 'pending',
      status: 'draft',
      issuedAt: null, transfusedAt: null, completedAt: null,
      nurseDoubleCheck: false,
    },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/transfusion/adverse-reactions - 输血不良反应 6 条（含上报/血袋批号） */
async function handleTransfusionAdverseReactions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    {
      id: 'TAR-20261020-001', patient: '张**', mrn: 'ZY202610150032',
      reactionType: 'fever', occurredAt: '2026-10-20T10:30:00+08:00',
      severity: 'mild', bloodProduct: '去白红细胞悬液', lotNumber: 'RBC20260912A',
      treatment: '减慢滴速 + 对乙酰氨基酚 0.5g po',
      resolved: true, resolvedAt: '2026-10-20T11:00:00+08:00', reportRequired: false,
    },
    {
      id: 'TAR-20261019-002', patient: '钱**', mrn: 'ZY202610120045',
      reactionType: 'allergy', occurredAt: '2026-10-19T15:20:00+08:00',
      severity: 'moderate', bloodProduct: '新鲜冰冻血浆', lotNumber: 'FP20260830B',
      treatment: '暂停输血 + 异丙嗪 25mg im + 地塞米松 5mg iv',
      resolved: true, resolvedAt: '2026-10-19T16:00:00+08:00', reportRequired: false,
    },
    {
      id: 'TAR-20261018-003', patient: '冯**', mrn: 'ZY202610100088',
      reactionType: 'hemolysis', occurredAt: '2026-10-18T22:10:00+08:00',
      severity: 'severe', bloodProduct: '去白红细胞悬液', lotNumber: 'RBC20260905C',
      treatment: '立即停止输血 + 抗休克 + 碱化尿液 + 保护肾功能 + 血型复核',
      resolved: true, resolvedAt: '2026-10-19T08:00:00+08:00', reportRequired: true,
    },
    {
      id: 'TAR-20261017-004', patient: '陈**', mrn: 'ZY202610110023',
      reactionType: 'circulatoryOverload', occurredAt: '2026-10-17T03:40:00+08:00',
      severity: 'moderate', bloodProduct: '去白红细胞悬液', lotNumber: 'RBC20260920D',
      treatment: '减慢滴速 + 半坐卧位 + 呋塞米 20mg iv + 吸氧',
      resolved: true, resolvedAt: '2026-10-17T05:00:00+08:00', reportRequired: false,
    },
    {
      id: 'TAR-20261016-005', patient: '褚**', mrn: 'ZY202610090067',
      reactionType: 'hypocalcemia', occurredAt: '2026-10-16T11:15:00+08:00',
      severity: 'mild', bloodProduct: '新鲜冰冻血浆', lotNumber: 'FP20260825E',
      treatment: '10% 葡萄糖酸钙 10ml iv',
      resolved: true, resolvedAt: '2026-10-16T11:45:00+08:00', reportRequired: false,
    },
    {
      id: 'TAR-20261015-006', patient: '卫**', mrn: 'ZY202610080112',
      reactionType: 'bacterial', occurredAt: '2026-10-15T19:30:00+08:00',
      severity: 'severe', bloodProduct: '血小板浓缩液', lotNumber: 'PLT20261012F',
      treatment: '停止输血 + 广谱抗生素 + 血袋/患者双侧血培养 + 上报中心血站',
      resolved: true, resolvedAt: '2026-10-16T10:00:00+08:00', reportRequired: true,
    },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/transfusion/stats - 输血质控 KPI */
async function handleTransfusionStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  return json(ok({
    todayApplications: 8,
    todayTransfused: 5,
    monthReactions: 6,
    severeReactionRate: 0.08,
    matchRate: 99.2,
    onTimeRate: 96.5,
    doubleCheckCompliance: 100,
  }));
}

export const m519Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/transfusion/applications', handle: handleTransfusionApplications, auth: true },
  { method: 'GET', path: '/api/v1/transfusion/adverse-reactions', handle: handleTransfusionAdverseReactions, auth: true },
  { method: 'GET', path: '/api/v1/transfusion/stats', handle: handleTransfusionStats, auth: true },
];
