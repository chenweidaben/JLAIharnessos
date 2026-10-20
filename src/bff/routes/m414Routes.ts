/**
 * 健澜科技 jlmedaios - M414 P1 业务扩展：修复已知缺口 + 补建重症医学详情
 *
 * 修复：auth/me（DEMO_MODE 短路返回 mock 用户）、emr/list（补建 5 条假病历）
 * 新增：icu/admissions-detail、icu/monitoring-detail、icu/treatments-detail、
 *       icu/ventilator-detail、icu/critical-events-detail、icu/discharges-detail
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ------------------------------------------------------------------ */
/* 缺口修复 1：GET /api/v1/auth/me                                     */
/* ------------------------------------------------------------------ */

/** GET /api/v1/auth/me - 当前登录用户信息（DEMO_MODE 短路返回 mock） */
async function handleAuthMe(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const user = c.user ?? { id: 'demo', name: '演示用户', roles: ['admin'], permissions: ['*'] };
  return json(ok({
    id: user.id,
    name: user.name,
    roles: user.roles,
    permissions: user.permissions ?? ['*'],
    dept: '信息科',
    tenant: 'default',
  }));
}

/* ------------------------------------------------------------------ */
/* 缺口修复 2：GET /api/v1/emr/list                                    */
/* ------------------------------------------------------------------ */

/** GET /api/v1/emr/list - 病历列表 5 条假数据 */
async function handleEmrList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EMR-2026-001', patientName: '张***', gender: '男', age: 65, department: '心内科', diagnosis: '冠心病（急性心肌梗死）', admissionDate: '2026-10-15', status: '在院', doctor: '王***（主治医师）' },
    { id: 'EMR-2026-002', patientName: '李***', gender: '女', age: 58, department: '神经内科', diagnosis: '脑梗死', admissionDate: '2026-10-16', status: '在院', doctor: '赵***（副主任医师）' },
    { id: 'EMR-2026-003', patientName: '王***', gender: '男', age: 72, department: '骨科', diagnosis: '股骨颈骨折', admissionDate: '2026-10-17', status: '术后恢复', doctor: '钱***（主任医师）' },
    { id: 'EMR-2026-004', patientName: '陈***', gender: '女', age: 45, department: '普外科', diagnosis: '急性阑尾炎', admissionDate: '2026-10-18', status: '已出院', doctor: '孙***（主治医师）' },
    { id: 'EMR-2026-005', patientName: '赵***', gender: '男', age: 60, department: '呼吸内科', diagnosis: '社区获得性肺炎', admissionDate: '2026-10-19', status: '在院', doctor: '周***（副主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/* ------------------------------------------------------------------ */
/* 新增：6 个 ICU 重症医学详情接口                                       */
/* ------------------------------------------------------------------ */

/** GET /api/v1/icu/admissions-detail - 重症入院详情 5 条 */
async function handleIcuAdmissionsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IAD-001', patient: '患者：张***（男，65 岁）', diagnosis: '诊断：冠心病合并急性左心衰竭（心功能 IV 级）', admissionTime: '入院时间：2026-10-18 14:00:00（心内科转入）', condition: '病情：急性心衰发作，BP 85/50 mmHg，HR 125 次/分，SpO2 88%，需无创呼吸机辅助通气', doctor: '医生：ICU 主任刘***（主任医师）' },
    { id: 'IAD-002', patient: '患者：李***（女，58 岁）', diagnosis: '诊断：脑梗死（大面积，意识障碍）', admissionTime: '入院时间：2026-10-18 20:00:00（神经内科转入）', condition: '病情：GCS 评分 8 分（昏迷），双侧瞳孔不等大，需颅内压监测', doctor: '医生：ICU 副主任王***（副主任医师）' },
    { id: 'IAD-003', patient: '患者：王***（男，72 岁）', diagnosis: '诊断：股骨颈骨折术后并发肺部感染、感染性休克', admissionTime: '入院时间：2026-10-19 08:00:00（骨科转入）', condition: '病情：BP 75/40 mmHg，HR 130 次/分，WBC 18×10⁹/L，需血管活性药物维持血压', doctor: '医生：ICU 主任刘***（主任医师）' },
    { id: 'IAD-004', patient: '患者：陈***（男，50 岁）', diagnosis: '诊断：多发伤（车祸致颅脑损伤+肝破裂）', admissionTime: '入院时间：2026-10-19 12:00:00（急诊直接转入）', condition: '病情：GCS 评分 6 分，血压 80/50 mmHg，Hb 70 g/L，已行肝破裂修补术，需呼吸机辅助', doctor: '医生：ICU 副主任赵***（副主任医师）' },
    { id: 'IAD-005', patient: '患者：赵***（女，65 岁）', diagnosis: '诊断：重症肺炎（ARDS）', admissionTime: '入院时间：2026-10-20 06:00:00（呼吸内科转入）', condition: '病情：SpO2 82%（面罩吸氧 10L/min），PaO2/FiO2 150 mmHg，需气管插管机械通气', doctor: '医生：ICU 主任刘***（主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/icu/monitoring-detail - 重症监护详情 5 条 */
async function handleIcuMonitoringDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IMD-001', patient: '患者：张***（ICU-001，心衰）', indicators: '监测指标：1. 心率（HR）；2. 血压（BP）；3. 血氧饱和度（SpO2）；4. 中心静脉压（CVP）；5. 尿量', values: '数值：1. HR：110 次/分（目标 60-100）；2. BP：95/60 mmHg（目标 ≥90/60）；3. SpO2：92%（目标 ≥90%）；4. CVP：12 cmH2O（目标 8-12）；5. 尿量：30 ml/h（目标 ≥0.5 ml/kg/h）', trends: '趋势：HR 由 125 降至 110，BP 由 85/50 升至 95/60，SpO2 由 88% 升至 92%（治疗 24 小时后趋势向好）', doctor: '医生：ICU 主任刘***（主任医师）' },
    { id: 'IMD-002', patient: '患者：李***（ICU-002，脑梗死）', indicators: '监测指标：1. 意识（GCS）；2. 瞳孔；3. 颅内压（ICP）；4. 脑灌注压（CPP）；5. 血氧饱和度（SpO2）', values: '数值：1. GCS：8 分（入院时）→ 9 分（24 小时后）；2. 瞳孔：左侧 3mm，右侧 4mm（不等大）；3. ICP：22 mmHg（目标 <20）；4. CPP：65 mmHg（目标 ≥60）；5. SpO2：96%（呼吸机辅助）', trends: '趋势：GCS 由 8 升至 9，ICP 由 25 降至 22（甘露醇脱水治疗后），CPP 维持在 60-70 之间', doctor: '医生：ICU 副主任王***（副主任医师）' },
    { id: 'IMD-003', patient: '患者：王***（ICU-003，感染性休克）', indicators: '监测指标：1. 血压（BP）；2. 心率（HR）；3. 乳酸（Lac）；4. 尿量；5. 中心静脉压（CVP）', values: '数值：1. BP：85/50 mmHg（去甲肾上腺素 0.5 μg/kg/min）；2. HR：115 次/分；3. Lac：3.5 mmol/L（目标 <2）；4. 尿量：20 ml/h；5. CVP：10 cmH2O', trends: '趋势：BP 由 75/40 升至 85/50（补液+血管活性药物），Lac 由 5.0 降至 3.5（感染控制中），尿量由 15 升至 20 ml/h', doctor: '医生：ICU 主任刘***（主任医师）' },
    { id: 'IMD-004', patient: '患者：陈***（ICU-004，多发伤）', indicators: '监测指标：1. 血压（BP）；2. 心率（HR）；3. 血红蛋白（Hb）；4. 血氧饱和度（SpO2）；5. 意识（GCS）', values: '数值：1. BP：100/60 mmHg；2. HR：95 次/分；3. Hb：85 g/L（术后输血 400ml）；4. SpO2：95%（呼吸机辅助）；5. GCS：7 分', trends: '趋势：BP 由 80/50 升至 100/60（术后补液+输血），Hb 由 70 升至 85，HR 由 130 降至 95，GCS 由 6 升至 7', doctor: '医生：ICU 副主任赵***（副主任医师）' },
    { id: 'IMD-005', patient: '患者：赵***（ICU-005，ARDS）', indicators: '监测指标：1. 血氧饱和度（SpO2）；2. 氧合指数（PaO2/FiO2）；3. 呼吸频率（RR）；4. 气道压（Pplat）；5. 潮气量（VT）', values: '数值：1. SpO2：90%（呼吸机辅助，FiO2 60%）；2. PaO2/FiO2：150 mmHg（ARDS 诊断标准 <200）；3. RR：20 次/分（呼吸机控制）；4. Pplat：28 cmH2O（目标 <30）；5. VT：6 ml/kg（肺保护通气策略）', trends: '趋势：SpO2 由 82% 升至 90%（肺复张+PEEP 调整），PaO2/FiO2 由 120 升至 150（俯卧位通气后改善）', doctor: '医生：ICU 主任刘***（主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/icu/treatments-detail - 重症治疗详情 5 条 */
async function handleIcuTreatmentsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ITD-001', patient: '患者：张***（ICU-001，心衰）', treatmentItems: '治疗项目：1. 无创呼吸机辅助通气；2. 利尿剂（呋塞米）；3. 血管扩张剂（硝酸甘油）；4. 正性肌力药（多巴酚丁胺）', medications: '用药：1. 呋塞米 20mg iv q12h（利尿减轻心脏负荷）；2. 硝酸甘油 10μg/min iv 泵入（扩张血管）；3. 多巴酚丁胺 5μg/kg/min iv 泵入（增强心肌收缩力）', effects: '效果：呼吸困难明显缓解，尿量由 20 ml/h 升至 30 ml/h，肺部啰音减少，心衰控制中', doctor: '医生：ICU 主任刘***（主任医师）' },
    { id: 'ITD-002', patient: '患者：李***（ICU-002，脑梗死）', treatmentItems: '治疗项目：1. 甘露醇脱水降颅压；2. 气管插管机械通气；3. 亚低温治疗；4. 营养神经药物', medications: '用药：1. 甘露醇 125ml iv q8h（脱水降颅压）；2. 丙泊酚 20mg/h iv 泵入（镇静，亚低温治疗）；3. 神经节苷脂 40mg iv qd（营养神经）', effects: '效果：ICP 由 25 降至 22 mmHg，GCS 由 8 升至 9 分，瞳孔不等大无加重，病情稳定中', doctor: '医生：ICU 副主任王***（副主任医师）' },
    { id: 'ITD-003', patient: '患者：王***（ICU-003，感染性休克）', treatmentItems: '治疗项目：1. 液体复苏（晶体液）；2. 血管活性药物（去甲肾上腺素）；3. 广谱抗生素（美罗培南）；4. 机械通气', medications: '用药：1. 晶体液 3000ml（前 6 小时液体复苏）；2. 去甲肾上腺素 0.5μg/kg/min iv 泵入（维持血压）；3. 美罗培南 1g iv q8h（广谱抗生素）', effects: '效果：BP 由 75/40 升至 85/50 mmHg，Lac 由 5.0 降至 3.5 mmol/L，尿量由 15 升至 20 ml/h，感染控制中', doctor: '医生：ICU 主任刘***（主任医师）' },
    { id: 'ITD-004', patient: '患者：陈***（ICU-004，多发伤）', treatmentItems: '治疗项目：1. 肝破裂修补术后监护；2. 机械通气；3. 输血（红细胞悬液）；4. 止血药物', medications: '用药：1. 红细胞悬液 400ml（术后输血，Hb 70→85 g/L）；2. 氨甲环酸 1g iv q8h（止血）；3. 头孢哌酮舒巴坦 2g iv q8h（预防感染）', effects: '效果：生命体征趋于平稳，BP 80/50→100/60 mmHg，Hb 稳定在 85 g/L，无活动性出血', doctor: '医生：ICU 副主任赵***（副主任医师）' },
    { id: 'ITD-005', patient: '患者：赵***（ICU-005，ARDS）', treatmentItems: '治疗项目：1. 肺保护性通气策略（小潮气量+PEEP）；2. 俯卧位通气；3. 肺复张手法；4. 抗生素（哌拉西林他唑巴坦）', medications: '用药：1. VT 6ml/kg，PEEP 12 cmH2O（肺保护通气）；2. 俯卧位通气每日 12 小时；3. 哌拉西林他唑巴坦 4.5g iv q6h（抗感染）', effects: '效果：SpO2 由 82% 升至 90%，PaO2/FiO2 由 120 升至 150 mmHg，ARDS 改善中', doctor: '医生：ICU 主任刘***（主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/icu/ventilator-detail - 呼吸机管理详情 5 条 */
async function handleIcuVentilatorDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IVD-001', patient: '患者：张***（ICU-001，心衰）', ventParams: '呼吸机参数：1. 模式：无创呼吸机（CPAP）；2. EPAP：5 cmH2O；3. IPAP：15 cmH2O；4. FiO2：40%；5. 备用频率：12 次/分', mode: '模式：CPAP（持续气道正压通气，心衰无创通气）', duration: '使用时长：24 小时（2026-10-19 14:00 开始使用）', status: '状态：好转中（SpO2 88%→92%，准备评估脱机）' },
    { id: 'IVD-002', patient: '患者：李***（ICU-002，脑梗死）', ventParams: '呼吸机参数：1. 模式：SIMV（同步间歇指令通气）；2. VT：400 ml；3. 频率：16 次/分；4. PEEP：5 cmH2O；5. FiO2：50%', mode: '模式：SIMV（同步间歇指令通气，昏迷患者有创通气）', duration: '使用时长：24 小时（2026-10-18 20:00 气管插管后开始使用）', status: '状态：维持中（GCS 8 分，无法脱机）' },
    { id: 'IVD-003', patient: '患者：王***（ICU-003，感染性休克）', ventParams: '呼吸机参数：1. 模式：ACV（辅助控制通气）；2. VT：450 ml；3. 频率：18 次/分；4. PEEP：8 cmH2O；5. FiO2：50%', mode: '模式：ACV（辅助控制通气，休克患者呼吸支持）', duration: '使用时长：12 小时（2026-10-20 06:00 因呼吸衰竭气管插管）', status: '状态：初始使用中（感染性休克，呼吸频率 30 次/分）' },
    { id: 'IVD-004', patient: '患者：陈***（ICU-004，多发伤）', ventParams: '呼吸机参数：1. 模式：SIMV（同步间歇指令通气）；2. VT：500 ml；3. 频率：14 次/分；4. PEEP：6 cmH2O；5. FiO2：40%', mode: '模式：SIMV（同步间歇指令通气，颅脑损伤术后）', duration: '使用时长：24 小时（2026-10-19 12:00 术后气管插管）', status: '状态：维持中（GCS 7 分，无法脱机）' },
    { id: 'IVD-005', patient: '患者：赵***（ICU-005，ARDS）', ventParams: '呼吸机参数：1. 模式：ACV（辅助控制通气，肺保护策略）；2. VT：360 ml（6ml/kg）；3. 频率：20 次/分；4. PEEP：12 cmH2O；5. FiO2：60%', mode: '模式：ACV + 肺保护策略（小潮气量+高 PEEP，ARDS 肺保护通气）', duration: '使用时长：12 小时（2026-10-20 06:00 因 ARDS 气管插管）', status: '状态：初始使用中（俯卧位通气每日 12 小时）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/icu/critical-events-detail - 危重事件详情 5 条 */
async function handleIcuCriticalEventsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ICE-001', eventNo: 'EVT-2026-001（心跳骤停事件）', patient: '患者：张***（ICU-001，心衰）', eventType: '事件类型：心跳骤停（室颤）', handling: '处理：1. 立即胸外按压（2026-10-19 22:30:00）；2. 电除颤 200J（2026-10-19 22:31:00）；3. 肾上腺素 1mg iv（2026-10-19 22:32:00）；4. 恢复自主心律（2026-10-19 22:35:00，除颤后 4 分钟 ROSC）', time: '时间：2026-10-19 22:30:00（ICU 住院期间发生）' },
    { id: 'ICE-002', eventNo: 'EVT-2026-002（急性左心衰发作）', patient: '患者：张***（ICU-001，心衰）', eventType: '事件类型：急性左心衰发作（肺水肿）', handling: '处理：1. 立即端坐位、双下肢下垂；2. 高流量吸氧（6L/min）；3. 呋塞米 20mg iv（利尿）；4. 硝酸甘油 10μg/min iv 泵入（扩血管）；5. 无创呼吸机辅助通气', time: '时间：2026-10-18 14:30:00（入 ICU 后 30 分钟发作）' },
    { id: 'ICE-003', eventNo: 'EVT-2026-003（颅内压增高危象）', patient: '患者：李***（ICU-002，脑梗死）', eventType: '事件类型：颅内压增高危象（脑疝前期）', handling: '处理：1. 立即甘露醇 125ml iv（快速脱水）；2. 床头抬高 30°；3. 过度通气（PaCO2 降至 30 mmHg）；4. 复查头颅 CT（排除出血）', time: '时间：2026-10-19 02:00:00（ICP 由 20 升至 30 mmHg）' },
    { id: 'ICE-004', eventNo: 'EVT-2026-004（感染性休克加重）', patient: '患者：王***（ICU-003，感染性休克）', eventType: '事件类型：感染性休克加重（BP 骤降）', handling: '处理：1. 快速补液 1000ml（30 分钟内）；2. 去甲肾上腺素由 0.3 调至 0.5 μg/kg/min；3. 美罗培南升级为万古霉素+美罗培南；4. 动脉血气分析（Lac 5.0 mmol/L）', time: '时间：2026-10-19 20:00:00（BP 由 90/60 骤降至 75/40 mmHg）' },
    { id: 'ICE-005', eventNo: 'EVT-2026-005（ARDS 急性加重）', patient: '患者：赵***（ICU-005，ARDS）', eventType: '事件类型：ARDS 急性加重（SpO2 骤降）', handling: '处理：1. 立即肺复张手法（CPAP 40 cmH2O 维持 30 秒）；2. PEEP 由 10 调至 12 cmH2O；3. FiO2 由 50% 调至 60%；4. 俯卧位通气（每日 12 小时）', time: '时间：2026-10-20 08:00:00（SpO2 由 90% 骤降至 82%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/icu/discharges-detail - 重症转出详情 5 条 */
async function handleIcuDischargesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IDD-001', patient: '患者：孙***（男，55 岁，ICU-006，重症肺炎）', transferDept: '转出科室：呼吸内科（普通病房）', transferTime: '转出时间：2026-10-18 10:00:00（ICU 住院 5 天后转出）', outcome: '结果：病情好转（SpO2 96% 鼻导管吸氧，体温正常，自行进食），转回普通病房继续治疗', doctor: '医生：ICU 主任刘***（主任医师）→ 呼吸内科主治医生周***' },
    { id: 'IDD-002', patient: '患者：周***（女，48 岁，ICU-007，急性胰腺炎）', transferDept: '转出科室：消化内科（普通病房）', transferTime: '转出时间：2026-10-19 14:00:00（ICU 住院 7 天后转出）', outcome: '结果：病情好转（腹痛缓解，淀粉酶下降，可流质饮食），转回普通病房继续治疗', doctor: '医生：ICU 副主任王***（副主任医师）→ 消化内科主治医生吴***' },
    { id: 'IDD-003', patient: '患者：吴***（男，60 岁，ICU-008，急性心梗）', transferDept: '转出科室：心内科 CCU（冠心病监护病房）', transferTime: '转出时间：2026-10-19 16:00:00（ICU 住院 3 天后转出）', outcome: '结果：病情稳定（心梗术后 3 天，生命体征平稳，心功能改善），转入 CCU 继续监护', doctor: '医生：ICU 主任刘***（主任医师）→ 心内科主任郑***' },
    { id: 'IDD-004', patient: '患者：郑***（女，70 岁，ICU-009，重症肺炎+ARDS）', transferDept: '转出科室：呼吸内科（普通病房）', transferTime: '转出时间：2026-10-20 09:00:00（ICU 住院 10 天后转出）', outcome: '结果：病情好转（脱机 48 小时，SpO2 93% 面罩吸氧，可坐起活动），转回普通病房康复', doctor: '医生：ICU 副主任赵***（副主任医师）→ 呼吸内科主治医生周***' },
    { id: 'IDD-005', patient: '患者：王***（男，65 岁，ICU-010，颅脑损伤术后）', transferDept: '转出科室：神经内科（普通病房）', transferTime: '转出时间：2026-10-20 11:00:00（ICU 住院 14 天后转出）', outcome: '结果：病情稳定（GCS 由 6 分升至 12 分，意识好转，可简单指令动作），转回普通病房继续康复', doctor: '医生：ICU 主任刘***（主任医师）→ 神经内科主任王***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m414Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/auth/me', handle: handleAuthMe, auth: true },
  { method: 'GET', path: '/api/v1/emr/list', handle: handleEmrList, auth: true },
  { method: 'GET', path: '/api/v1/icu/admissions-detail', handle: handleIcuAdmissionsDetail, auth: true },
  { method: 'GET', path: '/api/v1/icu/monitoring-detail', handle: handleIcuMonitoringDetail, auth: true },
  { method: 'GET', path: '/api/v1/icu/treatments-detail', handle: handleIcuTreatmentsDetail, auth: true },
  { method: 'GET', path: '/api/v1/icu/ventilator-detail', handle: handleIcuVentilatorDetail, auth: true },
  { method: 'GET', path: '/api/v1/icu/critical-events-detail', handle: handleIcuCriticalEventsDetail, auth: true },
  { method: 'GET', path: '/api/v1/icu/discharges-detail', handle: handleIcuDischargesDetail, auth: true },
];
