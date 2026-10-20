/**
 * 健澜科技 jlmedaios - M506 P0 合规重点（电子病历五级）：病历版本管理 3 端点
 *
 * emr/version/list 病历版本列表、emr/version/diff 版本差异对比、emr/version/stats 版本统计。
 * 与 M488 /emr/homepage-*、M491 /emr/archive-*、M472 /emr/grade5-*、M473 /emr/quality-defects、
 * M475 /emr/monthly-grade、M505b /complaint/*、/outpatient/* 路由区分（走 emr/version/ 子前缀）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/version/list - 病历版本列表（病历ID/版本号Tag/修改人/修改时间/修改类型Tag）5 条 */
async function handleEmrVersionList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVL-001', record: '病历ID：EMR-20261020-001（张**入院记录，住院号 20261020001）', version: '版本号Tag：v1.0（首次创建）', author: '修改人：王医师（住院医师，工号 D315）', time: '修改时间：2026-10-20 09:30', type: '修改类型Tag：新建（入院 24h 内完成首次病历）' },
    { id: 'EVL-002', record: '病历ID：EMR-20261019-002（李**首次病程记录）', version: '版本号Tag：v2.0（修订）', author: '修改人：李教授（主任医师，工号 D021）', time: '修改时间：2026-10-19 16:00', type: '修改类型Tag：修订（上级医师查房后修订诊疗计划）' },
    { id: 'EVL-003', record: '病历ID：EMR-20261018-003（王**手术记录）', version: '版本号Tag：v3.0（签发）', author: '修改人：李教授（主刀医师）', time: '修改时间：2026-10-18 14:30', type: '修改类型Tag：签发（手术记录术后 24h 内完成并签发）' },
    { id: 'EVL-004', record: '病历ID：EMR-20261017-004（赵**出院小结）', version: '版本号Tag：v2.0（审核后修订）', author: '修改人：医务处质控员（工号 M005）', time: '修改时间：2026-10-17 11:00', type: '修改类型Tag：审核（质控审核发现诊断不规范，退回修订）' },
    { id: 'EVL-005', record: '病历ID：EMR-20261015-005（孙**会诊记录）', version: '版本号Tag：v1.0（签发）', author: '修改人：张教授（会诊医师，工号 D005）', time: '修改时间：2026-10-15 15:00', type: '修改类型Tag：签发（会诊意见 24h 内完成签发）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/version/diff - 版本差异对比（病历ID/字段名/旧值摘要/新值摘要/修改人/修改时间）5 条 */
async function handleEmrVersionDiff(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVD-001', record: '病历ID：EMR-20261019-002（李**首次病程记录 v1.0 → v2.0）', field: '字段名：诊疗计划', old: '旧值摘要：拟行保守治疗，观察 3 天（v1.0）', new: '新值摘要：拟行腹腔镜胆囊切除术，完善术前检查（v2.0，上级查房后修订）', author: '修改人：李教授（主任医师）', time: '修改时间：2026-10-19 16:00' },
    { id: 'EVD-002', record: '病历ID：EMR-20261018-003（王**手术记录 v1.0 → v3.0）', field: '字段名：手术经过', old: '旧值摘要：术中出血约 50ml，无并发症（v1.0）', new: '新值摘要：术中出血约 80ml，放置腹腔引流管 1 根（v3.0，签发前补充）', author: '修改人：李教授（主刀医师）', time: '修改时间：2026-10-18 14:30' },
    { id: 'EVD-003', record: '病历ID：EMR-20261017-004（赵**出院小结 v1.0 → v2.0）', field: '字段名：出院诊断', old: '旧值摘要：胆囊结石伴慢性胆囊炎（v1.0）', new: '新值摘要：胆囊结石伴慢性胆囊炎 + 高血压 2 级（v2.0，补充合并症诊断）', author: '修改人：医务处质控员', time: '修改时间：2026-10-17 11:00' },
    { id: 'EVD-004', record: '病历ID：EMR-20261016-005（张**入院记录 v1.0 → v2.0）', field: '字段名：现病史', old: '旧值摘要：患者 3 天前无明显诱因出现腹痛（v1.0）', new: '新值摘要：患者 3 天前进食油腻食物后出现右上腹绞痛（v2.0，补充诱因）', author: '修改人：王医师（住院医师）', time: '修改时间：2026-10-16 10:00' },
    { id: 'EVD-005', record: '病历ID：EMR-20261015-006（刘**死亡病例讨论 v1.0 → v2.0）', field: '字段名：死亡原因', old: '旧值摘要：多脏器功能衰竭（v1.0）', new: '新值摘要：感染性休克继发多脏器功能衰竭（v2.0，死亡讨论后修订）', author: '修改人：科主任（工号 D010）', time: '修改时间：2026-10-15 17:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/version/stats - 版本统计（月份/修订次数/平均修订轮次/版本可追溯率）5 条 */
async function handleEmrVersionStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVS-001', month: '月份：2026-10（本月累计，截至 10-20）', revisions: '本月病历修订次数：1,286 次（涉及 862 份病历）', avgRounds: '平均修订轮次：1.5 轮/份（v1.0 → v2.0 为主，v3.0 以上占 12%）', trace: '版本可追溯率：100%（所有版本均保留修改人/时间/内容，满足五级评级要求）' },
    { id: 'EVS-002', month: '月份：2026-09（上月完整数据）', revisions: '病历修订次数：1,420 次', avgRounds: '平均修订轮次：1.6 轮/份', trace: '版本可追溯率：100%' },
    { id: 'EVS-003', month: '月份：2026-08', revisions: '病历修订次数：1,360 次', avgRounds: '平均修订轮次：1.5 轮/份', trace: '版本可追溯率：100%' },
    { id: 'EVS-004', month: '月份：2026-Q3 汇总（7-9 月）', revisions: '季度修订次数：4,180 次', avgRounds: '季度平均修订轮次：1.55 轮/份', trace: '季度版本可追溯率：100%（满足电子病历五级评级）' },
    { id: 'EVS-005', month: '月份：2026-10 分类型统计', revisions: '新建 620 / 修订 580 / 审核 68 / 签发 18', avgRounds: '修订轮次最多：死亡病例讨论（平均 2.2 轮）', trace: '版本可追溯率最低科室：急诊科 98.5%（急诊病历修改频繁，需加强版本留痕）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m506Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/version/list', handle: handleEmrVersionList, auth: true },
  { method: 'GET', path: '/api/v1/emr/version/diff', handle: handleEmrVersionDiff, auth: true },
  { method: 'GET', path: '/api/v1/emr/version/stats', handle: handleEmrVersionStats, auth: true },
];
