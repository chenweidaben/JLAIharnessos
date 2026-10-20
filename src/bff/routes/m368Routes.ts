/**
 * 健澜科技 jlmedaios - M368 P1 业务扩展：科研教学深度打磨
 *
 * 科研奖项（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/research/awards - 科研奖项 5 条 */
async function handleResearchAwards(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RA-001', awardName: '国家科学技术进步奖二等奖（冠心病介入治疗关键技术创新与推广应用）', recipient: '李***（心内科主任医师，第一完成人）', level: '国家级（国家科学技术进步奖）', time: '2026-01-10（颁奖时间）', issuer: '国务院（国家科学技术奖励委员会颁发）' },
    { id: 'RA-002', awardName: '中华医学科技奖一等奖（糖尿病精准诊疗体系的建立与应用）', recipient: '王***（内分泌科主任医师，第一完成人）', level: '部级（中华医学科技奖）', time: '2026-03-15（颁奖时间）', issuer: '中华医学会（中华医学科技奖评审委员会颁发）' },
    { id: 'RA-003', awardName: '浙江省科学技术奖一等奖（肺癌早期诊断技术创新与临床应用）', recipient: '赵***（呼吸内科主任医师，第一完成人）', level: '省级（浙江省科学技术奖）', time: '2026-05-20（颁奖时间）', issuer: '浙江省人民政府（浙江省科学技术奖励委员会颁发）' },
    { id: 'RA-004', awardName: '杭州市科学技术奖二等奖（骨科微创治疗技术优化与推广）', recipient: '孙***（骨科副主任医师，第一完成人）', level: '市级（杭州市科学技术奖）', time: '2026-07-25（颁奖时间）', issuer: '杭州市人民政府（杭州市科学技术奖励委员会颁发）' },
    { id: 'RA-005', awardName: '医院科研创新奖一等奖（AI 辅助诊断系统的临床应用研究）', recipient: '周***（信息科主任，第一完成人）', level: '院级（医院科研创新奖）', time: '2026-09-30（颁奖时间）', issuer: '本院（医院学术委员会颁发）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m368Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/research/awards', handle: handleResearchAwards, auth: true },
];
