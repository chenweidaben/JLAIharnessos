/**
 * 健澜科技 jlmedaios - M473 FHIR 网关（互联互通四甲资源交换核心）
 *
 * FHIR Bundle 资源包 / FHIR 术语映射（terminology-map）
 * （patient/encounter/observation/condition 资源已存在，不重复建）。
 * 避开 M447 已建 FHIR 深化端点（bundle-submit/subscription-hooks/terminology/transform-map/access-tokens/operation-outcomes）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/fhir/bundle - FHIR Bundle 资源包（bundle id/类型/条目数/总条数/生成时间）5 条 */
async function handleFhirBundle(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BUN-001', bundleId: 'Bundle/fhir-bundle-20261020-001', type: '类型：collection（患者主页打包查询）', entries: '条目数：8 个条目（Patient + Encounter + Observation 组）', total: '总条数：8（searchset total 字段一致）', ts: '生成时间：2026-10-20 09:42:10（服务端生成，lastUpdated）' },
    { id: 'BUN-002', bundleId: 'Bundle/fhir-bundle-20261020-002', type: '类型：searchset（检验结果批量回传）', entries: '条目数：24 个条目（Observation + DiagnosticReport）', total: '总条数：24', ts: '生成时间：2026-10-20 09:45:33' },
    { id: 'BUN-003', bundleId: 'Bundle/fhir-bundle-20261020-003', type: '类型：document（出院摘要 Document 打包）', entries: '条目数：12 个条目（Composition + Condition + MedicationRequest）', total: '总条数：12', ts: '生成时间：2026-10-20 09:48:02' },
    { id: 'BUN-004', bundleId: 'Bundle/fhir-bundle-20261020-004', type: '类型：transaction（批量入库提交）', entries: '条目数：6 个提交条目（POST 方法，含 ETag 校验）', total: '总条数：6（事务全部成功返回）', ts: '生成时间：2026-10-20 09:51:47' },
    { id: 'BUN-005', bundleId: 'Bundle/fhir-bundle-20261020-005', type: '类型：searchset（转诊患者视图）', entries: '条目数：15 个条目（跨域患者 360 打包）', total: '总条数：15', ts: '生成时间：2026-10-20 09:55:19' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/fhir/terminology-map - FHIR 术语映射（源编码/目标编码/体系/映射类型）5 条 */
async function handleFhirTerminologyMap(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TMAP-001', src: '源编码：ICD-10 中文本库 I21.4（急性非 ST 段抬高心梗）', target: '目标编码：SNOMED CT 22298006（Myocardial infarction）', system: '体系：本地 ICD-10 → 国际 SNOMED CT', mapType: '映射类型：equivalent（等价映射，1:1）' },
    { id: 'TMAP-002', src: '源编码：本院检验项目代码 LAB-GLU（空腹血糖）', target: '目标编码：LOINC 1558-6（Glucose [Mass/volume] in Serum or Plasma）', system: '体系：本地 LIS 代码 → LOINC', mapType: '映射类型：equivalent' },
    { id: 'TMAP-003', src: '源编码：本院药品代码 DRG-METFOR-500（二甲双胍）', target: '目标编码：ATC A10BA02（Metformin）', system: '体系：本地药品代码 → ATC', mapType: '映射类型：broader（本地规格细化，ATC 为大类）' },
    { id: 'TMAP-004', src: '源编码：本院科室代码 DEP-CARD-01（心血管内科）', target: '目标编码：卫生部科室标准代码 301（心血管内科）', system: '体系：本地科室 → 国标科室字典', mapType: '映射类型：equivalent' },
    { id: 'TMAP-005', src: '源编码：本院手术代码 OP-CABG-01（冠脉搭桥）', target: '目标编码：ICD-9-CM-3 36.1（Aortocoronary bypass）', system: '体系：本地手术代码 → ICD-9-CM-3', mapType: '映射类型：narrower（本地术式细化到分支）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m473Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fhir/bundle', handle: handleFhirBundle, auth: true },
  { method: 'GET', path: '/api/v1/fhir/terminology-map', handle: handleFhirTerminologyMap, auth: true },
];
