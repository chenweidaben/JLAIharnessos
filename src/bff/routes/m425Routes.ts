/**
 * 健澜科技 jlmedaios - M425 P1 业务扩展：病历版本管理深度打磨（补建）
 *
 * 版本对比/版本回滚/病历锁定记录
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/versions/diff - 版本对比 5 条（病历号/版本A/版本B/差异点） */
async function handleEmrVersionsDiff(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVD-001', recordNo: '病历号：EMR-2026-1001（张***，心内科住院病历）', versionA: '版本A：v3（2026-10-18 09:30 提交，住院医师首程）', versionB: '版本B：v4（2026-10-19 16:00 提交，主任医师查房修改）', diffPoints: '差异点：1. 诊断由"冠心病"修订为"冠心病不稳定型心绞痛"；2. 新增"建议冠状动脉造影"诊疗意见；3. 用药方案新增阿司匹林负荷剂量说明' },
    { id: 'EVD-002', recordNo: '病历号：EMR-2026-1002（李***，神经内科住院病历）', versionA: '版本A：v2（2026-10-17 14:00 提交，主治医师病程记录）', versionB: '版本B：v3（2026-10-18 10:00 提交，主治更新）', diffPoints: '差异点：1. 神经功能评分由 NIHSS 8 分修订为 6 分（病情好转）；2. 影像结论新增"左侧基底节区梗死灶较前缩小"；3. 康复指导章节补充' },
    { id: 'EVD-003', recordNo: '病历号：EMR-2026-1003（王***，骨科手术记录）', versionA: '版本A：v1（2026-10-16 11:00 提交，术前小结）', versionB: '版本B：v2（2026-10-17 15:00 提交，术后手术记录）', diffPoints: '差异点：1. 新增术中出血量 300ml、手术时长 90 分钟；2. 术后诊断更新为"右股骨颈骨折内固定术后"；3. 增加引流管放置记录' },
    { id: 'EVD-004', recordNo: '病历号：EMR-2026-1004（赵***，儿科门诊病历）', versionA: '版本A：v1（2026-10-19 09:00 提交，初诊处方）', versionB: '版本B：v2（2026-10-19 11:30 提交，复诊调整）', diffPoints: '差异点：1. 体温记录由 38.6℃ 修订为 37.8℃（服药后复测）；2. 退热药物由布洛芬调整为对乙酰氨基酚；3. 新增多饮水、物理降温医嘱' },
    { id: 'EVD-005', recordNo: '病历号：EMR-2026-1005（陈***，急诊科抢救记录）', versionA: '版本A：v1（2026-10-20 02:00 提交，抢救初步记录）', versionB: '版本B：v2（2026-10-20 06:00 提交，抢救终记录）', diffPoints: '差异点：1. 抢救结果由"抢救中"更新为"复苏成功转 ICU"；2. 补充除颤 2 次、肾上腺素用量；3. 新增各项生命体征复苏后数据' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/versions/restore - 版本回滚记录 5 条（病历号/源版本/目标版本/操作人/时间） */
async function handleEmrVersionsRestore(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVR-001', recordNo: '病历号：EMR-2026-1001（张***，心内科）', sourceVersion: '源版本：v4（误修改后需回退）', targetVersion: '目标版本：v3（主任医师查房前版本）', operator: '操作人：王***（主任医师，工号 D-001）', time: '操作时间：2026-10-20 10:15:00' },
    { id: 'EVR-002', recordNo: '病历号：EMR-2026-1002（李***，神经内科）', sourceVersion: '源版本：v5（内容误删）', targetVersion: '目标版本：v4（完整病程版本）', operator: '操作人：刘***（主治医师，工号 D-015）', time: '操作时间：2026-10-19 15:40:00' },
    { id: 'EVR-003', recordNo: '病历号：EMR-2026-1006（孙***，普外科）', sourceVersion: '源版本：v3（模板误覆盖）', targetVersion: '目标版本：v2（人工编辑版本）', operator: '操作人：周***（住院医师，工号 D-028）', time: '操作时间：2026-10-18 09:20:00' },
    { id: 'EVR-004', recordNo: '病历号：EMR-2026-1007（吴***，呼吸内科）', sourceVersion: '源版本：v2（诊断录入错误）', targetVersion: '目标版本：v1（原始正确版本）', operator: '操作人：郑***（主治医师，工号 D-033）', time: '操作时间：2026-10-17 17:05:00' },
    { id: 'EVR-005', recordNo: '病历号：EMR-2026-1008（钱***，消化内科）', sourceVersion: '源版本：v4（格式错乱需还原）', targetVersion: '目标版本：v3（规范版本）', operator: '操作人：王***（主任医师，工号 D-001）', time: '操作时间：2026-10-16 14:50:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/locks - 病历锁定记录 5 条（病历号/锁定人/锁定时间/解锁时间/状态） */
async function handleEmrLocks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ELK-001', recordNo: '病历号：EMR-2026-1001（张***，心内科住院病历）', lockedBy: '锁定人：王***（主任医师，工号 D-001）', lockTime: '锁定时间：2026-10-19 16:00:00（终稿锁定）', unlockTime: '解锁时间：未解锁（病历已归档封存）', status: '状态：已锁定（只读，禁止再编辑）' },
    { id: 'ELK-002', recordNo: '病历号：EMR-2026-1002（李***，神经内科住院病历）', lockedBy: '锁定人：刘***（主治医师，工号 D-015）', lockTime: '锁定时间：2026-10-19 15:00:00（临时编辑锁）', unlockTime: '解锁时间：2026-10-19 18:00:00（编辑完成自动解锁）', status: '状态：已解锁（可继续编辑）' },
    { id: 'ELK-003', recordNo: '病历号：EMR-2026-1003（王***，骨科手术记录）', lockedBy: '锁定人：赵***（主任医师，工号 D-003）', lockTime: '锁定时间：2026-10-17 15:30:00（手术记录定稿锁）', unlockTime: '解锁时间：未解锁（已归档）', status: '状态：已锁定（只读，禁止再编辑）' },
    { id: 'ELK-004', recordNo: '病历号：EMR-2026-1009（黄***，出院结算病历）', lockedBy: '锁定人：病案室系统（归档自动锁）', lockTime: '锁定时间：2026-10-18 10:00:00（出院归档锁定）', unlockTime: '解锁时间：未解锁（归档封存，需申请解锁）', status: '状态：已锁定（只读，修改需走补录审批）' },
    { id: 'ELK-005', recordNo: '病历号：EMR-2026-1010（林***，急诊留观病历）', lockedBy: '锁定人：周***（急诊住院医师，工号 D-041）', lockTime: '锁定时间：2026-10-20 08:00:00（交接班临时锁）', unlockTime: '解锁时间：2026-10-20 08:30:00（交接班完成解锁）', status: '状态：已解锁（可继续编辑）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m425Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/versions/diff', handle: handleEmrVersionsDiff, auth: true },
  { method: 'GET', path: '/api/v1/emr/versions/restore', handle: handleEmrVersionsRestore, auth: true },
  { method: 'GET', path: '/api/v1/emr/locks', handle: handleEmrLocks, auth: true },
];
