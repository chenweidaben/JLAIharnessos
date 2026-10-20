/**
 * 健澜科技 jlmedaios - M372 P1 业务扩展：妇幼保健深度打磨
 *
 * 产前检查/产后访视/婴幼儿保健/儿童预防接种/妇女保健/出生缺陷筛查
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/maternity/prenatal-care - 产前检查 5 条 */
async function handleMaternityPrenatalCare(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MPC-001', pregnantWoman: '王***（28 岁孕妇）', gestationalWeek: '12 周（孕早期）', examinationItem: 'NT 检查（胎儿颈项透明层厚度）', result: 'NT 1.5mm（正常范围 < 2.5mm）', doctor: '李***（产科主治医师）' },
    { id: 'MPC-002', pregnantWoman: '张***（32 岁孕妇）', gestationalWeek: '20 周（孕中期）', examinationItem: '大排畸超声（胎儿系统超声检查）', result: '胎儿发育正常，未见明显结构异常', doctor: '赵***（产科副主任医师）' },
    { id: 'MPC-003', pregnantWoman: '刘***（25 岁孕妇）', gestationalWeek: '24 周（孕中期）', examinationItem: '糖耐量试验（OGTT）', result: '空腹血糖 4.5 mmol/L、餐后 1 小时 8.5 mmol/L、餐后 2 小时 7.0 mmol/L（均正常）', doctor: '孙***（产科主治医师）' },
    { id: 'MPC-004', pregnantWoman: '陈***（30 岁孕妇）', gestationalWeek: '32 周（孕晚期）', examinationItem: '胎心监护（NST）', result: '胎心监护反应型（正常）', doctor: '周***（产科副主任医师）' },
    { id: 'MPC-005', pregnantWoman: '杨***（27 岁孕妇）', gestationalWeek: '36 周（孕晚期）', examinationItem: 'B 族链球菌筛查（GBS）', result: 'GBS 阴性（正常）', doctor: '吴***（产科主治医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maternity/postnatal-care - 产后访视 5 条 */
async function handleMaternityPostnatalCare(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MPOC-001', postnatalWoman: '王***（28 岁产妇）', postnatalDays: '产后 3 天（出院后访视）', visitContent: '产妇一般情况（体温、血压、伤口愈合情况）+ 新生儿一般情况（体温、体重、喂养情况）', result: '产妇恢复良好，伤口愈合良好；新生儿体重 3.2kg，母乳喂养良好', visitor: '社区护士张***（上门访视）' },
    { id: 'MPOC-002', postnatalWoman: '张***（32 岁产妇）', postnatalDays: '产后 7 天（社区访视）', visitContent: '产妇子宫复旧情况 + 新生儿黄疸情况', result: '产妇子宫复旧良好；新生儿黄疸轻度（生理性黄疸，无需特殊处理）', visitor: '社区医生李***（上门访视）' },
    { id: 'MPOC-003', postnatalWoman: '刘***（25 岁产妇）', postnatalDays: '产后 14 天（社区访视）', visitContent: '产妇伤口愈合情况 + 新生儿脐带脱落情况', result: '产妇伤口愈合良好；新生儿脐带已脱落，无感染', visitor: '社区护士王***（上门访视）' },
    { id: 'MPOC-004', postnatalWoman: '陈***（30 岁产妇）', postnatalDays: '产后 28 天（满月访视）', visitContent: '产妇全面体检 + 新生儿全面体检', result: '产妇恢复良好；新生儿体重 4.0kg，发育正常', visitor: '社区医生赵***（上门访视）' },
    { id: 'MPOC-005', postnatalWoman: '杨***（27 岁产妇）', postnatalDays: '产后 42 天（产后复查）', visitContent: '产妇妇科检查（子宫复旧情况）+ 新生儿生长发育评估', result: '产妇子宫复旧良好；新生儿生长发育评估正常', visitor: '产科主治医师吴***（门诊复查）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maternity/infant-care - 婴幼儿保健 5 条 */
async function handleMaternityInfantCare(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MIC-001', infantName: '王***之子（3 个月婴儿）', age: '3 月龄', examinationItem: '常规体检（体重、身长、头围、心肺听诊）', result: '体重 6.0kg（正常）、身长 62cm（正常）、头围 40cm（正常）', doctor: '儿科主治医师李***' },
    { id: 'MIC-002', infantName: '张***之女（6 个月婴儿）', age: '6 月龄', examinationItem: '常规体检 + 血红蛋白检测', result: '体重 7.5kg（正常）、身长 68cm（正常）、血红蛋白 110g/L（正常）', doctor: '儿科副主任医师赵***' },
    { id: 'MIC-003', infantName: '刘***之子（9 个月婴儿）', age: '9 月龄', examinationItem: '常规体检 + 发育评估（大运动、精细运动、语言发育）', result: '体重 8.5kg（正常）、身长 72cm（正常）、发育评估正常', doctor: '儿科主治医师孙***' },
    { id: 'MIC-004', infantName: '陈***之女（12 个月婴儿）', age: '12 月龄（1 岁）', examinationItem: '常规体检 + 发育评估 + 血常规检测', result: '体重 9.5kg（正常）、身长 75cm（正常）、发育评估正常、血常规正常', doctor: '儿科副主任医师周***' },
    { id: 'MIC-005', infantName: '杨***之子（18 个月幼儿）', age: '18 月龄（1 岁半）', examinationItem: '常规体检 + 发育评估 + 听力筛查', result: '体重 11.0kg（正常）、身长 82cm（正常）、发育评估正常、听力筛查正常', doctor: '儿科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maternity/child-vaccination - 儿童预防接种 5 条 */
async function handleMaternityChildVaccination(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MCV-001', childName: '王***之子（3 个月婴儿）', vaccineName: '卡介苗（出生时接种）', vaccinationTime: '2026-07-20（出生时接种）', site: '左上臂三角肌外侧皮内注射', status: '已接种（接种后无不良反应）' },
    { id: 'MCV-002', childName: '张***之女（6 个月婴儿）', vaccineName: '乙肝疫苗第 3 剂（0-1-6 月龄程序）', vaccinationTime: '2026-10-15（6 月龄接种）', site: '右上臂三角肌肌内注射', status: '已接种（接种后无不良反应）' },
    { id: 'MCV-003', childName: '刘***之子（9 个月婴儿）', vaccineName: '麻腮风疫苗第 1 剂（8 月龄接种）', vaccinationTime: '2026-09-20（8 月龄接种）', site: '上臂三角肌皮下注射', status: '已接种（接种后无不良反应）' },
    { id: 'MCV-004', childName: '陈***之女（12 个月婴儿）', vaccineName: '乙脑疫苗第 1 剂（8 月龄接种）', vaccinationTime: '2026-09-10（8 月龄接种）', site: '上臂三角肌皮下注射', status: '已接种（接种后无不良反应）' },
    { id: 'MCV-005', childName: '杨***之子（18 个月幼儿）', vaccineName: '百白破疫苗第 4 剂（18-24 月龄加强）', vaccinationTime: '2026-10-10（18 月龄接种）', site: '右上臂三角肌肌内注射', status: '已接种（接种后无不良反应）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maternity/women-health - 妇女保健 5 条 */
async function handleMaternityWomenHealth(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MWH-001', womanName: '李***（35 岁女性）', age: '35 岁', examinationItem: '宫颈癌筛查（TCT + HPV 检测）', result: 'TCT 正常（未见上皮内病变或恶性细胞）、HPV 阴性', doctor: '妇科主治医师张***' },
    { id: 'MWH-002', womanName: '王***（40 岁女性）', age: '40 岁', examinationItem: '乳腺癌筛查（乳腺超声 + 钼靶）', result: '乳腺超声正常（未见占位性病变）、钼靶正常（未见钙化灶）', doctor: '乳腺外科副主任医师赵***' },
    { id: 'MWH-003', womanName: '张***（45 岁女性）', age: '45 岁', examinationItem: '妇科常规检查（妇科内诊 + 白带常规）', result: '妇科内诊正常、白带常规正常（未见异常）', doctor: '妇科主治医师孙***' },
    { id: 'MWH-004', womanName: '刘***（50 岁女性）', age: '50 岁（围绝经期）', examinationItem: '围绝经期保健检查（性激素六项 + 骨密度检测）', result: '性激素六项提示围绝经期改变（FSH 升高、E2 下降）、骨密度正常（T 值 -1.5）', doctor: '妇科副主任医师周***' },
    { id: 'MWH-005', womanName: '陈***（55 岁女性）', age: '55 岁（绝经后）', examinationItem: '绝经后保健检查（妇科超声 + 肿瘤标志物检测）', result: '妇科超声正常（子宫、卵巢未见异常）、肿瘤标志物正常（CEA、CA125、CA153 均正常）', doctor: '妇科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maternity/genetic-screening - 出生缺陷筛查 5 条 */
async function handleMaternityGeneticScreening(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MGS-001', pregnantWoman: '王***（28 岁孕妇）', screeningItem: '唐氏筛查（孕中期血清学筛查）', result: '21-三体风险值 1:5000（低风险，临界值 1:270）', riskLevel: '低风险', doctor: '产前诊断中心主治医师李***' },
    { id: 'MGS-002', pregnantWoman: '张***（32 岁孕妇）', screeningItem: '无创 DNA 检测（NIPT）', result: '21-三体、18-三体、13-三体均为低风险', riskLevel: '低风险', doctor: '产前诊断中心副主任医师赵***' },
    { id: 'MGS-003', pregnantWoman: '刘***（25 岁孕妇）', screeningItem: '唐氏筛查（孕中期血清学筛查）', result: '21-三体风险值 1:1000（低风险，临界值 1:270）', riskLevel: '低风险', doctor: '产前诊断中心主治医师孙***' },
    { id: 'MGS-004', pregnantWoman: '陈***（30 岁孕妇）', screeningItem: '无创 DNA 检测（NIPT）', result: '21-三体、18-三体、13-三体均为低风险', riskLevel: '低风险', doctor: '产前诊断中心副主任医师周***' },
    { id: 'MGS-005', pregnantWoman: '杨***（27 岁孕妇）', screeningItem: '地贫筛查（地中海贫血筛查）', result: 'HbA2 2.5%（正常范围 2.5%-3.5%）', riskLevel: '正常（未见地中海贫血）', doctor: '产前诊断中心主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m372Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/maternity/prenatal-care', handle: handleMaternityPrenatalCare, auth: true },
  { method: 'GET', path: '/api/v1/maternity/postnatal-care', handle: handleMaternityPostnatalCare, auth: true },
  { method: 'GET', path: '/api/v1/maternity/infant-care', handle: handleMaternityInfantCare, auth: true },
  { method: 'GET', path: '/api/v1/maternity/child-vaccination', handle: handleMaternityChildVaccination, auth: true },
  { method: 'GET', path: '/api/v1/maternity/women-health', handle: handleMaternityWomenHealth, auth: true },
  { method: 'GET', path: '/api/v1/maternity/genetic-screening', handle: handleMaternityGeneticScreening, auth: true },
];
