/**
 * 健澜科技 jlmedaios - M444 院感监测与质量控制深度（infection / quality）
 *
 * 手卫生依从 / 环境卫生学监测 / 抗菌药物使用监测 / 不良事件
 * （surveillance 感染监测、indicators 质控指标已存在，此处不重复）。
 * 聚焦院感专控与不良事件，不重复护理 NQI 口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/infection/hand-hygiene - 手卫生依从（科室/时机/执行/未执行/依从率）5 条 */
async function handleInfHandHygiene(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IHH-001', dept: '科室：ICU（重症医学科）', moment: '时机：接触患者前/无菌操作前/接触体液后/接触患者后/接触环境后（五时机）', done: '执行：186 次手卫生', missed: '未执行：14 次（督导抽查记录）', rate: '依从率：93.0%（达标线 ≥90%）' },
    { id: 'IHH-002', dept: '科室：新生儿 NICU', moment: '时机：五时机全覆盖（重点接触前与接触后）', done: '执行：142 次', missed: '未执行：9 次', rate: '依从率：94.0%（达标）' },
    { id: 'IHH-003', dept: '科室：手术室（手术间）', moment: '时机：无菌操作前/接触患者后为主', done: '执行：118 次', missed: '未执行：16 次', rate: '依从率：88.0%（低于目标，需整改督导）' },
    { id: 'IHH-004', dept: '科室：呼吸与危重症科（PICU 同口径）', moment: '时机：接触患者前/接触环境后重点', done: '执行：155 次', missed: '未执行：11 次', rate: '依从率：93.4%（达标）' },
    { id: 'IHH-005', dept: '科室：门诊输液大厅', moment: '时机：接触患者后/无菌操作前', done: '执行：98 次', missed: '未执行：13 次', rate: '依从率：88.3%（需提升，持续督导）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/infection/env-swabs - 环境卫生学监测（采样点/项目/菌落数/标准/结果）5 条 */
async function handleInfEnvSwabs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IES-001', site: '采样点：ICU 床头物体表面（床头柜表面）', item: '项目：细菌菌落总数（物体表面）', colonies: '菌落数：4 CFU/cm²', standard: '标准：≤5 CFU/cm² 为合格', result: '结果：合格（在标准范围内）' },
    { id: 'IES-002', site: '采样点：手术室手术间空气（沉降菌）', item: '项目：空气细菌菌落总数（沉降菌法）', colonies: '菌落数：1.5 CFU/皿·30min', standard: '标准：洁净手术间 ≤2 CFU/皿', result: '结果：合格' },
    { id: 'IES-003', site: '采样点：新生儿暖箱内壁（接触新生儿部位）', item: '项目：物体表面菌落总数 + 致病菌检测', colonies: '菌落数：7 CFU/cm²', standard: '标准：≤5 CFU/cm²', result: '结果：不合格（超标，已清洁复采合格）' },
    { id: 'IES-004', site: '采样点：口腔科手机/治疗台水源', item: '项目：水处理菌落总数（≤100 CFU/mL）', colonies: '菌落数：42 CFU/mL', standard: '标准：≤100 CFU/mL', result: '结果：合格' },
    { id: 'IES-005', site: '采样点：消毒供应中心（CSSD）灭菌物品包装外表面', item: '项目：物体表面菌落总数', colonies: '菌落数：2 CFU/cm²', standard: '标准：≤5 CFU/cm²', result: '结果：合格' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/infection/antibiotic-monitor - 抗菌药物使用监测（科室/DDDs/使用率/强度/月份）5 条 */
async function handleInfAntibioticMonitor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IAM-001', dept: '科室：呼吸与危重症科', ddds: 'DDDs：本月 168.5（限定日剂量合计）', useRate: '使用率：62.3%（住院患者抗菌药物使用比例）', intensity: '使用强度（DDDs/100 床日）：45.2', month: '月份：2026-09（监测月）' },
    { id: 'IAM-002', dept: '科室：普外科', ddds: 'DDDs：132.0', useRate: '使用率：55.8%', intensity: '使用强度：38.6（外科围术期为主）', month: '月份：2026-09' },
    { id: 'IAM-003', dept: '科室：ICU', ddds: 'DDDs：205.4', useRate: '使用率：78.1%（重症感染高使用）', intensity: '使用强度：62.8（高于全院均值，需点评）', month: '月份：2026-09' },
    { id: 'IAM-004', dept: '科室：儿科', ddds: 'DDDs：96.2', useRate: '使用率：41.5%（门急诊限定级别）', intensity: '使用强度：28.4', month: '月份：2026-09' },
    { id: 'IAM-005', dept: '科室：全院汇总（A级通报）', ddds: 'DDDs：全院合计 1286.0', useRate: '使用率：46.9%（国家住院患者平均 ≤60% 控制线内）', intensity: '使用强度：38.0（≤40 控制线内）', month: '月份：2026-09' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/adverse-events - 不良事件（事件号/类型/级别/经过/整改状态）5 条 */
async function handleQuaAdverseEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QAE-001', eventNo: '事件号：AE-20261020-01（跌倒/坠床）', type: '类型：住院患者跌倒（夜间如厕滑倒，无严重伤害）', level: '级别：Ⅲ 级（未造成严重后果，隐患/轻度）', course: '经过：老年患者夜起如厕未呼叫陪护，地面湿滑滑倒', rectify: '整改状态：已上报根因分析（RCA），增设防滑垫与陪护提示，闭环整改完成' },
    { id: 'QAE-002', eventNo: '事件号：AE-20261019-02（给药错误）', type: '类型：口服药剂量漏服（医嘱漏执行一次）', level: '级别：Ⅱ 级（未造成伤害风险事件）', course: '经过：班次交接疏漏，一次常规口服药未按时发给患者', rectify: '整改状态：已约谈、优化交接核对流程，整改中' },
    { id: 'QAE-003', eventNo: '事件号：AE-20261019-03（压力性损伤）', type: '类型：院内获得性压力性损伤（Ⅱ期骶尾部）', level: '级别：Ⅲ 级（轻度，已创面处理）', course: '经过：长期卧床患者翻身评估不到位，骶尾部出现Ⅱ期压疮', rectify: '整改状态：已建档护理，调整翻身频次与减压敷料，持续追踪' },
    { id: 'QAE-004', eventNo: '事件号：AE-20261018-04（管路滑脱）', type: '类型：非计划拔管（胃管意外脱出）', level: '级别：Ⅱ 级（无严重后果）', course: '经过：患者躁动致胃管自行脱出，无再次置管损伤', rectify: '整改状态：已上报，评估约束与镇静医嘱，闭环完成' },
    { id: 'QAE-005', eventNo: '事件号：AE-20261017-05（标本/设备类隐患）', type: '类型：检验标本采集标签贴错（发现于送检前，未发生错误报告）', level: '级别：Ⅳ 级（隐患事件，未造成后果）', course: '经过：双人核对前发现标本标签与患者不符，重新采集', rectify: '整改状态：无伤害，作为培训案例归档，已闭环' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m444Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/infection/hand-hygiene', handle: handleInfHandHygiene, auth: true },
  { method: 'GET', path: '/api/v1/infection/env-swabs', handle: handleInfEnvSwabs, auth: true },
  { method: 'GET', path: '/api/v1/infection/antibiotic-monitor', handle: handleInfAntibioticMonitor, auth: true },
  { method: 'GET', path: '/api/v1/quality/adverse-events', handle: handleQuaAdverseEvents, auth: true },
];
