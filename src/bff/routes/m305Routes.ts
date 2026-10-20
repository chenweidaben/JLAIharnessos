/**
 * 健澜科技 jlmedaios - M305 质量风险域
 *
 * 物资库存预警/质量控制/质量检验/质量异常/风险评估/风险监测/风险预警
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/supplies/warning - 物资库存预警 5 条 */
async function handleSuppliesWarning(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { supply: '一次性注射器（5ml）', stock: '1,200 支', safetyStock: '5,000 支', status: '低于安全库存', suggestQty: '50,000 支' },
    { supply: '医用外科口罩', stock: '8,000 只', safetyStock: '10,000 只', status: '低于安全库存', suggestQty: '100,000 只' },
    { supply: '输液器（带针）', stock: '15,000 套', safetyStock: '15,000 套', status: '临界值', suggestQty: '20,000 套' },
    { supply: '手术手套（无菌 7.5#）', stock: '8,500 双', safetyStock: '5,000 双', status: '正常', suggestQty: '—' },
    { supply: '纱布块（8cm×8cm）', stock: '2,000 包', safetyStock: '3,000 包', status: '低于安全库存', suggestQty: '5,000 包' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/control - 质量控制 5 条 */
async function handleQualityControl(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QC-001', project: '消毒供应室无菌物品监测', standard: '无菌检验合格率 100%', result: '合格率 100%', judgment: '合格', time: '2026-10-20' },
    { id: 'QC-002', project: '病案书写质量抽查', standard: '甲级病历率 ≥90%', result: '甲级率 93.5%', judgment: '合格', time: '2026-10-19' },
    { id: 'QC-003', project: '院内感染发病率监测', standard: '发病率 ≤8%', result: '发病率 5.2%', judgment: '合格', time: '2026-10-18' },
    { id: 'QC-004', project: '检验室室内质控', standard: 'CV ≤5%', result: 'CV 3.8%', judgment: '合格', time: '2026-10-20' },
    { id: 'QC-005', project: '药品调剂差错率', standard: '差错率 ≤0.1%', result: '差错率 0.05%', judgment: '合格', time: '2026-10-17' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/inspection - 质量检验 5 条 */
async function handleQualityInspection(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QI-001', item: '一次性注射器密封性检验', batch: '20261015-001', result: '合格', inspector: '检验科 王技师', time: '2026-10-16' },
    { id: 'QI-002', item: '医用口罩过滤效率检验', batch: '20261014-003', result: '合格（≥95%）', inspector: '院感科 李主管', time: '2026-10-15' },
    { id: 'QI-003', item: '消毒湿巾有效成分检测', batch: '20261010-002', result: '合格（含量达标）', inspector: '药剂科 张药师', time: '2026-10-12' },
    { id: 'QI-004', item: '血液透析用水水质检测', batch: '20261018-001', result: '合格（细菌≤100CFU/ml）', inspector: '血透室 刘护士长', time: '2026-10-19' },
    { id: 'QI-005', item: '手术室空气洁净度检测', batch: '20261020-001', result: '合格（万级洁净）', inspector: '院感科 陈主管', time: '2026-10-20' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/exception - 质量异常 5 条 */
async function handleQualityException(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QE-001', item: '病案书写缺陷', desc: '3 份病历现病史描述不完整', cause: '新入职医师书写不规范', measure: '已退回修改并组织培训', status: '已闭环' },
    { id: 'QE-002', item: '药品调剂差错', desc: '1 例药品规格混淆（0.25g→0.5g）', cause: '相似包装辨认失误', measure: '已更换包装标识并加强双人核对', status: '已闭环' },
    { id: 'QE-003', item: '院内感染聚集', desc: 'ICU 2 例同波段状杆菌感染', cause: '疑似手部卫生依从性不足', measure: '已强化手卫生督查并采样环境', status: '整改中' },
    { id: 'QE-004', item: '检验结果异常波动', desc: '血常规 WBC 项目室内质控 1 次失控', cause: '试剂开封时间过长', measure: '已更换新批号试剂并重新校准', status: '已闭环' },
    { id: 'QE-005', item: '输液反应', desc: '1 例患者输液后发热（38.5℃）', cause: '疑似个体过敏体质', measure: '已停药对症处理并上报', status: '观察中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/risk/assessment - 风险评估 5 条 */
async function handleRiskAssessment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RA-001', riskItem: '医疗安全（手术错误部位）', level: '高风险', likelihood: '低', impact: '严重', measure: '手术安全核查表 Time-Out 制度 100% 执行' },
    { id: 'RA-002', riskItem: '药品管理（高危药品混淆）', level: '中风险', likelihood: '中', impact: '严重', measure: '高危药品专区存放+醒目标识' },
    { id: 'RA-003', riskItem: '信息系统（HIS 宕机）', level: '高风险', likelihood: '低', impact: '严重', measure: '双机热备+应急预案+定期演练' },
    { id: 'RA-004', riskItem: '医院感染（多重耐药菌暴发）', level: '中风险', likelihood: '中', impact: '中等', measure: '主动筛查+接触隔离+环境消毒' },
    { id: 'RA-005', riskItem: '消防/安全（火灾）', level: '低风险', likelihood: '极低', impact: '严重', measure: '消防设施月检+全员消防演练每年 2 次' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/risk/monitor - 风险监测 5 条 */
async function handleRiskMonitor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RM-001', item: '门诊输液反应发生率', indicator: '0.02%', threshold: '≤0.1%', trend: '↓ 同比下降', status: '正常' },
    { id: 'RM-002', item: '院内感染发病率', indicator: '5.2%', threshold: '≤8%', trend: '→ 持平', status: '正常' },
    { id: 'RM-003', item: '医疗纠纷发生率', indicator: '0.3‰', threshold: '≤0.5‰', trend: '↓ 同比下降', status: '正常' },
    { id: 'RM-004', item: '药品不良反应上报率', indicator: '120 例/月', threshold: '≥80 例/月', trend: '↑ 上升（主动监测加强）', status: '正常' },
    { id: 'RM-005', item: '患者跌倒/坠床发生率', indicator: '0.8‰', threshold: '≤1‰', trend: '→ 持平', status: '正常' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/risk/warning - 风险预警 5 条 */
async function handleRiskWarning(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RW-001', item: 'ICU 鲍曼不动杆菌检出率上升', level: '橙色预警', desc: '本周检出 3 例（上周 1 例）', time: '2026-10-19', handleStatus: '已启动接触隔离+主动筛查' },
    { id: 'RW-002', item: '急诊 72 小时再入院率升高', level: '黄色预警', desc: '本月 3.2%（阈值 3%）', time: '2026-10-18', handleStatus: '已组织病例回顾分析' },
    { id: 'RW-003', item: '儿科高热门诊量激增', level: '蓝色预警', desc: '日门诊量同比 +40%', time: '2026-10-20', handleStatus: '已增开 2 个诊室' },
    { id: 'RW-004', item: 'CT 设备使用率超 90%', level: '黄色预警', desc: '连续 3 天超 90%', time: '2026-10-19', handleStatus: '已协调预约分流' },
    { id: 'RW-005', item: '输液反应发生率接近阈值', level: '蓝色预警', desc: '0.08%（阈值 0.1%）', time: '2026-10-17', handleStatus: '已加强输液前核对与观察' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m305Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/supplies/warning', handle: handleSuppliesWarning, auth: true },
  { method: 'GET', path: '/api/v1/quality/control', handle: handleQualityControl, auth: true },
  { method: 'GET', path: '/api/v1/quality/inspection', handle: handleQualityInspection, auth: true },
  { method: 'GET', path: '/api/v1/quality/exception', handle: handleQualityException, auth: true },
  { method: 'GET', path: '/api/v1/risk/assessment', handle: handleRiskAssessment, auth: true },
  { method: 'GET', path: '/api/v1/risk/monitor', handle: handleRiskMonitor, auth: true },
  { method: 'GET', path: '/api/v1/risk/warning', handle: handleRiskWarning, auth: true },
];
