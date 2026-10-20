/**
 * 健澜科技 jlmedaios - M314 老年医学域
 *
 * 老年综合评估/衰弱评估/跌倒评估/痴呆筛查/营养评估/老年综合征
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/elderly/assessment - 老年综合评估 5 条 */
async function handleElderlyAssessment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EA-001', patient: '王***（男，75 岁）', item: 'ADL（日常生活活动能力）', score: 'Barthel 指数 85 分', grade: '轻度依赖', assessor: '老年科 李***主任医师' },
    { id: 'EA-002', patient: '李***（女，72 岁）', item: 'IADL（工具性日常生活活动能力）', score: 'Lawton 量表 6 分（满分 8 分）', grade: '中度依赖', assessor: '老年科 陈***副主任医师' },
    { id: 'EA-003', patient: '张***（男，80 岁）', item: '认知功能（MMSE）', score: 'MMSE 22 分（满分 30 分）', grade: '轻度认知障碍', assessor: '老年科 王***主治医师' },
    { id: 'EA-004', patient: '赵***（女，68 岁）', item: '抑郁筛查（GDS-15）', score: 'GDS-15 4 分（满分 15 分）', grade: '无抑郁', assessor: '老年科 刘***主治医师' },
    { id: 'EA-005', patient: '孙***（男，85 岁）', item: '生活质量（QOL-AD）', score: 'QOL-AD 32 分（满分 52 分）', grade: '中等生活质量', assessor: '老年科 周***副主任医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/elderly/frail - 衰弱评估 5 条 */
async function handleElderlyFrail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EF-001', patient: '王***（男，75 岁）', indicators: '体重下降（近 1 年 >5%）+ 疲劳感 + 握力下降 + 步速减慢 + 体力活动减少', score: 'FRAIL 量表 4 分（满分 5 分）', grade: '衰弱前期', advice: '建议增加营养摄入+规律有氧运动+定期复查' },
    { id: 'EF-002', patient: '李***（女，72 岁）', indicators: '疲劳感 + 步速减慢', score: 'FRAIL 量表 2 分', grade: '衰弱前期', advice: '建议增加蛋白质摄入+抗阻训练' },
    { id: 'EF-003', patient: '张***（男，80 岁）', indicators: '体重下降 + 疲劳感 + 握力下降 + 步速减慢 + 体力活动减少', score: 'FRAIL 量表 5 分', grade: '衰弱期', advice: '建议营养支持+康复训练+多重用药评估+家属照护指导' },
    { id: 'EF-004', patient: '赵***（女，68 岁）', indicators: '无异常', score: 'FRAIL 量表 0 分', grade: '健康（非衰弱）', advice: '保持现有生活方式+每年定期体检' },
    { id: 'EF-005', patient: '孙***（男，85 岁）', indicators: '体重下降 + 疲劳感 + 握力下降 + 步速减慢', score: 'FRAIL 量表 4 分', grade: '衰弱前期', advice: '建议增加营养+康复训练+预防跌倒' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/elderly/falls - 跌倒评估 5 条 */
async function handleElderlyFalls(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EF-001', patient: '王***（男，75 岁）', risk: '高跌倒风险（Morse 评分 55 分）', factors: '平衡功能下降+服用降压药+夜间起夜多+室内光线不足', intervention: '使用助行器+调整降压药+夜间小夜灯+家居环境改造', doctor: '老年科 李***主任医师' },
    { id: 'EF-002', patient: '李***（女，72 岁）', risk: '中跌倒风险（Morse 评分 35 分）', factors: '服用安眠药+步态不稳', intervention: '调整安眠药+步态训练+家居防滑处理', doctor: '老年科 陈***副主任医师' },
    { id: 'EF-003', patient: '张***（男，80 岁）', risk: '高跌倒风险（Morse 评分 65 分）', factors: '认知障碍+体位性低血压+下肢肌力下降+既往跌倒史', intervention: '家属陪护+起床三部曲+下肢肌力训练+防跌倒手环', doctor: '老年科 王***主治医师' },
    { id: 'EF-004', patient: '赵***（女，68 岁）', risk: '低跌倒风险（Morse 评分 20 分）', factors: '无明显危险因素', intervention: '定期评估+健康教育', doctor: '老年科 刘***主治医师' },
    { id: 'EF-005', patient: '孙***（男，85 岁）', risk: '高跌倒风险（Morse 评分 60 分）', factors: '衰弱+视力下降+听力下降+服用多种药物', intervention: '助行器+视力矫正+药物重整+24 小时陪护', doctor: '老年科 周***副主任医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/elderly/dementia - 痴呆筛查 5 条 */
async function handleElderlyDementia(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ED-001', patient: '王***（男，75 岁）', tool: 'MMSE（简易精神状态检查）', score: 'MMSE 24 分（中学文化， cutoff 26 分）', grade: '轻度认知障碍（MCI）', advice: '建议进一步行 MoCA+头颅 MRI 检查+认知训练' },
    { id: 'ED-002', patient: '李***（女，72 岁）', tool: 'MoCA（蒙特利尔认知评估）', score: 'MoCA 20 分（满分 30 分）', grade: '轻度痴呆（CDR 1 级）', advice: '建议多奈哌齐治疗+认知训练+家属照护指导' },
    { id: 'ED-003', patient: '张***（男，80 岁）', tool: 'MMSE + ADL', score: 'MMSE 15 分 + Barthel 40 分', grade: '中度痴呆（CDR 2 级）', advice: '建议卡巴拉汀治疗+康复训练+日间照护中心' },
    { id: 'ED-004', patient: '赵***（女，68 岁）', tool: 'MMSE', score: 'MMSE 28 分（大学文化）', grade: '认知功能正常', advice: '保持脑力活动+每年定期筛查' },
    { id: 'ED-005', patient: '孙***（男，85 岁）', tool: 'MMSE + NPI', score: 'MMSE 10 分 + NPI 15 分', grade: '重度痴呆（CDR 3 级）+ 精神行为症状', advice: '建议美金刚治疗+精神症状管理+临终关怀讨论' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/elderly/nutrition - 营养评估 5 条 */
async function handleElderlyNutrition(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EN-001', patient: '王***（男，75 岁）', indicator: 'MNA-SF（迷你营养评估简表）', score: 'MNA-SF 10 分（满分 14 分）', risk: '存在营养不良风险', advice: '建议增加优质蛋白摄入+口服营养补充（ONS）+每月复查体重' },
    { id: 'EN-002', patient: '李***（女，72 岁）', indicator: 'MNA-SF', score: 'MNA-SF 12 分', risk: '正常营养状态', advice: '保持均衡饮食+每年定期评估' },
    { id: 'EN-003', patient: '张***（男，80 岁）', indicator: 'MNA-SF + 白蛋白', score: 'MNA-SF 7 分 + 白蛋白 30g/L', risk: '营养不良', advice: '建议肠内营养支持+营养科会诊+每周监测体重' },
    { id: 'EN-004', patient: '赵***（女，68 岁）', indicator: 'MNA-SF', score: 'MNA-SF 13 分', risk: '正常营养状态', advice: '保持现有饮食习惯' },
    { id: 'EN-005', patient: '孙***（男，85 岁）', indicator: 'MNA-SF + BMI', score: 'MNA-SF 8 分 + BMI 17.5 kg/m²', risk: '营养不良（消瘦）', advice: '建议高蛋白高热量饮食+ONS+必要时管饲营养' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/elderly/comprehensive - 老年综合征 5 条 */
async function handleElderlyComprehensive(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EC-001', patient: '王***（男，75 岁）', syndromeType: '多重用药（polypharmacy）', manifestation: '同时服用 8 种药物（降压+降糖+降脂+抗凝+止痛+安眠药等）', intervention: '药物重整（删减 2 种不必要药物）+用药宣教+定期复查', doctor: '老年科 李***主任医师' },
    { id: 'EC-002', patient: '李***（女，72 岁）', syndromeType: '尿失禁', manifestation: '压力性尿失禁（咳嗽/打喷嚏时漏尿，每日 2-3 次）', intervention: '盆底肌训练+生活方式调整+必要时药物治疗', doctor: '老年科 陈***副主任医师' },
    { id: 'EC-003', patient: '张***（男，80 岁）', syndromeType: '睡眠障碍', manifestation: '入睡困难+夜间易醒+白天嗜睡（每晚睡眠约 4 小时）', intervention: '睡眠卫生教育+认知行为治疗（CBT-I）+调整安眠药', doctor: '老年科 王***主治医师' },
    { id: 'EC-004', patient: '赵***（女，68 岁）', syndromeType: '便秘', manifestation: '每周排便 2 次，粪便干结，需用力排便', intervention: '增加膳食纤维+饮水量+规律运动+必要时缓泻剂', doctor: '老年科 刘***主治医师' },
    { id: 'EC-005', patient: '孙***（男，85 岁）', syndromeType: '压疮（II 期）', manifestation: '骶尾部 3cm×2cm 发红区（皮肤完整，压之不褪色）', intervention: '定时翻身（q2h）+气垫床+局部保护敷料+营养支持', doctor: '老年科 周***副主任医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m314Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/elderly/assessment', handle: handleElderlyAssessment, auth: true },
  { method: 'GET', path: '/api/v1/elderly/frail', handle: handleElderlyFrail, auth: true },
  { method: 'GET', path: '/api/v1/elderly/falls', handle: handleElderlyFalls, auth: true },
  { method: 'GET', path: '/api/v1/elderly/dementia', handle: handleElderlyDementia, auth: true },
  { method: 'GET', path: '/api/v1/elderly/nutrition', handle: handleElderlyNutrition, auth: true },
  { method: 'GET', path: '/api/v1/elderly/comprehensive', handle: handleElderlyComprehensive, auth: true },
];
