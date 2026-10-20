/**
 * 健澜科技 jlmedaios - M310 妇幼保健域
 *
 * 产前检查/分娩记录/产后访视/新生儿体检/新生儿筛查/生长发育
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/maternity/prenatal - 产前检查 5 条 */
async function handleMaternityPrenatal(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MP-001', mother: '赵***（28 岁）', gestationalWeek: '24 周', examItems: '四维彩超+OGTT 糖耐量', result: '胎儿发育正常，血糖正常（4.8mmol/L）', doctor: '产科 周***主治医师' },
    { id: 'MP-002', mother: '钱***（32 岁）', gestationalWeek: '32 周', examItems: '胎心监护+血常规', result: '胎心监护反应型，血红蛋白 115g/L（轻度贫血）', doctor: '产科 李***副主任医师' },
    { id: 'MP-003', mother: '孙***（26 岁）', gestationalWeek: '20 周', examItems: '常规产检+唐氏筛查', result: '唐氏筛查低风险，胎儿大小符合孕周', doctor: '产科 陈***主治医师' },
    { id: 'MP-004', mother: '周***（35 岁）', gestationalWeek: '28 周', examItems: 'B 超+肝肾功能', result: '胎位正常，肝肾功能正常', doctor: '产科 王***主任医师' },
    { id: 'MP-005', mother: '吴***（29 岁）', gestationalWeek: '36 周', examItems: '胎心监护+阴道分泌物', result: '胎心监护反应型，分泌物正常', doctor: '产科 周***主治医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maternity/delivery - 分娩记录 5 条 */
async function handleMaternityDelivery(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MD-001', mother: '赵***（28 岁）', deliveryType: '顺产（头位）', time: '2026-10-15 08:30', babyWeight: '3,250g（男婴）', doctor: '产科 周***主治医师' },
    { id: 'MD-002', mother: '钱***（32 岁）', deliveryType: '剖宫产（瘢痕子宫）', time: '2026-10-16 10:00', babyWeight: '3,500g（女婴）', doctor: '产科 李***副主任医师' },
    { id: 'MD-003', mother: '孙***（26 岁）', deliveryType: '顺产（头位，侧切）', time: '2026-10-17 14:20', babyWeight: '3,100g（男婴）', doctor: '产科 陈***主治医师' },
    { id: 'MD-004', mother: '周***（35 岁）', deliveryType: '顺产（无痛分娩）', time: '2026-10-18 22:15', babyWeight: '3,300g（女婴）', doctor: '产科 王***主任医师' },
    { id: 'MD-005', mother: '吴***（29 岁）', deliveryType: '顺产（头位）', time: '2026-10-19 06:45', babyWeight: '2,950g（男婴）', doctor: '产科 周***主治医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maternity/postpartum - 产后访视 5 条 */
async function handleMaternityPostpartum(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MP-001', mother: '赵***（28 岁）', visitTime: '产后第 7 天（2026-10-22）', recovery: '子宫复旧良好，恶露正常，伤口愈合佳', guideDoctor: '社区医生 林***主治医师' },
    { id: 'MP-002', mother: '钱***（32 岁）', visitTime: '产后第 3 天（2026-10-19）', recovery: '剖宫产伤口干燥无渗液，乳汁分泌正常', guideDoctor: '产科随访护士 吴***护师' },
    { id: 'MP-003', mother: '孙***（26 岁）', visitTime: '产后第 14 天（2026-10-31）', recovery: '子宫复旧良好，情绪稳定，母乳喂养指导', guideDoctor: '社区医生 林***主治医师' },
    { id: 'MP-004', mother: '周***（35 岁）', visitTime: '产后第 5 天（2026-10-23）', recovery: '无痛分娩后恢复良好，睡眠正常', guideDoctor: '产科随访护士 郑***护师' },
    { id: 'MP-005', mother: '吴***（29 岁）', visitTime: '产后第 30 天（2026-11-18）', recovery: '产后 42 天复查预约中，恢复良好', guideDoctor: '社区医生 林***主治医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/newborn/physical - 新生儿体检 5 条 */
async function handleNewbornPhysical(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NP-001', baby: '男婴（赵***之子）', weight: '3,250g → 3,400g（生理性下降后回升）', length: '50 cm', headCircumference: '34 cm', assessment: 'Apgar 评分 10 分，健康' },
    { id: 'NP-002', baby: '女婴（钱***之女）', weight: '3,500g → 3,450g', length: '51 cm', headCircumference: '35 cm', assessment: 'Apgar 评分 10 分，健康' },
    { id: 'NP-003', baby: '男婴（孙***之子）', weight: '3,100g → 3,150g', length: '49 cm', headCircumference: '33.5 cm', assessment: 'Apgar 评分 9 分，健康' },
    { id: 'NP-004', baby: '女婴（周***之女）', weight: '3,300g → 3,350g', length: '50 cm', headCircumference: '34 cm', assessment: 'Apgar 评分 10 分，健康' },
    { id: 'NP-005', baby: '男婴（吴***之子）', weight: '2,950g → 3,000g', length: '48 cm', headCircumference: '33 cm', assessment: 'Apgar 评分 10 分，健康' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/newborn/screening - 新生儿筛查 5 条 */
async function handleNewbornScreening(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NS-001', baby: '男婴（赵***之子）', screeningItem: '新生儿遗传代谢病筛查（足底血）', result: 'TSH/PKU/CAH/G6PD 均阴性', time: '2026-10-17（出生 72h 后）', doctor: '新生儿科 吴***主治医师' },
    { id: 'NS-002', baby: '女婴（钱***之女）', screeningItem: '听力筛查（耳声发射）', result: '双耳通过', time: '2026-10-18（出生 48h 后）', doctor: '新生儿科 吴***主治医师' },
    { id: 'NS-003', baby: '男婴（孙***之子）', screeningItem: '先天性心脏病筛查（血氧饱和度）', result: '筛查通过', time: '2026-10-19（出生 24h 后）', doctor: '新生儿科 陈***副主任医师' },
    { id: 'NS-004', baby: '女婴（周***之女）', screeningItem: '新生儿遗传代谢病筛查（足底血）', result: 'TSH/PKU/CAH/G6PD 均阴性', time: '2026-10-20（出生 72h 后）', doctor: '新生儿科 吴***主治医师' },
    { id: 'NS-005', baby: '男婴（吴***之子）', screeningItem: '听力筛查（耳声发射）', result: '双耳通过', time: '2026-10-21（出生 48h 后）', doctor: '新生儿科 吴***主治医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/newborn/growth - 生长发育 5 条 */
async function handleNewbornGrowth(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NG-001', baby: '男婴（赵***之子）', age: '1 月龄', weight: '4.2 kg', height: '54 cm', assessment: '体重/身长均在 50-75 百分位，发育正常' },
    { id: 'NG-002', baby: '女婴（钱***之女）', age: '2 月龄', weight: '5.0 kg', height: '58 cm', assessment: '体重/身长均在 75-90 百分位，发育良好' },
    { id: 'NG-003', baby: '男婴（孙***之子）', age: '3 月龄', weight: '6.0 kg', height: '62 cm', assessment: '体重/身长均在 50-75 百分位，发育正常' },
    { id: 'NG-004', baby: '女婴（周***之女）', age: '4 月龄', weight: '6.8 kg', height: '65 cm', assessment: '体重/身长均在 75-90 百分位，发育良好' },
    { id: 'NG-005', baby: '男婴（吴***之子）', age: '6 月龄', weight: '7.5 kg', height: '68 cm', assessment: '体重/身长均在 50-75 百分位，已能独坐' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m310Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/maternity/prenatal', handle: handleMaternityPrenatal, auth: true },
  { method: 'GET', path: '/api/v1/maternity/delivery', handle: handleMaternityDelivery, auth: true },
  { method: 'GET', path: '/api/v1/maternity/postpartum', handle: handleMaternityPostpartum, auth: true },
  { method: 'GET', path: '/api/v1/newborn/physical', handle: handleNewbornPhysical, auth: true },
  { method: 'GET', path: '/api/v1/newborn/screening', handle: handleNewbornScreening, auth: true },
  { method: 'GET', path: '/api/v1/newborn/growth', handle: handleNewbornGrowth, auth: true },
];
