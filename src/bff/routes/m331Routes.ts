/**
 * 健澜科技 jlmedaios - M331 肿瘤 + 康复医学域
 *
 * 康复评估（复数路径）+ 康复记录（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/rehab/assessments - 康复评估 5 条 */
async function handleRehabAssessments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RA-001', patient: '张***（男，65 岁，脑卒中后偏瘫）', assessmentItem: 'Brunnstrom 运动功能分期（上肢）', score: 'III 期', grade: '中度障碍', assessor: '李***（康复医学科主治医师）' },
    { id: 'RA-002', patient: '王***（女，58 岁，膝关节置换术后）', assessmentItem: '膝关节活动度（ROM）', score: '屈曲 100° / 伸直 0°', grade: '轻度受限（正常屈曲 135°）', assessor: '陈***（康复治疗师）' },
    { id: 'RA-003', patient: '刘***（男，72 岁，慢阻肺稳定期）', assessmentItem: '6 分钟步行试验（6MWT）', score: '350 米', grade: '中度受损（正常 >450 米）', assessor: '赵***（呼吸康复治疗师）' },
    { id: 'RA-004', patient: '孙***（女，45 岁，腰椎间盘突出症术后）', assessmentItem: 'Oswestry 功能障碍指数（ODI）', score: '25 分（轻度障碍）', grade: '轻度功能障碍', assessor: '周***（康复医学科主治医师）' },
    { id: 'RA-005', patient: '吴***（男，60 岁，冠心病 PCI 术后）', assessmentItem: '代谢当量（METs）评估', score: '5 METs', grade: '中度受限（正常 >7 METs）', assessor: '郑***（心脏康复治疗师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/rehab/records - 康复记录 5 条 */
async function handleRehabRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RR-001', patient: '张***（男，65 岁，脑卒中后偏瘫）', therapyItem: '物理治疗（PT）— 上肢被动关节活动度训练', sessions: '第 12 次（累计 12 次）', efficacy: '上肢 Brunnstrom 分期由 II 期提升至 III 期（有进步）', therapist: '李***（康复治疗师）' },
    { id: 'RR-002', patient: '王***（女，58 岁，膝关节置换术后）', therapyItem: '物理治疗（PT）— 膝关节主动屈伸训练 + 步态训练', sessions: '第 8 次（累计 8 次）', efficacy: '膝关节活动度由屈曲 80° 提升至 100°（有进步），步态基本正常', therapist: '陈***（康复治疗师）' },
    { id: 'RR-003', patient: '刘***（男，72 岁，慢阻肺稳定期）', therapyItem: '呼吸康复 — 缩唇呼吸 + 腹式呼吸训练 + 有氧运动（功率车）', sessions: '第 6 次（累计 6 次）', efficacy: '6 分钟步行距离由 300 米提升至 350 米（有进步）', therapist: '赵***（呼吸康复治疗师）' },
    { id: 'RR-004', patient: '孙***（女，45 岁，腰椎间盘突出症术后）', therapyItem: '物理治疗（PT）— 核心肌群训练 + 牵引治疗', sessions: '第 10 次（累计 10 次）', efficacy: 'ODI 评分由 35 分降至 25 分（有进步），腰痛明显缓解', therapist: '周***（康复治疗师）' },
    { id: 'RR-005', patient: '吴***（男，60 岁，冠心病 PCI 术后）', therapyItem: '心脏康复 — 有氧运动（步行）+ 抗阻训练（弹力带）', sessions: '第 4 次（累计 4 次）', efficacy: '代谢当量由 4 METs 提升至 5 METs（有进步），无胸闷胸痛发作', therapist: '郑***（心脏康复治疗师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m331Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/rehab/assessments', handle: handleRehabAssessments, auth: true },
  { method: 'GET', path: '/api/v1/rehab/records', handle: handleRehabRecords, auth: true },
];
