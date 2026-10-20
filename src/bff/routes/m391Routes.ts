/**
 * 健澜科技 jlmedaios - M391 P1 业务扩展：科研教学深度打磨（详情版）
 *
 * 科研项目详情/科研论文详情/科研经费详情/科研奖项详情/教学课程详情/教学培训详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/research/projects-detail - 科研项目详情 5 条 */
async function handleResearchProjectsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RPD-001', projectName: '基于 AI 的肺癌早期诊断系统研发（国家自然科学基金面上项目）', principalInvestigator: '呼吸科主任张***（主任医师）', participants: '呼吸科医生李***、放射科医生王***、算法工程师刘***、研究生陈***（共 4 人）', funding: '60 万元（国家自然科学基金资助，项目周期 2026-2029）', milestones: '2026Q4: 完成数据采集与标注（已完成）；2027Q2: 完成模型训练（进行中）；2028Q4: 完成临床验证（待启动）' },
    { id: 'RPD-002', projectName: '基于大数据的慢性病管理平台研发（浙江省科技厅重点研发项目）', principalInvestigator: '内分泌科主任王***（主任医师）', participants: '内分泌科医生刘***、信息科工程师赵***、社区医生孙***（共 3 人）', funding: '100 万元（浙江省科技厅资助，项目周期 2026-2028）', milestones: '2026Q3: 完成需求调研（已完成）；2027Q1: 完成平台开发（进行中）；2028Q2: 完成试点应用（待启动）' },
    { id: 'RPD-003', projectName: '基于物联网的智慧病房建设研究（杭州市卫健委科研项目）', principalInvestigator: '护理部主任周***（主任护师）', participants: '护士吴***、设备科工程师郑***、信息科工程师王***（共 3 人）', funding: '30 万元（杭州市卫健委资助，项目周期 2026-2027）', milestones: '2026Q2: 完成方案设计（已完成）；2026Q4: 完成设备安装（进行中）；2027Q2: 完成效果评估（待启动）' },
    { id: 'RPD-004', projectName: '中医药治疗糖尿病肾病的临床研究（院级科研项目）', principalInvestigator: '中医科主任陈***（主任医师）', participants: '中医科医生林***、肾内科医生黄***、研究生吴***（共 3 人）', funding: '10 万元（院级科研基金资助，项目周期 2026-2027）', milestones: '2026Q3: 完成伦理审批（已完成）；2027Q1: 完成病例入组（进行中）；2027Q4: 完成数据分析（待启动）' },
    { id: 'RPD-005', projectName: '基于 5G 的远程手术指导系统研发（院级科研项目）', principalInvestigator: '外科主任刘***（主任医师）', participants: '外科医生赵***、信息科工程师钱***、设备科工程师孙***（共 3 人）', funding: '15 万元（院级科研基金资助，项目周期 2026-2027）', milestones: '2026Q2: 完成方案设计（已完成）；2026Q4: 完成系统开发（进行中）；2027Q2: 完成临床测试（待启动）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/research/papers-detail - 科研论文详情 5 条 */
async function handleResearchPapersDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RPD-002', paperName: '基于深度学习的肺癌 CT 影像自动诊断系统研究（英文论文）', authors: '张***（通讯作者）、李***、王***、刘***（共 4 人）', journal: '《Nature Medicine》（影响因子：87.2）', impactFactor: '87.2（顶级期刊，影响因子极高）', abstract: '本研究开发了一套基于深度学习的肺癌 CT 影像自动诊断系统，在 1000 例临床病例中验证，诊断准确率达到 95%，优于放射科医生平均水平（85%），该系统可显著提高肺癌早期诊断效率' },
    { id: 'RPD-006', paperName: '基于大数据的糖尿病患者血糖管理模型研究（英文论文）', authors: '王***（通讯作者）、刘***、赵***、孙***（共 4 人）', journal: '《Diabetes Care》（影响因子：19.2）', impactFactor: '19.2（顶级期刊，影响因子高）', abstract: '本研究基于 10000 例糖尿病患者的大数据，开发了一套血糖管理模型，可预测患者血糖波动趋势，帮助医生制定个性化治疗方案，临床应用效果显著' },
    { id: 'RPD-007', paperName: '智慧病房建设对护理质量影响的研究（中文核心期刊）', authors: '周***（通讯作者）、吴***、郑***、王***（共 4 人）', journal: '《中华护理杂志》（影响因子：3.5）', impactFactor: '3.5（中文核心期刊，影响因子中等）', abstract: '本研究通过对照试验，评估智慧病房建设对护理质量的影响，结果显示智慧病房可提高护理效率 20%，降低护理差错率 30%，患者满意度提升 10%' },
    { id: 'RPD-008', paperName: '中医药治疗糖尿病肾病的临床疗效观察（中文核心期刊）', authors: '陈***（通讯作者）、林***、黄***、吴***（共 4 人）', journal: '《中国中西医结合杂志》（影响因子：2.8）', impactFactor: '2.8（中文核心期刊，影响因子中等）', abstract: '本研究纳入 100 例糖尿病肾病患者，随机分为治疗组（中医药治疗）和对照组（常规治疗），结果显示治疗组疗效优于对照组，可显著改善患者肾功能' },
    { id: 'RPD-009', paperName: '基于 5G 的远程手术指导系统临床应用研究（中文核心期刊）', authors: '刘***（通讯作者）、赵***、钱***、孙***（共 4 人）', journal: '《中华外科杂志》（影响因子：3.2）', impactFactor: '3.2（中文核心期刊，影响因子中等）', abstract: '本研究开发了一套基于 5G 的远程手术指导系统，在 50 例手术中应用，结果显示该系统可实现高清视频实时传输，帮助上级医院专家指导基层医院手术，提高基层医院手术水平' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/research/funds-detail - 科研经费详情 5 条 */
async function handleResearchFundsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RFD-001', projectName: '基于 AI 的肺癌早期诊断系统研发（国家自然科学基金面上项目）', fundingSource: '国家自然科学基金委员会（资助金额：60 万元）', receivedAmount: '已到账 30 万元（2026 年 1 月到账首期经费）', expenseDetails: '设备费：10 万元（GPU 服务器）；数据采集费：5 万元（病例数据采集与标注）；差旅费：2 万元（学术会议交流）；其他：3 万元', balance: '余额：20 万元（已支出 10 万元）' },
    { id: 'RFD-002', projectName: '基于大数据的慢性病管理平台研发（浙江省科技厅重点研发项目）', fundingSource: '浙江省科技厅（资助金额：100 万元）', receivedAmount: '已到账 50 万元（2026 年 3 月到账首期经费）', expenseDetails: '设备费：20 万元（服务器 + 存储设备）；软件开发费：15 万元（平台开发外包）；差旅费：5 万元（社区调研）；其他：10 万元', balance: '余额：35 万元（已支出 15 万元）' },
    { id: 'RFD-003', projectName: '基于物联网的智慧病房建设研究（杭州市卫健委科研项目）', fundingSource: '杭州市卫生健康委员会（资助金额：30 万元）', receivedAmount: '已到账 15 万元（2026 年 2 月到账首期经费）', expenseDetails: '设备费：10 万元（物联网传感器）；安装调试费：3 万元；差旅费：1 万元；其他：1 万元', balance: '余额：5 万元（已支出 10 万元）' },
    { id: 'RFD-004', projectName: '中医药治疗糖尿病肾病的临床研究（院级科研项目）', fundingSource: '院级科研基金（资助金额：10 万元）', receivedAmount: '已到账 10 万元（2026 年 1 月全额到账）', expenseDetails: '试剂费：3 万元（中医药试剂）；检查费：4 万元（患者实验室检查）；差旅费：1 万元；其他：2 万元', balance: '余额：0 万元（已支出 10 万元）' },
    { id: 'RFD-005', projectName: '基于 5G 的远程手术指导系统研发（院级科研项目）', fundingSource: '院级科研基金（资助金额：15 万元）', receivedAmount: '已到账 15 万元（2026 年 1 月全额到账）', expenseDetails: '设备费：8 万元（5G 设备 + 高清摄像头）；软件开发费：5 万元（系统开发）；差旅费：1 万元；其他：1 万元', balance: '余额：0 万元（已支出 15 万元）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/research/awards-detail - 科研奖项详情 5 条 */
async function handleResearchAwardsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RAD-001', awardName: '浙江省科技进步一等奖（基于 AI 的肺癌早期诊断系统）', recipient: '呼吸科主任张***（第一完成人）', level: '省级一等奖（浙江省人民政府颁发）', citation: '该项目在肺癌早期诊断领域取得重大突破，诊断准确率达到国际领先水平，具有显著的临床应用价值和社会经济效益', certificateNumber: 'ZJ-KJ-2026-001（证书编号）' },
    { id: 'RAD-002', awardName: '杭州市科技进步二等奖（基于大数据的慢性病管理平台）', recipient: '内分泌科主任王***（第一完成人）', level: '市级二等奖（杭州市人民政府颁发）', citation: '该项目在慢性病管理领域取得重要进展，可显著提高慢性病管理效率，具有较好的临床应用价值', certificateNumber: 'HZ-KJ-2026-002（证书编号）' },
    { id: 'RAD-003', awardName: '中华护理学会科技奖三等奖（智慧病房建设研究）', recipient: '护理部主任周***（第一完成人）', level: '学会三等奖（中华护理学会颁发）', citation: '该项目在智慧护理领域取得一定进展，可提高护理质量和效率，具有较好的推广应用价值', certificateNumber: 'ZH-HL-2026-003（证书编号）' },
    { id: 'RAD-004', awardName: '浙江省中医药科技奖二等奖（中医药治疗糖尿病肾病）', recipient: '中医科主任陈***（第一完成人）', level: '省级二等奖（浙江省中医药管理局颁发）', citation: '该项目在中医药治疗糖尿病肾病领域取得较好疗效，为糖尿病肾病患者提供了新的治疗选择', certificateNumber: 'ZJ-ZY-2026-004（证书编号）' },
    { id: 'RAD-005', awardName: '院级科研成果一等奖（基于 5G 的远程手术指导系统）', recipient: '外科主任刘***（第一完成人）', level: '院级一等奖（医院颁发）', citation: '该项目在远程手术指导领域取得重要进展，可帮助基层医院提高手术水平，具有较好的临床应用前景', certificateNumber: 'YJ-KY-2026-005（证书编号）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/courses-detail - 教学课程详情 5 条 */
async function handleTeachingCoursesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TCD-001', courseName: '内科学（本科临床医学专业核心课程）', teacher: '内科主任赵***（教授）', syllabus: '第 1 章: 呼吸系统疾病（8 学时）；第 2 章: 循环系统疾病（12 学时）；第 3 章: 消化系统疾病（10 学时）；第 4 章: 泌尿系统疾病（8 学时）；第 5 章: 内分泌系统疾病（8 学时）', creditHours: '46 学时（理论 30 学时 + 实践 16 学时）', assessmentMethod: '平时成绩（30%）+ 期中考试（20%）+ 期末考试（50%）' },
    { id: 'TCD-002', courseName: '外科学（本科临床医学专业核心课程）', teacher: '外科主任钱***（教授）', syllabus: '第 1 章: 外科基础（6 学时）；第 2 章: 麻醉学（4 学时）；第 3 章: 普外科学（12 学时）；第 4 章: 骨外科学（8 学时）；第 5 章: 胸外科学（6 学时）', creditHours: '36 学时（理论 24 学时 + 实践 12 学时）', assessmentMethod: '平时成绩（30%）+ 期中考试（20%）+ 期末考试（50%）' },
    { id: 'TCD-003', courseName: '妇产科学（本科临床医学专业核心课程）', teacher: '妇产科主任孙***（教授）', syllabus: '第 1 章: 妇科学（10 学时）；第 2 章: 产科学（12 学时）；第 3 章: 计划生育（4 学时）', creditHours: '26 学时（理论 18 学时 + 实践 8 学时）', assessmentMethod: '平时成绩（30%）+ 期中考试（20%）+ 期末考试（50%）' },
    { id: 'TCD-004', courseName: '儿科学（本科临床医学专业核心课程）', teacher: '儿科主任李***（教授）', syllabus: '第 1 章: 新生儿疾病（6 学时）；第 2 章: 呼吸系统疾病（6 学时）；第 3 章: 消化系统疾病（4 学时）；第 4 章: 心血管系统疾病（4 学时）', creditHours: '20 学时（理论 14 学时 + 实践 6 学时）', assessmentMethod: '平时成绩（30%）+ 期中考试（20%）+ 期末考试（50%）' },
    { id: 'TCD-005', courseName: '医学影像学（本科临床医学专业核心课程）', teacher: '放射科主任周***（教授）', syllabus: '第 1 章: X 线诊断（6 学时）；第 2 章: CT 诊断（8 学时）；第 3 章: MRI 诊断（6 学时）；第 4 章: 超声诊断（4 学时）', creditHours: '24 学时（理论 16 学时 + 实践 8 学时）', assessmentMethod: '平时成绩（30%）+ 期中考试（20%）+ 期末考试（50%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/training-detail - 教学培训详情 5 条 */
async function handleTeachingTrainingDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TTD-001', trainingName: '住院医师规范化培训（内科方向）', lecturer: '内科主任赵***（教授）', syllabus: '第 1 阶段: 内科基础理论（3 个月）；第 2 阶段: 内科临床技能（6 个月）；第 3 阶段: 内科专科轮转（6 个月）；第 4 阶段: 综合考核（3 个月）', creditHours: '18 个月（共 540 学时，含理论 180 学时 + 临床 360 学时）', assessmentResult: '结业考核通过率：95%（2025 年培训学员 20 人，19 人通过考核）' },
    { id: 'TTD-002', trainingName: '护士规范化培训（新入职护士）', lecturer: '护理部主任周***（主任护师）', syllabus: '第 1 阶段: 护理基础理论（1 个月）；第 2 阶段: 护理操作技能（2 个月）；第 3 阶段: 临床科室轮转（6 个月）；第 4 阶段: 综合考核（1 个月）', creditHours: '10 个月（共 300 学时，含理论 100 学时 + 临床 200 学时）', assessmentResult: '结业考核通过率：98%（2025 年培训学员 50 人，49 人通过考核）' },
    { id: 'TTD-003', trainingName: '全科医生转岗培训（基层医生）', lecturer: '全科主任吴***（教授）', syllabus: '第 1 阶段: 全科医学基础理论（2 个月）；第 2 阶段: 临床科室轮转（6 个月）；第 3 阶段: 社区实践（3 个月）；第 4 阶段: 综合考核（1 个月）', creditHours: '12 个月（共 360 学时，含理论 120 学时 + 临床 240 学时）', assessmentResult: '结业考核通过率：90%（2025 年培训学员 10 人，9 人通过考核）' },
    { id: 'TTD-004', trainingName: '医院感染控制培训（全院医护人员）', lecturer: '院感科主任郑***（副主任医师）', syllabus: '第 1 章: 医院感染基础知识（2 学时）；第 2 章: 手卫生规范（2 学时）；第 3 章: 消毒隔离技术（2 学时）；第 4 章: 医疗废物管理（2 学时）', creditHours: '8 学时（理论培训，每年 1 次）', assessmentResult: '考核通过率：100%（2026 年培训 500 人，全部通过考核）' },
    { id: 'TTD-005', trainingName: '医疗质量安全培训（全院医护人员）', lecturer: '质控科主任王***（副主任医师）', syllabus: '第 1 章: 医疗质量安全核心制度（4 学时）；第 2 章: 医疗纠纷防范（2 学时）；第 3 章: 病历书写规范（2 学时）', creditHours: '8 学时（理论培训，每年 1 次）', assessmentResult: '考核通过率：100%（2026 年培训 500 人，全部通过考核）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m391Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/research/projects-detail', handle: handleResearchProjectsDetail, auth: true },
  { method: 'GET', path: '/api/v1/research/papers-detail', handle: handleResearchPapersDetail, auth: true },
  { method: 'GET', path: '/api/v1/research/funds-detail', handle: handleResearchFundsDetail, auth: true },
  { method: 'GET', path: '/api/v1/research/awards-detail', handle: handleResearchAwardsDetail, auth: true },
  { method: 'GET', path: '/api/v1/teaching/courses-detail', handle: handleTeachingCoursesDetail, auth: true },
  { method: 'GET', path: '/api/v1/teaching/training-detail', handle: handleTeachingTrainingDetail, auth: true },
];
