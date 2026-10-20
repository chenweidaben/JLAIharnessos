/**
 * 健澜科技 jlmedaios - M451 出院随访与慢病管理闭环（followup / chronic）
 *
 * 随访计划 / 随访执行 / 失访追回 / 慢病达标 / 家庭监测 / 随访知识库
 * 聚焦闭环执行，不重复 care/followups、公卫 chronic-followups 既有口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/followup/plans - 随访计划（患者/病种/计划项/时间/责任医生）5 条 */
async function handleFuPlans(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FUP-001', patient: '患者：张***（男，68 岁，冠心病 PCI 术后）', disease: '病种：冠心病（经皮冠脉介入术后二级预防）', planItem: '计划项：术后 1/3/6/12 个月门诊复查（心电图+血脂+用药依从性）', time: '时间：首访 2026-11-20（出院后 1 个月），按计划节点滚动', doctor: '责任医生：心内科 王*** 主任医师' },
    { id: 'FUP-002', patient: '患者：李***（女，54 岁，2 型糖尿病）', disease: '病种：2 型糖尿病（血糖长期管理）', planItem: '计划项：每 2 周一次血糖回访，3 个月复查糖化血红蛋白', time: '时间：下次回访 2026-11-03（双周节点）', doctor: '责任医生：内分泌科 刘*** 主治医师' },
    { id: 'FUP-003', patient: '患者：王***（男，45 岁，脑卒中恢复期）', disease: '病种：缺血性脑卒中（康复+二级预防）', planItem: '计划项：每月康复评估，血压/血脂/抗血小板用药随访', time: '时间：下次评估 2026-11-05（月度节点）', doctor: '责任医生：神经内科 赵*** 副主任医师' },
    { id: 'FUP-004', patient: '患者：赵***（女，61 岁，高血压 2 级）', disease: '病种：原发性高血压（很高危）', planItem: '计划项：每周家庭血压记录回传，每月电话随访，季度门诊调药', time: '时间：本月电话随访 2026-10-28', doctor: '责任医生：全科/社区 孙*** 主治医师' },
    { id: 'FUP-005', patient: '患者：陈***（男，72 岁，COPD 稳定期）', disease: '病种：慢性阻塞性肺疾病（稳定期管理）', planItem: '计划项：每月用药与吸入技术回访，季度肺功能复查，急性加重预警', time: '时间：下次回访 2026-11-01（月度节点）', doctor: '责任医生：呼吸科 周*** 主治医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/followup/executions - 随访执行（计划号/方式/结果/执行时间/执行人）5 条 */
async function handleFuExecutions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FUE-001', planNo: '计划号：FUP-001（冠心病 PCI 术后 1 个月首访）', method: '方式：门诊面访（面对面复诊）', result: '结果：恢复良好，用药依从，无胸痛复发，血脂达标', execTime: '执行时间：2026-10-20 09:30', executor: '执行人：心内科随访护士 林***' },
    { id: 'FUE-002', planNo: '计划号：FUP-002（2 型糖尿病双周血糖回访）', method: '方式：电话随访（语音回访+血糖记录核对）', result: '结果：空腹血糖 7.2 mmol/L，饮食控制一般，已调整宣教', execTime: '执行时间：2026-10-19 15:10', executor: '执行人：内分泌随访专员 黄***' },
    { id: 'FUE-003', planNo: '计划号：FUP-003（脑卒中月度康复评估）', method: '方式：线上视频随访（康复动作指导）', result: '结果：肢体功能改善，建议继续居家康复训练，血压控制平稳', execTime: '执行时间：2026-10-18 10:00', executor: '执行人：康复治疗师 吴***' },
    { id: 'FUE-004', planNo: '计划号：FUP-004（高血压月度电话随访）', method: '方式：电话随访（家庭血压记录核对）', result: '结果：近周血压 138/86 mmHg，偶有晨起偏高，已提醒规律服药', execTime: '执行时间：2026-10-17 16:25', executor: '执行人：社区全科护士 郑***' },
    { id: 'FUE-005', planNo: '计划号：FUP-005（COPD 月度用药回访）', method: '方式：APP 消息+电话随访（吸入技术复核）', result: '结果：吸入装置使用基本正确，未急性加重，提醒戒烟与疫苗', execTime: '执行时间：2026-10-16 14:40', executor: '执行人：呼吸科随访护士 钱***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/followup/lost - 失访追回（患者/失访原因/追回方式/状态/经办人）5 条 */
async function handleFuLost(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FUL-001', patient: '患者：孙***（男，66 岁，糖尿病，连续 3 次未接回访）', reason: '失访原因：电话更换未更新，联系不上（疑似搬迁）', method: '追回方式：通过家属/紧急联系人二次联系，社区网格员上门核实', status: '状态：已追回（更新联系方式，恢复月度随访）', handler: '经办人：随访管理员 杨***' },
    { id: 'FUL-002', patient: '患者：周***（女，58 岁，高血压，拒接电话 2 次）', reason: '失访原因：患者主观拒访，认为血压已正常无需随访', method: '追回方式：家属协助劝说，社区医生上门沟通解释长期管理意义', status: '状态：追回中（已约定下次门诊，待确认）', handler: '经办人：社区全科 孙***' },
    { id: 'FUL-003', patient: '患者：吴***（男，70 岁，冠心病，APP 未回传记录）', reason: '失访原因：不会操作智能设备，线上回传中断', method: '追回方式：转电话随访，由家属协助登记家庭测量值', status: '状态：已追回（改为电话+纸质记录方式）', handler: '经办人：心内科随访护士 林***' },
    { id: 'FUL-004', patient: '患者：郑***（女，65 岁，COPD，出国探亲失联）', reason: '失访原因：异地/出境探亲，超出本地随访范围', method: '追回方式：邮件/微信跨国联系，委托当地体检补充记录', status: '状态：暂挂（登记出境，回归后自动恢复计划）', handler: '经办人：呼吸科随访护士 钱***' },
    { id: 'FUL-005', patient: '患者：冯***（男，78 岁，脑卒中，无人接听超 1 个月）', reason: '失访原因：长期无人接听，可能入住养老院/住院', method: '追回方式：核对就诊记录发现已转外院，发函协同随访', status: '状态：待核实（标记高危失访，上报公卫系统）', handler: '经办人：随访管理员 杨***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/chronic/targets - 慢病达标（患者/病种/指标/目标值/当前值/达标）5 条 */
async function handleChrTargets(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CHT-001', patient: '患者：李***（女，54 岁，2 型糖尿病）', disease: '病种：2 型糖尿病', metric: '指标：糖化血红蛋白 HbA1c', target: '目标值：＜7.0%', current: '当前值：6.6%', reach: '达标：已达标' },
    { id: 'CHT-002', patient: '患者：赵***（女，61 岁，高血压 2 级）', disease: '病种：原发性高血压', metric: '指标：诊室收缩压/舒张压', target: '目标值：＜140/90 mmHg（合并糖尿病＜130/80）', current: '当前值：146/92 mmHg', reach: '达标：未达标（偏高，待调药）' },
    { id: 'CHT-003', patient: '患者：张***（男，68 岁，冠心病 PCI 术后）', disease: '病种：冠心病', metric: '指标：低密度脂蛋白胆固醇 LDL-C', target: '目标值：＜1.8 mmol/L（二级预防）', current: '当前值：1.6 mmol/L', reach: '达标：已达标' },
    { id: 'CHT-004', patient: '患者：王***（男，45 岁，缺血性脑卒中）', disease: '病种：脑卒中', metric: '指标：血压（二级预防）+ 空腹血糖', target: '目标值：血压＜140/90、空腹血糖＜7.0 mmol/L', current: '当前值：血压 135/85、空腹血糖 6.3 mmol/L', reach: '达标：已达标' },
    { id: 'CHT-005', patient: '患者：陈***（男，72 岁，COPD 稳定期）', disease: '病种：COPD', metric: '指标：FEV1 占预计值百分比 + 急性加重次数', target: '目标值：FEV1≥80%、年加重≤1 次', current: '当前值：FEV1 68%、本年加重 2 次', reach: '达标：未达标（肺功能下降，需强化吸入治疗）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/chronic/home-monitor - 家庭监测数据（患者/设备/血压血糖/时间/异常标记）5 条 */
async function handleChrHomeMonitor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CHM-001', patient: '患者：赵***（女，61 岁，高血压）', device: '设备：家用蓝牙电子血压计（已绑定家庭医生端）', vital: '血压：晨起 152/96 mmHg、晚间 140/88 mmHg', time: '时间：2026-10-20 07:05（自动同步）', flag: '异常标记：晨起收缩压偏高（黄色预警，已推送提醒）' },
    { id: 'CHM-002', patient: '患者：李***（女，54 岁，糖尿病）', device: '设备：家用血糖仪（蓝牙回传）', vital: '血糖：空腹 7.8 mmol/L、餐后 2h 11.2 mmol/L', time: '时间：2026-10-19 08:10', flag: '异常标记：餐后偏高（黄色，建议饮食复诊）' },
    { id: 'CHM-003', patient: '患者：王***（男，45 岁，脑卒中恢复期）', device: '设备：家用血压计+智能手环（心率/活动量）', vital: '血压：132/84 mmHg、心率 76 次/分、活动量达标', time: '时间：2026-10-19 20:30', flag: '异常标记：正常（绿色，无预警）' },
    { id: 'CHM-004', patient: '患者：陈***（男，72 岁，COPD）', device: '设备：家用指夹血氧仪+峰流速仪（手动录入）', vital: '血氧 SpO2 96%、峰流速 320 L/min（基线 380）', time: '时间：2026-10-18 09:15', flag: '异常标记：峰流速下降（橙色，提示潜在加重，建议就医）' },
    { id: 'CHM-005', patient: '患者：张***（男，68 岁，冠心病）', device: '设备：智能手环（心率/夜间血氧，蓝牙回传）', vital: '静息心率 68 次/分、夜间血氧 97%、无胸闷记录', time: '时间：2026-10-20 06:50', flag: '异常标记：正常（绿色）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/followup/knowledge - 随访知识库（条目/病种/指导内容/适用阶段/更新时间）5 条 */
async function handleFuKnowledge(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FUK-001', entry: '条目：KBP-001（高血压家庭自测规范）', disease: '病种：原发性高血压', content: '指导内容：早 7 点/晚 8 点坐位静息 5 分钟后测量，记录后取周均值，避免饱餐/运动后即时测量', stage: '适用阶段：全病程（确诊后长期居家管理）', updateTime: '更新时间：2026-09-10' },
    { id: 'FUK-002', entry: '条目：KBP-002（糖尿病饮食与血糖监测宣教）', disease: '病种：2 型糖尿病', content: '指导内容：低 GI 饮食、定时定量、餐后 2h 测血糖，低血糖（＜3.9）应急处理与就医', stage: '适用阶段：确诊初期教育 + 长期强化', updateTime: '更新时间：2026-09-18' },
    { id: 'FUK-003', entry: '条目：KBP-003（PCI 术后双联抗血小板用药依从）', disease: '病种：冠心病（支架术后）', content: '指导内容：阿司匹林+氯吡格雷/替格瑞洛不可自行停药，注意出血信号，定期复查血脂肝酶', stage: '适用阶段：术后 12 个月关键期', updateTime: '更新时间：2026-08-30' },
    { id: 'FUK-004', entry: '条目：KBP-004（脑卒中二级预防与康复动作）', disease: '病种：缺血性脑卒中', content: '指导内容：规律抗血小板/他汀、血压血脂达标，居家良肢位摆放与被动关节活动，识别复发 FAST 信号', stage: '适用阶段：恢复期 + 长期预防', updateTime: '更新时间：2026-09-22' },
    { id: 'FUK-005', entry: '条目：KBP-005（COPD 吸入装置使用与急性加重识别）', disease: '病种：COPD', content: '指导内容：正确吸入三步（呼气—深吸气—屏气 10 秒），出现痰量/颜色变化、气促加重及时就医，戒烟接种疫苗', stage: '适用阶段：稳定期管理 + 加重预警', updateTime: '更新时间：2026-10-05' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m451Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/followup/plans', handle: handleFuPlans, auth: true },
  { method: 'GET', path: '/api/v1/followup/executions', handle: handleFuExecutions, auth: true },
  { method: 'GET', path: '/api/v1/followup/lost', handle: handleFuLost, auth: true },
  { method: 'GET', path: '/api/v1/chronic/targets', handle: handleChrTargets, auth: true },
  { method: 'GET', path: '/api/v1/chronic/home-monitor', handle: handleChrHomeMonitor, auth: true },
  { method: 'GET', path: '/api/v1/followup/knowledge', handle: handleFuKnowledge, auth: true },
];
