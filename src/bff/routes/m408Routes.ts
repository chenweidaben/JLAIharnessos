/**
 * 健澜科技 jlmedaios - M408 P1 业务扩展：系统管理配置深度打磨（详情版）
 *
 * 系统配置详情/菜单管理详情/数据字典详情/系统日志详情/参数管理详情/缓存管理详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/system/config-detail - 系统配置详情 5 条 */
async function handleSystemConfigDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SCD-001', configName: 'Config-001：系统名称', configValue: '值：健澜智慧医疗平台（jlmedaios）', configType: '类型：字符串（String）', description: '说明：系统的完整名称，显示在登录页、浏览器标题栏、系统首页', modifyHistory: '修改记录：2025-01-01 初始化设置（系统上线时）；2026-01-01 更新（从"健澜医院信息系统"改为"健澜智慧医疗平台"）' },
    { id: 'SCD-002', configName: 'Config-002：系统版本号', configValue: '值：v3.2.0（2026-10-20）', configType: '类型：字符串（String）', description: '说明：系统当前版本号，用于版本管理、更新提示', modifyHistory: '修改记录：2025-01-01 v1.0.0（系统上线）；2025-06-01 v2.0.0（大版本更新）；2026-01-01 v3.0.0（大版本更新）；2026-10-20 v3.2.0（小版本更新，新增 CDS 模块）' },
    { id: 'SCD-003', configName: 'Config-003：会话超时时间', configValue: '值：30 分钟（1800 秒）', configType: '类型：整数（Integer，单位：秒）', description: '说明：用户登录后，若 30 分钟内无操作，自动退出登录，保障系统安全', modifyHistory: '修改记录：2025-01-01 初始化设置（60 分钟）；2025-06-01 更新（30 分钟，安全合规要求）' },
    { id: 'SCD-004', configName: 'Config-004：密码最小长度', configValue: '值：8 位', configType: '类型：整数（Integer，单位：位）', description: '说明：用户密码的最小长度要求，密码长度不得少于 8 位', modifyHistory: '修改记录：2025-01-01 初始化设置（6 位）；2025-06-01 更新（8 位，等保 2.0 三级要求）' },
    { id: 'SCD-005', configName: 'Config-005：日志保留天数', configValue: '值：180 天', configType: '类型：整数（Integer，单位：天）', description: '说明：系统日志（操作日志、登录日志等）的保留天数，超过 180 天的日志自动归档/删除', modifyHistory: '修改记录：2025-01-01 初始化设置（90 天）；2025-06-01 更新（180 天，等保 2.0 三级要求）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/menus-detail - 菜单管理详情 5 条 */
async function handleSystemMenusDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SMD-001', menuName: 'Menu-001：门诊管理', menuPath: '路径：/outpatient', menuIcon: '图标：CalendarOutlined（门诊日历图标）', subMenus: '子菜单：1. 门诊排队（/outpatient/queue）；2. 门诊就诊（/outpatient/visits）；3. 门诊处方（/outpatient/prescriptions）', permission: '权限：outpatient:view（门诊医生、科室主任、院长可查看）' },
    { id: 'SMD-002', menuName: 'Menu-002：住院管理', menuPath: '路径：/inpatient', menuIcon: '图标：HomeOutlined（住院病房图标）', subMenus: '子菜单：1. 入院管理（/inpatient/admissions）；2. 出院管理（/inpatient/discharges）；3. 转科管理（/inpatient/transfers）', permission: '权限：inpatient:view（住院医生、科室主任、院长可查看）' },
    { id: 'SMD-003', menuName: 'Menu-003：病历管理', menuPath: '路径：/emr', menuIcon: '图标：FileTextOutlined（病历文档图标）', subMenus: '子菜单：1. 病历列表（/emr/list）；2. 病历模板（/emr/templates）；3. 病历质控（/emr/quality-check）', permission: '权限：emr:view（经治医生、质控医生、科室主任、院长可查看）' },
    { id: 'SMD-004', menuName: 'Menu-004：医保管理', menuPath: '路径：/insurance', menuIcon: '图标：InsuranceOutlined（医保盾牌图标）', subMenus: '子菜单：1. 医保政策（/insurance/policy）；2. 医保申报（/insurance/claims）；3. 医保结算（/insurance/settlement）', permission: '权限：insurance:view（医保科医生、财务科、院长可查看）' },
    { id: 'SMD-005', menuName: 'Menu-005：系统管理', menuPath: '路径：/system', menuIcon: '图标：SettingOutlined（系统设置图标）', subMenus: '子菜单：1. 系统配置（/system/config）；2. 菜单管理（/system/menus）；3. 数据字典（/system/dict）；4. 系统日志（/system/logs）', permission: '权限：system:admin（系统管理员可查看）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/dict-detail - 数据字典详情 5 条 */
async function handleSystemDictDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SDD-001', dictName: 'Dict-001：性别字典', dictCode: '编码：sys_gender', keyValues: '键值对：1. male = 男；2. female = 女；3. unknown = 未知', description: '说明：用于患者性别、医生性别等字段的下拉选择', status: '状态：启用中' },
    { id: 'SDD-002', dictName: 'Dict-002：科室字典', dictCode: '编码：sys_department', keyValues: '键值对：1. internal_medicine = 内科；2. surgery = 外科；3. pediatrics = 儿科；4. obstetrics_gynecology = 妇产科；5. cardiology = 心内科；6. neurology = 神经内科；7. orthopedics = 骨科', description: '说明：用于科室选择、医生归属科室等字段', status: '状态：启用中' },
    { id: 'SDD-003', dictName: 'Dict-003：诊断类型字典', dictCode: '编码：sys_diagnosis_type', keyValues: '键值对：1. admission = 入院诊断；2. discharge = 出院诊断；3. preoperative = 术前诊断；4. postoperative = 术后诊断', description: '说明：用于病历中诊断类型的分类', status: '状态：启用中' },
    { id: 'SDD-004', dictName: 'Dict-004：药品剂型字典', dictCode: '编码：sys_drug_form', keyValues: '键值对：1. tablet = 片剂；2. capsule = 胶囊；3. injection = 注射剂；4. oral_liquid = 口服液；5. ointment = 软膏；6. suppository = 栓剂', description: '说明：用于药品管理中药品剂型的分类', status: '状态：启用中' },
    { id: 'SDD-005', dictName: 'Dict-005：医保类型字典', dictCode: '编码：sys_insurance_type', keyValues: '键值对：1. employee = 职工医保；2. resident = 居民医保；3. self_pay = 自费；4. commercial = 商业保险', description: '说明：用于患者医保类型的分类', status: '状态：启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/logs-detail - 系统日志详情 5 条 */
async function handleSystemLogsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SLD-001', logNo: 'LOG-2026-001（登录日志）', logType: '类型：登录日志（LOGIN）', operationContent: '操作内容：用户 admin（系统管理员）登录系统；登录成功（密码验证通过）；登录时间：2026-10-20 08:00:00', user: '用户：admin（系统管理员）', ip: 'IP：192.168.1.100（院内办公网）' },
    { id: 'SLD-002', logNo: 'LOG-2026-002（操作日志）', logType: '类型：操作日志（OPERATION）', operationContent: '操作内容：医生王***（心内科）提交病历 EMR-2026-001（入院记录）；操作成功；操作时间：2026-10-20 09:30:00', user: '用户：王***（主治医师，心内科）', ip: 'IP：192.168.1.101（医生办公室）' },
    { id: 'SLD-003', logNo: 'LOG-2026-003（操作日志）', logType: '类型：操作日志（OPERATION）', operationContent: '操作内容：质控医生赵***（质控科）审核病历 EMR-2026-001；审核结果：退回修改（现病史描述不完整）；操作时间：2026-10-20 10:30:00', user: '用户：赵***（副主任医师，质控科）', ip: 'IP：192.168.1.102（质控科办公室）' },
    { id: 'SLD-004', logNo: 'LOG-2026-004（操作日志）', logType: '类型：操作日志（OPERATION）', operationContent: '操作内容：医保审核员钱***（医保科）审核医保申报 CLA-2026-001；审核结果：通过（同意医保统筹支付 15200 元）；操作时间：2026-10-20 11:00:00', user: '用户：钱***（主治医师，医保科）', ip: 'IP：192.168.1.103（医保科办公室）' },
    { id: 'SLD-005', logNo: 'LOG-2026-005（错误日志）', logType: '类型：错误日志（ERROR）', operationContent: '操作内容：医生李***（普外科）处方药品时，系统报错（数据库连接超时）；错误信息："ConnectionTimeoutError: connect ETIMEDOUT 127.0.0.1:5433"；错误时间：2026-10-20 14:30:00', user: '用户：李***（副主任医师，普外科）', ip: 'IP：192.168.1.104（普外科办公室）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/params-detail - 参数管理详情 5 条 */
async function handleSystemParamsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPD-001', paramName: 'Param-001：数据库连接字符串', paramValue: '值：postgres://postgres@127.0.0.1:5433/jlmedaios', paramType: '类型：字符串（String，连接字符串）', description: '说明：系统 PostgreSQL 数据库的连接字符串，包含主机、端口、数据库名、用户名等信息', updateTime: '更新时间：2025-01-01（系统上线时初始化，未修改）' },
    { id: 'SPD-002', paramName: 'Param-002：Redis 缓存地址', paramValue: '值：127.0.0.1:6379', paramType: '类型：字符串（String，主机:端口）', description: '说明：系统 Redis 缓存服务器的地址，用于会话存储、数据缓存等', updateTime: '更新时间：2025-01-01（系统上线时初始化，未修改）' },
    { id: 'SPD-003', paramName: 'Param-003：文件上传路径', paramValue: '值：/data/uploads/', paramType: '类型：字符串（String，文件路径）', description: '说明：系统文件上传（如病历附件、影像报告等）的存储路径', updateTime: '更新时间：2025-01-01（系统上线时初始化，未修改）' },
    { id: 'SPD-004', paramName: 'Param-004：邮件服务器地址', paramValue: '值：smtp.jlmedaios.com:465', paramType: '类型：字符串（String，主机:端口）', description: '说明：系统邮件服务器的地址，用于发送系统通知邮件（如病历审核结果、医保申报结果等）', updateTime: '更新时间：2025-06-01 从 smtp.jlmedaios.com:25 更新为 smtp.jlmedaios.com:465（SSL 加密）' },
    { id: 'SPD-005', paramName: 'Param-005：短信服务器地址', paramValue: '值：sms.jlmedaios.com:8080', paramType: '类型：字符串（String，主机:端口）', description: '说明：系统短信服务器的地址，用于发送系统通知短信（如预约提醒、随访提醒等）', updateTime: '更新时间：2025-06-01 从 sms.jlmedaios.com:8080 更新为 sms.jlmedaios.com:8080（未修改，仅记录）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/cache-detail - 缓存管理详情 5 条 */
async function handleSystemCacheDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SCD-001', cacheName: 'Cache-001：用户会话缓存（session）', keyCount: '键数：约 500 个（当前在线用户数）', size: '大小：约 5 MB（每个 session 约 10 KB）', expirePolicy: '过期策略：30 分钟无操作自动过期（与会话超时时间一致）', status: '状态：正常（缓存命中率 95%，运行正常）' },
    { id: 'SCD-002', cacheName: 'Cache-002：字典数据缓存（dict）', keyCount: '键数：约 100 个（系统字典、科室字典、性别字典等）', size: '大小：约 2 MB（每个字典约 20 KB）', expirePolicy: '过期策略：永久缓存（字典数据更新时手动刷新）', status: '状态：正常（缓存命中率 99%，运行正常）' },
    { id: 'SCD-003', cacheName: 'Cache-003：病历数据缓存（emr）', keyCount: '键数：约 200 个（当前打开的病历）', size: '大小：约 10 MB（每份病历约 50 KB）', expirePolicy: '过期策略：1 小时无访问自动过期', status: '状态：正常（缓存命中率 80%，运行正常）' },
    { id: 'SCD-004', cacheName: 'Cache-004：检验结果缓存（lab）', keyCount: '键数：约 300 个（最近 7 天的检验结果）', size: '大小：约 8 MB（每份检验结果约 25 KB）', expirePolicy: '过期策略：7 天自动过期', status: '状态：正常（缓存命中率 85%，运行正常）' },
    { id: 'SCD-005', cacheName: 'Cache-005：影像报告缓存（radiology）', keyCount: '键数：约 150 个（最近 30 天的影像报告）', size: '大小：约 15 MB（每份影像报告约 100 KB）', expirePolicy: '过期策略：30 天自动过期', status: '状态：正常（缓存命中率 75%，运行正常）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m408Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/system/config-detail', handle: handleSystemConfigDetail, auth: true },
  { method: 'GET', path: '/api/v1/system/menus-detail', handle: handleSystemMenusDetail, auth: true },
  { method: 'GET', path: '/api/v1/system/dict-detail', handle: handleSystemDictDetail, auth: true },
  { method: 'GET', path: '/api/v1/system/logs-detail', handle: handleSystemLogsDetail, auth: true },
  { method: 'GET', path: '/api/v1/system/params-detail', handle: handleSystemParamsDetail, auth: true },
  { method: 'GET', path: '/api/v1/system/cache-detail', handle: handleSystemCacheDetail, auth: true },
];
