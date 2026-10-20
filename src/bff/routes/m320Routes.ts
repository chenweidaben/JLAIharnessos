/**
 * 健澜科技 jlmedaios - M320 病历版本深度域
 *
 * 病历版本列表/版本对比/版本历史/版本回滚/版本作者/版本审核
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/version-list - 病历版本列表 5 条 */
async function handleEmrVersionList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVL-001', recordNo: 'BL-2026-001234', version: 'v3.2（当前版本）', author: '心内科 李***主治医师', time: '2026-10-20 10:30', status: '已审核发布' },
    { id: 'EVL-002', recordNo: 'BL-2026-001234', version: 'v3.1', author: '心内科 李***主治医师', time: '2026-10-20 08:15', status: '已审核发布' },
    { id: 'EVL-003', recordNo: 'BL-2026-001235', version: 'v2.0（当前版本）', author: '普外科 郑***主任医师', time: '2026-10-19 16:00', status: '已审核发布' },
    { id: 'EVL-004', recordNo: 'BL-2026-001236', version: 'v1.5（当前版本）', author: '呼吸内科 王***副主任医师', time: '2026-10-19 11:30', status: '待审核' },
    { id: 'EVL-005', recordNo: 'BL-2026-001237', version: 'v1.0（当前版本）', author: '神经内科 刘***副主任医师', time: '2026-10-18 14:20', status: '已审核发布' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/version-diff - 版本对比 5 条 */
async function handleEmrVersionDiff(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVD-001', recordNo: 'BL-2026-001234', versionA: 'v3.1', versionB: 'v3.2', diffPoints: '现病史补充胸痛持续时间（由"3 小时"改为"3.5 小时"）+ 新增心肌酶谱检查结果 + 修正诊断（由"胸痛待查"改为"急性前壁心肌梗死"）', diffCount: '3 处差异' },
    { id: 'EVD-002', recordNo: 'BL-2026-001235', versionA: 'v1.0', versionB: 'v2.0', diffPoints: '手术记录补充术中出血量（200ml）+ 新增术后病理报告（慢性胆囊炎急性发作）+ 修正出院医嘱', diffCount: '3 处差异' },
    { id: 'EVD-003', recordNo: 'BL-2026-001236', versionA: 'v1.0', versionB: 'v1.5', diffPoints: '补充胸片描述（右肺中野斑片影）+ 新增血常规结果（WBC 12×10⁹/L）+ 修正治疗方案（由"门诊治疗"改为"住院抗感染"）', diffCount: '3 处差异' },
    { id: 'EVD-004', recordNo: 'BL-2026-001237', versionA: 'v0.5（草稿）', versionB: 'v1.0', diffPoints: '完成现病史书写 + 补充神经系统查体（右侧肢体肌力 III 级）+ 新增 NIHSS 评分（8 分）', diffCount: '3 处差异' },
    { id: 'EVD-005', recordNo: 'BL-2026-001238', versionA: 'v1.0', versionB: 'v1.1', diffPoints: '修正用药记录（停用华法林，改用双联抗血小板）+ 补充抗凝 INR 监测结果', diffCount: '2 处差异' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/version-history - 版本历史 5 条 */
async function handleEmrVersionHistory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVH-001', recordNo: 'BL-2026-001234', version: 'v3.2', action: '发布（终稿）', operator: '心内科 李***主治医师', time: '2026-10-20 10:30' },
    { id: 'EVH-002', recordNo: 'BL-2026-001234', version: 'v3.1', action: '修订（补充检查结果）', operator: '心内科 李***主治医师', time: '2026-10-20 08:15' },
    { id: 'EVH-003', recordNo: 'BL-2026-001234', version: 'v3.0', action: '修订（修正诊断）', operator: '心内科 李***主治医师', time: '2026-10-20 06:00' },
    { id: 'EVH-004', recordNo: 'BL-2026-001234', version: 'v2.0', action: '发布（入院记录）', operator: '心内科 李***主治医师', time: '2026-10-20 02:00' },
    { id: 'EVH-005', recordNo: 'BL-2026-001234', version: 'v1.0', action: '创建（首次病程记录）', operator: '心内科 李***主治医师', time: '2026-10-20 00:30' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/version-rollback - 版本回滚记录 5 条 */
async function handleEmrVersionRollback(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVR-001', recordNo: 'BL-2026-001238', rollbackTo: 'v1.0（由 v1.1 回滚）', reason: 'v1.1 用药记录修改错误，误删了华法林用药史', operator: '心内科 李***主治医师 + 病案室 王***主管技师', time: '2026-10-18 15:30' },
    { id: 'EVR-002', recordNo: 'BL-2026-001239', rollbackTo: 'v2.0（由 v2.1 回滚）', reason: 'v2.1 误改了手术日期（由 10-15 改为 10-16）', operator: '普外科 郑***主任医师', time: '2026-10-17 11:00' },
    { id: 'EVR-003', recordNo: 'BL-2026-001240', rollbackTo: 'v1.5（由 v2.0 回滚）', reason: 'v2.0 新增的诊断与实际不符（误加"2 型糖尿病"诊断）', operator: '内分泌科 张***主治医师', time: '2026-10-16 16:45' },
    { id: 'EVR-004', recordNo: 'BL-2026-001241', rollbackTo: 'v1.0（由 v1.2 回滚）', reason: 'v1.2 误删了过敏史记录（青霉素过敏）', operator: '呼吸内科 王***副主任医师', time: '2026-10-15 09:20' },
    { id: 'EVR-005', recordNo: 'BL-2026-001242', rollbackTo: 'v3.0（由 v3.1 回滚）', reason: 'v3.1 修改了既往史（误删了高血压病史）', operator: '神经内科 刘***副主任医师', time: '2026-10-14 14:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/version-author - 版本作者 5 条 */
async function handleEmrVersionAuthor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVA-001', recordNo: 'BL-2026-001234', author: '李***', title: '主治医师', department: '心内科', contribution: '主笔（现病史+体格检查+辅助检查+诊断+治疗方案）' },
    { id: 'EVA-002', recordNo: 'BL-2026-001235', author: '郑***', title: '主任医师', department: '普外科', contribution: '主笔（手术记录+术后医嘱+出院小结）' },
    { id: 'EVA-003', recordNo: 'BL-2026-001236', author: '王***', title: '副主任医师', department: '呼吸内科', contribution: '主笔（门诊病历+诊断+治疗方案）' },
    { id: 'EVA-004', recordNo: 'BL-2026-001237', author: '刘***', title: '副主任医师', department: '神经内科', contribution: '主笔（急诊病历+神经系统查体+溶栓记录）' },
    { id: 'EVA-005', recordNo: 'BL-2026-001234', author: '王***', title: '主任医师', department: '心内科', contribution: '审核（上级医师审核签名）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/version-review - 版本审核 5 条 */
async function handleEmrVersionReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVR-001', recordNo: 'BL-2026-001234', reviewer: '心内科 王***主任医师', result: '通过（同意发布）', comment: '现病史描述完整，诊断明确，治疗方案合理', time: '2026-10-20 10:45' },
    { id: 'EVR-002', recordNo: 'BL-2026-001235', reviewer: '普外科 陈***主任医师', result: '通过（同意发布）', comment: '手术记录规范，术后医嘱完整', time: '2026-10-19 16:15' },
    { id: 'EVR-003', recordNo: 'BL-2026-001236', reviewer: '呼吸内科 赵***主任医师', result: '退回（需补充）', comment: '建议补充胸片描述和血常规结果', time: '2026-10-19 11:45' },
    { id: 'EVR-004', recordNo: 'BL-2026-001237', reviewer: '神经内科 孙***主任医师', result: '通过（同意发布）', comment: '急诊病历书写及时，溶栓记录规范', time: '2026-10-18 14:35' },
    { id: 'EVR-005', recordNo: 'BL-2026-001238', reviewer: '心内科 王***主任医师', result: '通过（同意发布）', comment: '版本回滚操作规范，用药记录准确', time: '2026-10-18 15:45' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m320Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/version-list', handle: handleEmrVersionList, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-diff', handle: handleEmrVersionDiff, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-history', handle: handleEmrVersionHistory, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-rollback', handle: handleEmrVersionRollback, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-author', handle: handleEmrVersionAuthor, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-review', handle: handleEmrVersionReview, auth: true },
];
