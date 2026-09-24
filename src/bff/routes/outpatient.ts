/**
 * 健澜科技 jlmedaios - 门诊工作台 BFF 路由
 *
 * 覆盖门诊全链路：候诊队列、就诊快照、问诊、诊断 CRUD、医嘱开立/撤销、
 * 处方提交（服务端审方）/药师审核、病历保存/签名、统计、目录与药品检索。
 *
 * 数据范围：依据登录用户 dataScope（self/dept/all）过滤；操作人取真实 iam UUID。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  ICD_CATALOG, LAB_CATALOG, LAB_PANELS, IMAGING_CATALOG, TREATMENT_CATALOG,
  PRESCRIPTION_TEMPLATES, RECORD_TEMPLATES, COMMON_DIAGNOSES, searchIcd,
} from '@/data/outpatientCatalog';
import {
  addDiagnosis, addOrder, cancelVisitOrder, confirmDiagnosis, findDrugs,
  getEncounter, getOutpatientStats, getWaitingQueue, removeDiagnosis,
  reviewRx, saveConsultation, saveRecord, submitPrescription,
} from '../aggregators/outpatientAggregator';
import { generateAiRecord } from '../aggregators/aiRecordAggregator';

/** 解析登录用户视图（含科室/数据范围） */
async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 依据数据范围决定科室过滤 */
function scopeDept(view: AuthView, queryDept: string | null): string | null {
  if (view.dataScope === 'all') return queryDept;
  return view.deptName;
}

/* --------------------------- 目录映射 ------------------------------ */

const SECTION_TITLES: Record<string, string> = {
  chiefComplaint: '主诉',
  presentIllness: '现病史',
  pastHistory: '既往史',
  physicalExam: '体格检查',
  auxiliaryExam: '辅助检查',
  diagnosis: '诊断',
  treatment: '处理计划',
  healthEducation: '健康宣教',
};

function mapCatalogs() {
  const diagnoses = ICD_CATALOG.map((d) => ({
    code: d.code, name: d.name, pinyin: '', category: d.category,
  }));
  const common = COMMON_DIAGNOSES.map((d) => ({
    code: d.code, name: d.name, pinyin: '', category: d.category,
  }));
  const labs = LAB_CATALOG.map((l) => ({
    id: l.itemId, name: l.name, category: '检验' as const,
    price: l.price, sampleType: l.specimen,
    clinicalSignificance: l.clinicalSignificance,
  }));
  const imaging = IMAGING_CATALOG.map((m) => ({
    id: m.itemId, name: m.name, category: '检查' as const,
    price: m.price, bodyPart: m.modality, contrast: m.needsContrast,
    clinicalSignificance: m.note,
  }));
  const treatments = TREATMENT_CATALOG.map((t) => ({
    id: t.treatmentId, name: t.name, category: '治疗',
    price: t.price, description: t.note,
  }));
  const labPanels = LAB_PANELS.map((p) => ({
    id: p.panelId, name: p.name, totalPrice: p.price,
    itemIds: p.itemIds, description: p.note,
  }));
  const prescriptionTemplates = PRESCRIPTION_TEMPLATES.map((t) => ({
    id: t.templateId, name: t.name, diagnosis: t.indication,
    lines: t.lines.map((l) => ({ ...l, quantity: l.dose * l.days })),
    counsel: '',
  }));
  const recordTemplates = RECORD_TEMPLATES.map((t) => ({
    id: t.templateId,
    name: t.name,
    sections: Object.fromEntries(
      Object.entries(t.content).map(([key, template]) => [
        key,
        { title: SECTION_TITLES[key] ?? key, template },
      ]),
    ),
  }));
  return {
    diagnoses, common, labs, imaging, treatments, labPanels,
    prescriptionTemplates, recordTemplates,
  };
}

/* ----------------------------- 路由 -------------------------------- */

export const outpatientRoutes: RouteDef[] = [
  // 候诊队列
  {
    method: 'GET',
    path: '/api/v1/outpatient/queue',
    handle: async (c) => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const q = c.query.get('dept');
      const dept = scopeDept(view, q);
      return json(ok(await getWaitingQueue(dept)));
    },
    auth: true,
  },

  // 就诊快照
  {
    method: 'GET',
    path: '/api/v1/outpatient/encounters/:id',
    handle: async (c) => {
      const bundle = await getEncounter(c.params.id);
      if (!bundle) return json(fail(ErrorCode.NOT_FOUND, '就诊不存在'), 404);
      return json(ok(bundle));
    },
    auth: true,
  },

  // 保存问诊
  {
    method: 'POST',
    path: '/api/v1/outpatient/encounters/:id/consultation',
    handle: async (c) => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const data = await c.body<Parameters<typeof saveConsultation>[1]>();
      return json(ok(await saveConsultation(c.params.id, data)));
    },
    auth: true,
  },

  // 新增诊断
  {
    method: 'POST',
    path: '/api/v1/outpatient/encounters/:id/diagnoses',
    handle: async (c) => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const data = await c.body<{ code?: string; name: string; kind?: 'primary' | 'secondary' | 'differential' }>();
      if (!data.name) return json(fail(ErrorCode.BAD_REQUEST, '诊断名称缺失'), 400);
      return json(ok(await addDiagnosis(c.params.id, { ...data, doctorId: view.id })));
    },
    auth: true,
  },

  // 确认/否定诊断
  {
    method: 'PATCH',
    path: '/api/v1/outpatient/encounters/:id/diagnoses/:did',
    handle: async (c) => {
      const data = await c.body<{ confirmed: boolean }>();
      return json(ok(await confirmDiagnosis(c.params.id, c.params.did, Boolean(data.confirmed))));
    },
    auth: true,
  },

  // 删除诊断
  {
    method: 'DELETE',
    path: '/api/v1/outpatient/encounters/:id/diagnoses/:did',
    handle: async (c) => json(ok(await removeDiagnosis(c.params.id, c.params.did))),
    auth: true,
  },

  // 开立医嘱
  {
    method: 'POST',
    path: '/api/v1/outpatient/encounters/:id/orders',
    handle: async (c) => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const data = await c.body<Parameters<typeof addOrder>[1]>();
      if (!data.name || !data.kind) return json(fail(ErrorCode.BAD_REQUEST, '医嘱信息不完整'), 400);
      return json(ok(await addOrder(c.params.id, { ...data, doctorId: view.id })));
    },
    auth: true,
  },

  // 撤销医嘱
  {
    method: 'POST',
    path: '/api/v1/outpatient/encounters/:id/orders/:oid/cancel',
    handle: async (c) => {
      const data = await c.body<{ reason?: string }>();
      return json(ok(await cancelVisitOrder(c.params.id, c.params.oid, data.reason ?? '医师撤销')));
    },
    auth: true,
  },

  // 提交处方（服务端审方）
  {
    method: 'POST',
    path: '/api/v1/outpatient/encounters/:id/prescriptions',
    handle: async (c) => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const data = await c.body<{ lines: Parameters<typeof submitPrescription>[1]['lines']; counsel?: string }>();
      if (!Array.isArray(data.lines) || data.lines.length === 0) {
        return json(fail(ErrorCode.BAD_REQUEST, '处方明细为空'), 400);
      }
      return json(ok(await submitPrescription(c.params.id, { ...data, prescriberId: view.id })));
    },
    auth: true,
  },

  // 药师审核处方
  {
    method: 'POST',
    path: '/api/v1/outpatient/encounters/:id/prescriptions/:pid/audit',
    handle: async (c) => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const data = await c.body<{ decision: 'approved' | 'rejected'; comment?: string }>();
      if (data.decision !== 'approved' && data.decision !== 'rejected') {
        return json(fail(ErrorCode.BAD_REQUEST, '审核结论无效'), 400);
      }
      return json(
        ok(await reviewRx(c.params.id, c.params.pid, { ...data, reviewerId: view.id })),
      );
    },
    auth: true,
  },

  // 保存/签名病历
  {
    method: 'POST',
    path: '/api/v1/outpatient/encounters/:id/records',
    handle: async (c) => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const data = await c.body<{ content: Record<string, string>; signed?: boolean }>();
      if (!data.content) return json(fail(ErrorCode.BAD_REQUEST, '病历内容缺失'), 400);
      return json(ok(await saveRecord(c.params.id, { ...data, authorId: view.id })));
    },
    auth: true,
  },

  // AI 生成病历草稿（真实 LLM）
  {
    method: 'POST',
    path: '/api/v1/outpatient/encounters/:id/ai-record',
    handle: async (c) => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const draft = await generateAiRecord(c.params.id);
        return json(ok(draft));
      } catch (err) {
        return json(
          fail(ErrorCode.SERVICE_UNAVAILABLE, err instanceof Error ? err.message : 'AI 病历生成失败'),
          502,
        );
      }
    },
    auth: true,
  },

  // 统计
  {
    method: 'GET',
    path: '/api/v1/outpatient/stats',
    handle: async (c) => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const dept = c.query.get('dept') ?? view.deptName;
      return json(ok(await getOutpatientStats(dept)));
    },
    auth: true,
  },

  // 药品检索（真实库）
  {
    method: 'GET',
    path: '/api/v1/outpatient/drugs',
    handle: async (c) => {
      const keyword = c.query.get('keyword') ?? '';
      return json(ok(await findDrugs(keyword)));
    },
    auth: true,
  },

  // 诊断目录（支持关键字）
  {
    method: 'GET',
    path: '/api/v1/outpatient/catalog/diagnoses',
    handle: async (c) => {
      const kw = c.query.get('keyword');
      const { diagnoses, common } = mapCatalogs();
      if (kw) return json(ok(searchIcd(kw, 30).map((d) => ({ code: d.code, name: d.name, pinyin: '', category: d.category }))));
      return json(ok({ diagnoses, common }));
    },
    auth: true,
  },

  // 处方模板
  {
    method: 'GET',
    path: '/api/v1/outpatient/catalog/templates/prescription',
    handle: async () => json(ok(mapCatalogs().prescriptionTemplates)),
    auth: true,
  },
  // 病历模板
  {
    method: 'GET',
    path: '/api/v1/outpatient/catalog/templates/record',
    handle: async () => json(ok(mapCatalogs().recordTemplates)),
    auth: true,
  },

  // 检验/检查/治疗/套餐目录
  {
    method: 'GET',
    path: '/api/v1/outpatient/catalog/:kind',
    handle: async (c) => {
      const cats = mapCatalogs();
      const key = c.params.kind;
      const map: Record<string, unknown> = {
        labs: cats.labs,
        imaging: cats.imaging,
        treatments: cats.treatments,
        'lab-panels': cats.labPanels,
      };
      if (!(key in map)) return json(fail(ErrorCode.NOT_FOUND, '未知目录'), 404);
      return json(ok(map[key]));
    },
    auth: true,
  },
];
