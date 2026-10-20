/**
 * 健澜科技 jlmedaios - M348 P0 合规改造：病历版本深度打磨
 *
 * 版本标签/版本审批（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/version-labels - 版本标签 5 条 */
async function handleEmrVersionLabels(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVL-001', labelName: '首次入院病历', recordNo: 'ZY-2026-000123（张***，心内科住院患者）', versionNo: 'v1.0（2026-10-20 08:00:00 创建）', creator: '李***（心内科主治医师）', time: '2026-10-20 08:30:00（标签创建时间）' },
    { id: 'EVL-002', labelName: '术后第 1 天病程记录', recordNo: 'ZY-2026-000456（刘***，骨科住院患者）', versionNo: 'v2.3（2026-10-20 09:00:00 修改）', creator: '赵***（骨科主任医师）', time: '2026-10-20 10:00:00（标签创建时间）' },
    { id: 'EVL-003', labelName: '出院小结终稿', recordNo: 'ZY-2026-000789（孙***，普外科住院患者）', versionNo: 'v3.0（2026-10-20 14:00:00 创建）', creator: '周***（普外科副主任医师）', time: '2026-10-20 15:00:00（标签创建时间）' },
    { id: 'EVL-004', labelName: '手术知情同意书终稿', recordNo: 'ZY-2026-000456（刘***，骨科住院患者）', versionNo: 'v1.5（2026-10-19 15:00:00 创建）', creator: '赵***（骨科主任医师）', time: '2026-10-19 16:00:00（标签创建时间）' },
    { id: 'EVL-005', labelName: '抢救记录终稿', recordNo: 'ZY-2026-000123（张***，心内科住院患者）', versionNo: 'v2.1（2026-10-20 11:00:00 创建）', creator: '李***（心内科主治医师）', time: '2026-10-20 12:00:00（标签创建时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/version-approve - 版本审批 5 条 */
async function handleEmrVersionApprove(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVA-001', recordNo: 'ZY-2026-000123（张***，心内科住院患者）', versionNo: 'v2.1（2026-10-20 11:00:00 创建）', approver: '王***（心内科副主任医师，科室主任）', result: '审批通过（病历内容真实、完整，符合诊疗规范）', time: '2026-10-20 14:00:00（审批时间）' },
    { id: 'EVA-002', recordNo: 'ZY-2026-000456（刘***，骨科住院患者）', versionNo: 'v2.3（2026-10-20 09:00:00 修改）', approver: '陈***（骨科副主任医师，科室主任）', result: '审批通过（病历内容真实、完整，符合诊疗规范）', time: '2026-10-20 11:00:00（审批时间）' },
    { id: 'EVA-003', recordNo: 'ZY-2026-000789（孙***，普外科住院患者）', versionNo: 'v3.0（2026-10-20 14:00:00 创建）', approver: '林***（普外科副主任医师，科室主任）', result: '审批退回（出院小结中"出院诊断"部分不完整，需补充"高血压 2 级（高危）"）', time: '2026-10-20 15:00:00（审批时间）' },
    { id: 'EVA-004', recordNo: 'ZY-2026-000123（张***，心内科住院患者）', versionNo: 'v1.0（2026-10-20 08:00:00 创建）', approver: '王***（心内科副主任医师，科室主任）', result: '审批通过（病历内容真实、完整，符合诊疗规范）', time: '2026-10-20 09:00:00（审批时间）' },
    { id: 'EVA-005', recordNo: 'ZY-2026-000456（刘***，骨科住院患者）', versionNo: 'v1.5（2026-10-19 15:00:00 创建）', approver: '陈***（骨科副主任医师，科室主任）', result: '审批通过（手术知情同意书内容真实、完整，患者已充分理解并签字）', time: '2026-10-19 16:00:00（审批时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m348Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/version-labels', handle: handleEmrVersionLabels, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-approve', handle: handleEmrVersionApprove, auth: true },
];
