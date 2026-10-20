/**
 * 健澜科技 jlmedaios - M417 P1 业务扩展：人力资源深度打磨（详情版）
 *
 * 员工档案详情/部门管理详情/考勤管理详情/绩效考核详情/薪酬管理详情/培训发展详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/hr/employees-detail - 员工档案详情 5 条 */
async function handleHrEmployeesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HED-001', employeeNo: 'EMP-2015-001（王***）', name: '王***（男，38 岁）', position: '岗位：心内科主任医师（科室副主任）', entryDate: '入职时间：2015-07-01（工作 11 年）', status: '状态：在职（全职，正式员工）' },
    { id: 'HED-002', employeeNo: 'EMP-2018-015（李***）', name: '李***（女，32 岁）', position: '岗位：神经内科主治医师', entryDate: '入职时间：2018-08-15（工作 8 年）', status: '状态：在职（全职，正式员工）' },
    { id: 'HED-003', employeeNo: 'EMP-2020-028（张***）', name: '张***（女，28 岁）', position: '岗位：儿科住院医师', entryDate: '入职时间：2020-09-01（工作 6 年）', status: '状态：在职（全职，正式员工）' },
    { id: 'HED-004', employeeNo: 'EMP-2012-003（赵***）', name: '赵***（男，45 岁）', position: '岗位：骨科主任医师（科室主任）', entryDate: '入职时间：2012-03-01（工作 14 年）', status: '状态：在职（全职，正式员工）' },
    { id: 'HED-005', employeeNo: 'EMP-2022-042（钱***）', name: '钱***（女，25 岁）', position: '岗位：门诊护士（护师）', entryDate: '入职时间：2022-07-01（工作 4 年）', status: '状态：在职（全职，正式员工）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/departments-detail - 部门管理详情 5 条 */
async function handleHrDepartmentsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HDD-001', deptName: 'Dept-001：心内科', head: '负责人：王***（主任医师，科室副主任）', headcount: '人数：45 人（医生 20 人，护士 25 人）', function: '职能：冠心病、高血压、心律失常等心血管疾病的诊疗与科研', status: '状态：运行中（年度门诊量 5 万人次，住院量 3000 人次）' },
    { id: 'HDD-002', deptName: 'Dept-002：神经内科', head: '负责人：刘***（主任医师，科室主任）', headcount: '人数：38 人（医生 18 人，护士 20 人）', function: '职能：脑梗死、脑出血、癫痫等神经系统疾病的诊疗与科研', status: '状态：运行中（年度门诊量 4 万人次，住院量 2500 人次）' },
    { id: 'HDD-003', deptName: 'Dept-003：骨科', head: '负责人：赵***（主任医师，科室主任）', headcount: '人数：42 人（医生 20 人，护士 22 人）', function: '职能：骨折、关节置换、脊柱疾病等骨科疾病的诊疗与手术', status: '状态：运行中（年度手术量 2000 台，住院量 2800 人次）' },
    { id: 'HDD-004', deptName: 'Dept-004：儿科', head: '负责人：孙***（主任医师，科室主任）', headcount: '人数：30 人（医生 15 人，护士 15 人）', function: '职能：儿童常见病、多发病、危重症的诊疗与儿童保健', status: '状态：运行中（年度门诊量 6 万人次，住院量 1500 人次）' },
    { id: 'HDD-005', deptName: 'Dept-005：急诊科', head: '负责人：周***（副主任医师，科室主任）', headcount: '人数：50 人（医生 25 人，护士 25 人）', function: '职能：急危重症的院前急救、院内急诊、创伤救治', status: '状态：运行中（年度急诊量 8 万人次，抢救量 2000 人次）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/attendance-detail - 考勤管理详情 5 条 */
async function handleHrAttendanceDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HAD-001', employee: '员工：王***（EMP-2015-001，心内科主任医师）', date: '日期：2026-10-20（周二）', attendance: '出勤：上午 08:00-12:00（正常出勤）；下午 14:00-17:30（正常出勤）', leave: '请假：无（全勤）', status: '状态：正常（月度出勤率 100%，全勤奖）' },
    { id: 'HAD-002', employee: '员工：李***（EMP-2018-015，神经内科主治医师）', date: '日期：2026-10-20（周二）', attendance: '出勤：上午 08:00-12:00（正常出勤）；下午 14:00-17:30（正常出勤）', leave: '请假：无（全勤）', status: '状态：正常（月度出勤率 100%，全勤奖）' },
    { id: 'HAD-003', employee: '员工：张***（EMP-2020-028，儿科住院医师）', date: '日期：2026-10-20（周二）', attendance: '出勤：上午 08:00-12:00（正常出勤）；下午 14:00-17:30（正常出勤）', leave: '请假：无（全勤）', status: '状态：正常（月度出勤率 100%，全勤奖）' },
    { id: 'HAD-004', employee: '员工：赵***（EMP-2012-003，骨科主任医师）', date: '日期：2026-10-20（周二）', attendance: '出勤：上午 08:00-12:00（手术日，在手术室）；下午 14:00-17:30（门诊）', leave: '请假：无（全勤）', status: '状态：正常（月度出勤率 100%，全勤奖）' },
    { id: 'HAD-005', employee: '员工：钱***（EMP-2022-042，门诊护士）', date: '日期：2026-10-20（周二）', attendance: '出勤：上午 08:00-12:00（正常出勤）；下午 14:00-17:30（正常出勤）', leave: '请假：事假 1 天（2026-10-19，家中有事）', status: '状态：正常（月度出勤率 95%，无全勤奖）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/performance-detail - 绩效考核详情 5 条 */
async function handleHrPerformanceDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HPD-001', employee: '员工：王***（心内科主任医师）', cycle: '考核周期：2026 年 Q3（7-9 月）', indicators: '考核指标：1. 门诊量（2500 人次，目标 2000，得分 90）；2. 住院量（300 人次，目标 250，得分 88）；3. 患者满意度（95%，目标 90%，得分 92）；4. 科研成果（发表论文 1 篇，目标 1 篇，得分 85）', score: '得分：88.75 分（总分 100 分）', grade: '等级：A（优秀，前 20%）' },
    { id: 'HPD-002', employee: '员工：李***（神经内科主治医师）', cycle: '考核周期：2026 年 Q3（7-9 月）', indicators: '考核指标：1. 门诊量（1500 人次，目标 1500，得分 85）；2. 住院量（200 人次，目标 180，得分 87）；3. 患者满意度（93%，目标 90%，得分 90）；4. 教学任务（带教实习生 2 人，目标 2 人，得分 88）', score: '得分：87.5 分（总分 100 分）', grade: '等级：B+（良好，前 40%）' },
    { id: 'HPD-003', employee: '员工：张***（儿科住院医师）', cycle: '考核周期：2026 年 Q3（7-9 月）', indicators: '考核指标：1. 门诊量（2000 人次，目标 1800，得分 88）；2. 住院量（100 人次，目标 100，得分 85）；3. 患者满意度（92%，目标 90%，得分 89）；4. 学习培训（完成培训 20 学时，目标 20 学时，得分 90）', score: '得分：88.0 分（总分 100 分）', grade: '等级：B+（良好，前 40%）' },
    { id: 'HPD-004', employee: '员工：赵***（骨科主任医师）', cycle: '考核周期：2026 年 Q3（7-9 月）', indicators: '考核指标：1. 手术量（150 台，目标 120 台，得分 92）；2. 门诊量（1000 人次，目标 800，得分 90）；3. 患者满意度（96%，目标 90%，得分 95）；4. 科研成果（申报课题 1 项，目标 1 项，得分 88）', score: '得分：91.25 分（总分 100 分）', grade: '等级：A（优秀，前 20%）' },
    { id: 'HPD-005', employee: '员工：钱***（门诊护士）', cycle: '考核周期：2026 年 Q3（7-9 月）', indicators: '考核指标：1. 护理工作量（1500 人次，目标 1500，得分 85）；2. 患者满意度（94%，目标 90%，得分 91）；3. 护理质量（零差错，目标零差错，得分 95）；4. 团队协作（科室互评，得分 88）', score: '得分：89.75 分（总分 100 分）', grade: '等级：A（优秀，前 20%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/salary-detail - 薪酬管理详情 5 条 */
async function handleHrSalaryDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HSD-001', employee: '员工：王***（心内科主任医师）', month: '月份：2026 年 9 月', baseSalary: '基本工资：15000 元/月', performance: '绩效工资：8000 元/月（Q3 考核 A 级，系数 1.2）', netPay: '实发工资：23000 元（扣除社保 3000 元、公积金 2000 元、个税 500 元）' },
    { id: 'HSD-002', employee: '员工：李***（神经内科主治医师）', month: '月份：2026 年 9 月', baseSalary: '基本工资：10000 元/月', performance: '绩效工资：5000 元/月（Q3 考核 B+ 级，系数 1.0）', netPay: '实发工资：15000 元（扣除社保 2000 元、公积金 1500 元、个税 300 元）' },
    { id: 'HSD-003', employee: '员工：张***（儿科住院医师）', month: '月份：2026 年 9 月', baseSalary: '基本工资：8000 元/月', performance: '绩效工资：4000 元/月（Q3 考核 B+ 级，系数 1.0）', netPay: '实发工资：12000 元（扣除社保 1500 元、公积金 1000 元、个税 200 元）' },
    { id: 'HSD-004', employee: '员工：赵***（骨科主任医师）', month: '月份：2026 年 9 月', baseSalary: '基本工资：18000 元/月', performance: '绩效工资：10000 元/月（Q3 考核 A 级，系数 1.2）', netPay: '实发工资：28000 元（扣除社保 3500 元、公积金 2500 元、个税 800 元）' },
    { id: 'HSD-005', employee: '员工：钱***（门诊护士）', month: '月份：2026 年 9 月', baseSalary: '基本工资：6000 元/月', performance: '绩效工资：3000 元/月（Q3 考核 A 级，系数 1.2）', netPay: '实发工资：9000 元（扣除社保 1200 元、公积金 800 元、个税 100 元）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/training-detail - 培训发展详情 5 条 */
async function handleHrTrainingDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HTD-001', employee: '员工：王***（心内科主任医师）', trainingItem: '培训项目：冠心病介入治疗进展（国家级继续医学教育项目）', hours: '学时：16 学时（2026-09-15 至 2026-09-17）', score: '成绩：95 分（优秀）', certificate: '证书：国家级 I 类学分 4 分（已获得证书）' },
    { id: 'HTD-002', employee: '员工：李***（神经内科主治医师）', trainingItem: '培训项目：脑梗死诊治新进展（省级继续医学教育项目）', hours: '学时：12 学时（2026-08-20 至 2026-08-21）', score: '成绩：88 分（良好）', certificate: '证书：省级 I 类学分 3 分（已获得证书）' },
    { id: 'HTD-003', employee: '员工：张***（儿科住院医师）', trainingItem: '培训项目：儿童呼吸道疾病诊治规范（院级培训）', hours: '学时：8 学时（2026-09-10）', score: '成绩：90 分（优秀）', certificate: '证书：院级培训证书（已获得证书）' },
    { id: 'HTD-004', employee: '员工：赵***（骨科主任医师）', trainingItem: '培训项目：关节置换手术技术进展（国家级继续医学教育项目）', hours: '学时：20 学时（2026-07-10 至 2026-07-12）', score: '成绩：96 分（优秀）', certificate: '证书：国家级 I 类学分 5 分（已获得证书）' },
    { id: 'HTD-005', employee: '员工：钱***（门诊护士）', trainingItem: '培训项目：门诊护理服务规范（院级培训）', hours: '学时：6 学时（2026-09-05）', score: '成绩：92 分（优秀）', certificate: '证书：院级培训证书（已获得证书）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m417Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/hr/employees-detail', handle: handleHrEmployeesDetail, auth: true },
  { method: 'GET', path: '/api/v1/hr/departments-detail', handle: handleHrDepartmentsDetail, auth: true },
  { method: 'GET', path: '/api/v1/hr/attendance-detail', handle: handleHrAttendanceDetail, auth: true },
  { method: 'GET', path: '/api/v1/hr/performance-detail', handle: handleHrPerformanceDetail, auth: true },
  { method: 'GET', path: '/api/v1/hr/salary-detail', handle: handleHrSalaryDetail, auth: true },
  { method: 'GET', path: '/api/v1/hr/training-detail', handle: handleHrTrainingDetail, auth: true },
];
