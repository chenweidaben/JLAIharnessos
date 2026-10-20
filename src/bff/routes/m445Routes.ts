/**
 * 健澜科技 jlmedaios - M445 临床营养与膳食管理（nutrition / diet）
 *
 * 膳食医嘱 / 食谱配餐 / 特殊膳食 / 食堂食材库存 / 送餐配送
 * （assessments 营养评估已存在，此处不重复）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nutrition/diet-orders - 膳食医嘱（住院号/膳食类型/热量蛋白/开嘱医生/状态）5 条 */
async function handleNutDietOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NDO-001', inpatientNo: '住院号：INP-2026-3301（心内科张***）', dietType: '膳食类型：普通软食（低盐低脂，冠心病适用）', calorie: '热量/蛋白：每日 1800kcal，蛋白质 65g（个体化配给）', doctor: '开嘱医生：王*** 主任医师（联合营养科）', status: '状态：执行中（按日配餐，已送达）' },
    { id: 'NDO-002', inpatientNo: '住院号：INP-2026-3388（内分泌李***）', dietType: '膳食类型：糖尿病餐（低 GI、定量主食）', calorie: '热量/蛋白：每日 1600kcal，蛋白质 70g', doctor: '开嘱医生：刘*** 主治医师', status: '状态：执行中（配合血糖监测）' },
    { id: 'NDO-003', inpatientNo: '住院号：INP-2026-3456（骨科王***，术后）', dietType: '膳食类型：高蛋白半流质（术后愈合促进）', calorie: '热量/蛋白：每日 2000kcal，蛋白质 90g（高蛋白支持）', doctor: '开嘱医生：赵*** 主任医师', status: '状态：执行中' },
    { id: 'NDO-004', inpatientNo: '住院号：INP-2026-3502（产科赵***，产后）', dietType: '膳食类型：月子营养餐（均衡催乳，少油少盐）', calorie: '热量/蛋白：每日 2100kcal，蛋白质 85g', doctor: '开嘱医生：周*** 副主任医师', status: '状态：已停嘱（出院停膳，归档）' },
    { id: 'NDO-005', inpatientNo: '住院号：INP-2026-3412（普外科陈***，禁食观察）', dietType: '膳食类型：禁食医嘱（术后胃肠减压期间）', calorie: '热量/蛋白：暂不禁食外营养，待评估后启动肠内营养', doctor: '开嘱医生：孙*** 主治医师', status: '状态：待启动（医嘱已开，待营养科复评）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nutrition/recipes - 食谱配餐（餐次/菜品/营养成分/适用人群/批次）5 条 */
async function handleNutRecipes(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NRC-001', meal: '餐次：早餐（7:30 配餐）', dish: '菜品：杂粮粥 + 水煮蛋 + 清炒时蔬 + 全麦馒头', nutrition: '营养成分：约 420kcal，蛋白质 18g，低油低盐', target: '适用人群：普通住院患者通用餐', batch: '批次：2026-10-20 早班（编号 RC-B-01）' },
    { id: 'NRC-002', meal: '餐次：午餐（11:30 配餐）', dish: '菜品：清蒸鲈鱼 + 番茄炒蛋 + 糙米饭 + 冬瓜汤', nutrition: '营养成分：约 680kcal，蛋白质 32g，均衡搭配', target: '适用人群：高蛋白术后愈合人群', batch: '批次：2026-10-20 午班（RC-L-02）' },
    { id: 'NRC-003', meal: '餐次：晚餐（17:30 配餐）', dish: '菜品：鸡胸肉炒西兰花 + 荞麦面 + 凉拌黄瓜', nutrition: '营养成分：约 560kcal，蛋白质 28g，低脂控糖', target: '适用人群：糖尿病/减脂人群', batch: '批次：2026-10-20 晚班（RC-D-03）' },
    { id: 'NRC-004', meal: '餐次：加餐（15:00 加餐）', dish: '菜品：无糖酸奶 + 混合坚果（小份）', nutrition: '营养成分：约 180kcal，蛋白质 9g，补充能量', target: '适用人群：产后/术后需加餐人群', batch: '批次：2026-10-20 加餐批（RC-S-04）' },
    { id: 'NRC-005', meal: '餐次：夜间流食（21:00 营养液）', dish: '菜品：匀浆膳/要素膳 200mL（管饲/流质）', nutrition: '营养成分：约 250kcal，蛋白质 10g（肠内营养支持）', target: '适用人群：不能经口进食/鼻饲患者', batch: '批次：2026-10-20 夜班（RC-N-05）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nutrition/special-diets - 特殊膳食（患者/要素膳/糖尿病餐/流质/审批）5 条 */
async function handleNutSpecialDiets(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NSD-001', patient: '患者：王***（骨科术后，鼻饲过渡）', elemental: '要素膳：短肽型要素膳 500mL/日（管饲分次泵入）', dmMeal: '糖尿病餐：否（非糖尿病专项）', liquid: '流质：已由半流质过渡至软食', approval: '审批：营养科会诊审批通过（NSD 审批单 001）' },
    { id: 'NSD-002', patient: '患者：李***（2 型糖尿病，住院）', elemental: '要素膳：否（经口进食为主）', dmMeal: '糖尿病餐：是（低 GI 定量，三餐定时）', liquid: '流质：否（普通软食）', approval: '审批：营养科 + 内分泌科双签通过' },
    { id: 'NSD-003', patient: '患者：陈***（普外科术后，胃肠功能未恢复）', elemental: '要素膳：百普力等短肽制剂，2 次/日', dmMeal: '糖尿病餐：否', liquid: '流质：清流食过渡（无渣，逐步加稠）', approval: '审批：营养科审批中（待主治医师确认耐受）' },
    { id: 'NSD-004', patient: '患者：赵***（产科产后，哺乳）', elemental: '要素膳：否（正常经口）', dmMeal: '糖尿病餐：否（产后营养均衡餐）', liquid: '流质：否', approval: '审批：已通过（常规月子餐审批）' },
    { id: 'NSD-005', patient: '患者：孙***（吞咽障碍，卒中后）', elemental: '要素膳：匀浆膳增稠，防误吸配方', dmMeal: '糖尿病餐：按合并糖尿病配合', liquid: '流质：稠厚流质（增稠剂调配）', approval: '审批：康复科 + 营养科联合审批通过' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/diet/stock - 食堂食材库存（品类/库存/效期/库位/预警）5 条 */
async function handleDietStock(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DST-001', category: '品类：鲜鸡蛋（早餐蛋类）', stock: '库存：180 枚（安全库存 150 枚）', expiry: '效期：2026-10-23（冷藏 0-4℃）', location: '库位：冷库 A-02 蛋品区', warn: '预警：正常（库存充足）' },
    { id: 'DST-002', category: '品类：大米/粳米（主食）', stock: '库存：320kg（安全库存 200kg）', expiry: '效期：2026-12-30（常温干燥）', location: '库位：干仓库 B-01 米面区', warn: '预警：正常' },
    { id: 'DST-003', category: '品类：绿叶蔬菜（当日鲜采）', stock: '库存：46kg（周转快，日清）', expiry: '效期：当日用完（2026-10-20 当日）', location: '库位：保鲜库 C-03 叶菜区', warn: '预警：临期（当日须出清，避免浪费）' },
    { id: 'DST-004', category: '品类：冷冻鱼虾（蛋白类）', stock: '库存：85kg（安全库存 60kg）', expiry: '效期：2027-03-15（冷冻 -18℃）', location: '库位：冻品库 D-02 水产区', warn: '预警：正常' },
    { id: 'DST-005', category: '品类：调味品（食用油/酱料）', stock: '库存：食用油 40 桶（安全库存 25 桶）', expiry: '效期：2027-01-10（避光常温）', location: '库位：干仓库 B-05 调料区', warn: '预警：库存偏低，建议补货（接近安全库存）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/diet/deliveries - 送餐配送（住院号/餐次/配送人/送达时间/签收）5 条 */
async function handleDietDeliveries(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DDL-001', inpatientNo: '住院号：INP-2026-3301（心内科 3 床张***）', meal: '餐次：2026-10-20 午餐（低盐低脂软食）', deliverer: '配送人：食堂送餐员 马***（餐车编号 D-07）', deliverTime: '送达时间：11:42（按线路逐层配送）', signed: '签收：患者/陪护已签收，餐食完好' },
    { id: 'DDL-002', inpatientNo: '住院号：INP-2026-3388（内分泌 8 床李***）', meal: '餐次：2026-10-20 晚餐（糖尿病餐）', deliverer: '配送人：送餐员 马***', deliverTime: '送达时间：17:48', signed: '签收：已签收（需核对低糖主食是否足量）' },
    { id: 'DDL-003', inpatientNo: '住院号：INP-2026-3456（骨科 12 床王***）', meal: '餐次：2026-10-20 早餐（高蛋白半流质）', deliverer: '配送人：送餐员 高***（D-09）', deliverTime: '送达时间：07:55', signed: '签收：已签收（附营养科注意事项说明）' },
    { id: 'DDL-004', inpatientNo: '住院号：INP-2026-3412（普外科 6 床陈***）', meal: '餐次：2026-10-20 夜间要素膳管饲液', deliverer: '配送人：营养科配送 林***（专用保温箱）', deliverTime: '送达时间：21:05（护士站交接）', signed: '签收：护士交接签收，记录管饲时间' },
    { id: 'DDL-005', inpatientNo: '住院号：INP-2026-3502（产科 20 床赵***）', meal: '餐次：2026-10-20 加餐（产后无糖酸奶加餐）', deliverer: '配送人：送餐员 高***', deliverTime: '送达时间：15:10', signed: '签收：已签收（产后加餐已送达）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m445Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nutrition/diet-orders', handle: handleNutDietOrders, auth: true },
  { method: 'GET', path: '/api/v1/nutrition/recipes', handle: handleNutRecipes, auth: true },
  { method: 'GET', path: '/api/v1/nutrition/special-diets', handle: handleNutSpecialDiets, auth: true },
  { method: 'GET', path: '/api/v1/diet/stock', handle: handleDietStock, auth: true },
  { method: 'GET', path: '/api/v1/diet/deliveries', handle: handleDietDeliveries, auth: true },
];
