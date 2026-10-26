/**
 * 健澜科技 jlmedaios - 用户操作手册聚合器（M132-B，产品化收尾）
 *
 * 本模块是「按角色操作手册」的纯函数核心：
 *  - getUserManual(role): 按角色组装手册（目录 toc + 章节正文 chapters）；
 *  - 覆盖五类角色：doctor 医生 / nurse 护士 / pharmacist 药师 / admin 管理员 / patient 患者；
 *  - 全员章节（登录、工作台、数据安全）对所有角色可见，角色专属章节按 audience 过滤。
 *
 * 纯函数设计：不读环境、不查库、无副作用，便于单测断言与构建期静态生成。
 * 后续接入 CMS/知识库时，仅替换内容盘 USER_MANUAL_CHAPTERS 来源，getUserManual 签名不变。
 *
 * 【产品化收尾】手册版本号、版权、目录结构与前端 Manual 页一一对应。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================================================================
 * 类型契约
 * ========================================================================== */

/** 手册可见角色（'all' 表示对所有角色开放；'patient' 同时覆盖患者端） */
export type ManualRole = 'doctor' | 'nurse' | 'pharmacist' | 'admin' | 'patient';

/** 章节受众标记：'all' 全员可见，或显式列出角色 */
export type Audience = 'all' | ManualRole;

/** 单步操作 */
export interface ManualStep {
  /** 步骤序号（从 1 开始） */
  no: number;
  /** 步骤标题 */
  title: string;
  /** 操作说明（演示就绪，纯文本） */
  detail: string;
}

/** 手册章节（一个操作主题） */
export interface ManualChapter {
  /** 章节唯一 id（目录锚点用） */
  id: string;
  /** 章节标题 */
  title: string;
  /** 章节一句话简介 */
  summary: string;
  /** 可见角色集合（'all' 表示全员可见） */
  audience: Audience[];
  /** 操作步骤 */
  steps: ManualStep[];
  /** 注意事项 / 红线（合规与安全） */
  cautions: string[];
  /** 检索标签 */
  tags: string[];
}

/** 目录条目（左侧目录树的一个叶子） */
export interface ManualTocItem {
  /** 对应章节 id */
  id: string;
  /** 章节标题 */
  title: string;
  /** 该章节步骤数（目录上的角标） */
  stepCount: number;
}

/** getUserManual 总产出 */
export interface Manual {
  /** 手册标题 */
  title: string;
  /** 手册版本（产品化收尾：与发布物同步） */
  version: string;
  /** 实际生效角色（入参归一化后） */
  role: ManualRole;
  /** 角色中文显示名 */
  roleLabel: string;
  /** 生成时间（ISO） */
  generatedAt: string;
  /** 版权 */
  copyright: string;
  /** 当前角色可见的目录（已过滤） */
  toc: ManualTocItem[];
  /** 当前角色可见的章节正文（已过滤，与 toc 同序） */
  chapters: ManualChapter[];
  /** 章节总数 */
  totalChapters: number;
  /** 步骤总数（展平） */
  totalSteps: number;
}

/* ============================================================================
 * 内容盘（演示就绪；后续可替换为 CMS/知识库拉取，纯函数签名不变）
 * ========================================================================== */

/** 手册版本号【产品化收尾】 */
export const MANUAL_VERSION = 'v1.0.0';

/** 版权声明【产品化收尾】 */
export const MANUAL_COPYRIGHT = '© 2026 杭州健澜科技有限公司 版权所有';

/** 全部手册章节（内容盘快照） */
export const USER_MANUAL_CHAPTERS: ManualChapter[] = [
  /* ------------------------------ 全员通用 ------------------------------ */
  {
    id: 'common-login',
    title: '登录与账号',
    summary: '使用工号或患者账号登录工作台，首次登录强制改密与 MFA 绑定。',
    audience: ['all'],
    tags: ['登录', '密码', 'MFA', '账号'],
    steps: [
      {
        no: 1,
        title: '打开登录页',
        detail: '在浏览器输入院内工作台地址，或打开患者端小程序/APP；员工请使用「员工登录」，患者请使用「患者登录」。',
      },
      {
        no: 2,
        title: '输入凭证',
        detail: '员工输入工号 + 初始密码；患者输入手机号 + 短信验证码，或医保电子凭证扫码登录。',
      },
      {
        no: 3,
        title: '首次登录改密',
        detail: '首次登录会强制修改初始密码（8 位以上，含大小写与数字），并完成手机绑定用于 MFA。',
      },
      {
        no: 4,
        title: '忘记密码',
        detail: '员工在登录页点「忘记密码」，经科室管理员重置初始密码；患者通过绑定手机短信自助重置。',
      },
    ],
    cautions: [
      '严禁共用账号、严禁在私人设备保存密码。',
      '连续 5 次密码错误将锁定账号 15 分钟，需联系管理员解锁。',
    ],
  },
  {
    id: 'common-workbench',
    title: '工作台概览',
    summary: '登录后默认进入「我的工作台」，按角色呈现待办、快捷入口与消息通知。',
    audience: ['all'],
    tags: ['工作台', '待办', '导航'],
    steps: [
      {
        no: 1,
        title: '认识工作台布局',
        detail: '左侧为业务导航，顶部为搜索与消息铃铛，中部为待办卡片，右侧为 Personal Agent 对话入口。',
      },
      {
        no: 2,
        title: '处理待办',
        detail: '点击待办卡片直接进入对应业务单据；已处理事项自动从待办列表移除。',
      },
      {
        no: 3,
        title: '使用 Personal Agent',
        detail: '在右侧对话窗用自然语言下达指令，例如「帮我写一份入院记录」「查一下今日预约」，Agent 会调起业务模块并回填草稿。',
      },
      {
        no: 4,
        title: '切换视图',
        detail: '员工可在左上角切换门诊 / 住院 / 管理视图；患者在「我的」页管理就诊人信息。',
      },
    ],
    cautions: [
      '离开工位请立即锁屏（Win+L），患者数据不得在公共屏幕久留。',
    ],
  },
  {
    id: 'common-security',
    title: '数据安全与隐私',
    summary: '所有操作留痕审计，患者数据按最小必要原则可见，越权访问将被拒绝并记录。',
    audience: ['all'],
    tags: ['数据安全', '隐私', '审计', '权限'],
    steps: [
      {
        no: 1,
        title: '最小必要访问',
        detail: '仅查看本科室或被授权患者；跨科会诊需走会诊/授权申请，审批通过后临时授权、到期自动回收。',
      },
      {
        no: 2,
        title: '导出与外发',
        detail: '病历、检验报告等导出需填写用途并经科室主任审批；严禁通过私人微信/邮箱外发患者数据。',
      },
      {
        no: 3,
        title: '操作留痕',
        detail: '登录、查看、修改、导出均写入审计日志；日志只读、不可篡改，保留周期按制度执行。',
      },
      {
        no: 4,
        title: '异常上报',
        detail: '发现账号异常登录或数据泄露迹象，立即锁屏并上报信息科安全值班。',
      },
    ],
    cautions: [
      '严禁在私人设备、私人云盘存储或传输患者数据。',
      '严禁截图病历界面发至任何外部群聊。',
    ],
  },

  /* ------------------------------ 医生专属 ------------------------------ */
  {
    id: 'doctor-outpatient',
    title: '门诊接诊',
    summary: '叫号后进入接诊单，完成主诉采集、诊断、检查与处方开具。',
    audience: ['doctor'],
    tags: ['门诊', '叫号', '接诊', '诊断'],
    steps: [
      {
        no: 1,
        title: '叫号接诊',
        detail: '在门诊工作站按叫号顺序接诊；点击患者姓名进入接诊单，先查看主诉与既往史卡片。',
      },
      {
        no: 2,
        title: '书写病历',
        detail: '使用 Personal Agent 口述生成门诊病历草稿，核对主诉、现病史、查体、诊断后签名。',
      },
      {
        no: 3,
        title: '开具检查检验',
        detail: '按诊断开具检查/检验申请单；Agent 会基于诊断给出合理用药与检查建议，确认后一键带入。',
      },
      {
        no: 4,
        title: '提交并打印',
        detail: '确认收费类别（医保/自费）后提交，患者缴费后检查检验与处方生效。',
      },
    ],
    cautions: [
      '诊断与处方需本人电子签名，严禁代签。',
      '门诊病历保存时限按法规执行，不得删除或篡改。',
    ],
  },
  {
    id: 'doctor-inpatient',
    title: '住院管床',
    summary: '按床位查看管床患者，完成查房、病程记录与医嘱开具。',
    audience: ['doctor'],
    tags: ['住院', '管床', '查房', '病程'],
    steps: [
      {
        no: 1,
        title: '查看管床列表',
        detail: '切换到住院视图，按床号查看本人管床患者；异常检验值置顶标红。',
      },
      {
        no: 2,
        title: '查房记录',
        detail: '让 Agent 汇总「昨夜至今晨变化」生成病程记录草稿，核对后签名；术后患者需连续病程记录。',
      },
      {
        no: 3,
        title: '开具医嘱',
        detail: '在医嘱单开立长期/临时医嘱；系统自动做相互作用、剂量、过敏筛查，拦截项按建议调整或填写理由保留。',
      },
      {
        no: 4,
        title: '危急值处理',
        detail: '危急值弹窗需在规定时限内查看、复述并处理签名，形成闭环。',
      },
    ],
    cautions: [
      '精麻毒药品医嘱需双签并核对患者身份证。',
      '危急值未闭环前不得下班，需在交班时明确交接。',
    ],
  },
  {
    id: 'doctor-prescription',
    title: '处方开具与审方',
    summary: '处方提交前系统自动筛查，药师审核通过后发药。',
    audience: ['doctor'],
    tags: ['处方', '审方', '拦截', '精麻药品'],
    steps: [
      {
        no: 1,
        title: '开具处方',
        detail: '在处方笺选择药品、剂量、用法、疗程；Agent 自动校验相互作用与过敏史。',
      },
      {
        no: 2,
        title: '处理拦截',
        detail: '出现红色拦截时按建议调整用药；确需保留的需填写理由并提交药师人工干预。',
      },
      {
        no: 3,
        title: '提交审方',
        detail: '处方提交后进入药师审方队列；审核未通过会退回「待修改」，按退回意见修改后重提。',
      },
    ],
    cautions: [
      '精麻药品处方不得超过规定极量，处方笺单独留存。',
      '同一患者重复开药需在处方备注说明理由。',
    ],
  },
  {
    id: 'doctor-emr',
    title: '病历书写与签名',
    summary: '电子病历按时限完成书写与三级医师签名，满足电子病历分级评价要求。',
    audience: ['doctor'],
    tags: ['病历', '签名', '三级查房', '质控'],
    steps: [
      {
        no: 1,
        title: '按时限书写',
        detail: '入院记录 24 小时内完成，首次病程 8 小时内完成，日常病程按病情分级时限书写。',
      },
      {
        no: 2,
        title: 'AI 草稿与人工核对',
        detail: '使用 AI 病历草稿时必须逐条核对主诉、查体、诊断与医嘱的一致性，不得直接采纳。',
      },
      {
        no: 3,
        title: '三级签名',
        detail: '住院医师书写后，主治医师、主任医师按查房节点逐级电子签名。',
      },
      {
        no: 4,
        title: '质控整改',
        detail: '病历质控退回的缺陷项需在规定时限内整改并重新提交。',
      },
    ],
    cautions: [
        '已签名病历不得直接修改，需走「病历修改申请」并留痕。',
    ],
  },

  /* ------------------------------ 护士专属 ------------------------------ */
  {
    id: 'nurse-handoff',
    title: '床边交班（SBAR）',
    summary: '按 SBAR 结构生成交班单，危重患者书面 + 口头双交班。',
    audience: ['nurse'],
    tags: ['交班', 'SBAR', '危重', '签名'],
    steps: [
      {
        no: 1,
        title: '生成交班单',
        detail: '在交班模块按 SBAR（现状-背景-评估-建议）自动生成本班患者交班单草稿。',
      },
      {
        no: 2,
        title: '床边核对',
        detail: '携带交班单到床边，与下一班护士共同核对患者身份、管路、皮肤、特殊用药。',
      },
      {
        no: 3,
        title: '双签名',
        detail: '交接双方电子签名；危急值、特殊管路在交班单高亮，漏交会被系统拦截提醒。',
      },
    ],
    cautions: [
      '危重患者必须书面 + 口头双交班，不得仅口头交接。',
      '未签名的交班单视为未完成交班，影响下班排班。',
    ],
  },
  {
    id: 'nurse-nursing-note',
    title: '护理记录录入',
    summary: '按时间轴录入生命体征与护理措施，体温单数据自动回传。',
    audience: ['nurse'],
    tags: ['护理记录', '生命体征', '体温单', '签名'],
    steps: [
      {
        no: 1,
        title: '录入生命体征',
        detail: '在护理记录模块按测量时间录入体温、脉搏、呼吸、血压；可对接手持终端自动采集。',
      },
      {
        no: 2,
        title: '记录护理措施',
        detail: '录入用药、输液、皮肤护理、病情观察；可让 Agent 依据医嘱生成草稿，核对后签名。',
      },
      {
        no: 3,
        title: '体温单回传',
        detail: '体温单数据自动汇总回传，无需重复录入；异常值自动标红提示。',
      },
    ],
    cautions: [
      '护理记录需实时完成，不得事后补记或涂改。',
    ],
  },
  {
    id: 'nurse-med-admin',
    title: '医嘱执行与三查七对',
    summary: '执行医嘱前扫码核对腕带，给药后实时记录执行时间与执行人。',
    audience: ['nurse'],
    tags: ['医嘱执行', '三查七对', '扫码', '皮试'],
    steps: [
      {
        no: 1,
        title: '核对医嘱',
        detail: '在执行队列核对患者、药品、剂量、用法、时间，执行「三查七对」。',
      },
      {
        no: 2,
        title: '扫码确认',
        detail: '扫描患者腕带与药品条码，系统比对一致后允许执行；不一致将拦截。',
      },
      {
        no: 3,
        title: '记录执行',
        detail: '给药后实时记录执行时间、执行人、滴速；皮试结果需在规定时间内回填。',
      },
    ],
    cautions: [
      '皮试结果未回填不得执行后续用药。',
      '口服/静脉/皮试分类留痕，不得跨类别补录。',
    ],
  },

  /* ------------------------------ 药师专属 ------------------------------ */
  {
    id: 'pharmacy-review',
    title: '处方审核',
    summary: '在审方队列逐张审核医生处方，拦截不合理用药。',
    audience: ['pharmacist'],
    tags: ['审方', '处方', '相互作用', '拦截'],
    steps: [
      {
        no: 1,
        title: '打开审方队列',
        detail: '在药师工作站进入「待审处方」队列，按时间先后处理；急诊处方优先。',
      },
      {
        no: 2,
        title: '核对要点',
        detail: '核对诊断与用药一致性、剂量、疗程、相互作用、过敏史、重复用药；系统已预筛红色拦截项。',
      },
      {
        no: 3,
        title: '通过或退回',
        detail: '合理处方点击「通过」流转至调配；不合理处方点击「退回」并填写退回意见，医生修改后重提。',
      },
      {
        no: 4,
        title: '特殊管理药品',
        detail: '精麻毒药品处方单独审核，核对身份证、处方权医师资质与极量。',
      },
    ],
    cautions: [
      '审方记录全程留痕，不得代审或批量通过。',
      '疑似用药错误需立即电话联系开方医生，不得直接放行。',
    ],
  },
  {
    id: 'pharmacy-dispense',
    title: '药品调配与发药',
    summary: '按已审处方调配药品，扫码核对后发药并做用药交代。',
    audience: ['pharmacist'],
    tags: ['调配', '发药', '扫码', '用药交代'],
    steps: [
      {
        no: 1,
        title: '接收调配单',
        detail: '在调配工作站接收已审处方；按药品货位拣药，系统提示近效期优先。',
      },
      {
        no: 2,
        title: '扫码核对',
        detail: '逐盒扫描药品条码与处方条码，核对品名、规格、数量；不一致拦截。',
      },
      {
        no: 3,
        title: '发药与交代',
        detail: '患者取药时核对取药号/身份证，当面交代用法用量、储存条件与常见不良反应。',
      },
    ],
    cautions: [
      '麻精药品调配需双人复核、双签名。',
      '发出药品不得退回药房（除非原包装未拆封且按制度登记）。',
    ],
  },
  {
    id: 'pharmacy-adr',
    title: '不良反应（ADR）上报',
    summary: '发现药品不良反应按规定时限上报国家 ADR 监测系统。',
    audience: ['pharmacist'],
    tags: ['ADR', '不良反应', '上报', '监测'],
    steps: [
      {
        no: 1,
        title: '收集病例',
        detail: '从医生护士反馈或患者随访中收集不良反应病例，记录用药与反应时间线。',
      },
      {
        no: 2,
        title: '填写报告',
        detail: '在 ADR 模块填写患者信息、怀疑药品、反应表现、处理与转归；死亡/严重病例立即上报。',
      },
      {
        no: 3,
        title: '随访归档',
        detail: '跟踪转归并补充随访结果，报告自动归档至药学部与国家监测系统。',
      },
    ],
    cautions: [
      '严重 ADR 15 日内、死亡病例立即上报，不得迟报漏报。',
    ],
  },

  /* ------------------------------ 管理员专属 ------------------------------ */
  {
    id: 'admin-account',
    title: '账号与权限配置',
    summary: '维护科室、角色、账号与数据字典，权限按最小必要原则下发。',
    audience: ['admin'],
    tags: ['账号', '角色', '权限', '数据字典'],
    steps: [
      {
        no: 1,
        title: '新增账号',
        detail: '在管理后台录入员工工号、姓名、科室、角色模板；新账号默认仅本科室只读。',
      },
      {
        no: 2,
        title: '分配权限',
        detail: '业务权限走申请审批流；跨科授权设置有效期，到期自动回收。',
      },
      {
        no: 3,
        title: '停用与解锁',
        detail: '员工离职立即停用账号；密码错误锁定的账号在安全确认后解锁。',
      },
      {
        no: 4,
        title: '维护数据字典',
        detail: '维护科室、职称、诊断、药品等数据字典变更，变更需双人复核后发布。',
      },
    ],
    cautions: [
      '管理员账号不得同时用于业务操作，遵守权限分离原则。',
    ],
  },
  {
    id: 'admin-monitor',
    title: '运行监控与告警',
    summary: '监控大盘查看接口耗时、错误率、Agent 队列与数据库连接。',
    audience: ['admin'],
    tags: ['监控', '告警', '大盘', '扩容'],
    steps: [
      {
        no: 1,
        title: '查看监控大盘',
        detail: '每日早高峰前查看接口 P95 耗时、5xx 错误率、Agent 任务队列长度、数据库连接池。',
      },
      {
        no: 2,
        title: '处理告警',
        detail: '红色阈值告警按告警指引扩容、限流或回滚；发布窗口内变更需在变更登记留痕。',
      },
      {
        no: 3,
        title: '巡检日志',
        detail: '每日巡检错误日志与慢查询，形成运维日报。',
      },
    ],
    cautions: [
      '生产环境变更必须走变更登记与灰度发布，禁止直接热修。',
    ],
  },
  {
    id: 'admin-audit',
    title: '审计日志与合规',
    summary: '审计日志记录登录、越权尝试、关键数据导出与权限变更，支持检索与导出留证。',
    audience: ['admin'],
    tags: ['审计', '日志', '导出', '合规'],
    steps: [
      {
        no: 1,
        title: '检索日志',
        detail: '按人、时间、操作类型、患者号检索审计日志；支持组合条件。',
      },
      {
        no: 2,
        title: '调查越权',
        detail: '对越权访问尝试、异常导出进行调查，形成调查报告并通知安全负责人。',
      },
      {
        no: 3,
        title: '导出留证',
        detail: '配合监管检查时导出指定时段日志，导出动作本身也写入审计。',
      },
    ],
    cautions: [
      '审计日志只读、不可篡改，保留周期按法规执行。',
    ],
  },

  /* ------------------------------ 患者专属 ------------------------------ */
  {
    id: 'patient-appointment',
    title: '挂号与预约',
    summary: '在患者端小程序预约号源、签到取号、退号改约。',
    audience: ['patient'],
    tags: ['挂号', '预约', '签到', '退号'],
    steps: [
      {
        no: 1,
        title: '选择科室与医生',
        detail: '在小程序「挂号」页选择院区、科室、医生与日期，查看剩余号源。',
      },
      {
        no: 2,
        title: '确认就诊人并支付',
        detail: '选择就诊人（本人/亲属），确认费用后在线支付；医保患者可走医保移动支付。',
      },
      {
        no: 3,
        title: '到院签到',
        detail: '就诊当日提前 15 分钟到院，在自助机或小程序签到取号，等待叫号。',
      },
      {
        no: 4,
        title: '退号改约',
        detail: '就诊前一日 24:00 前可在小程序自助退号退款；就诊当日退号需到窗口办理。',
      },
    ],
    cautions: [
      '就诊人信息需与身份证一致，儿童就诊需绑定监护人。',
    ],
  },
  {
    id: 'patient-report',
    title: '报告查询与缴费',
    summary: '在线查看检验检查报告、缴费记录与电子票据。',
    audience: ['patient'],
    tags: ['报告', '检验', '缴费', '电子票据'],
    steps: [
      {
        no: 1,
        title: '查看报告',
        detail: '在「报告」页查看已出的检验、检查报告；危急值报告会同步弹窗提示复诊。',
      },
      {
        no: 2,
        title: '在线缴费',
        detail: '在「缴费」页查看待缴费用清单，支持医保个账与微信/支付宝支付。',
      },
      {
        no: 3,
        title: '下载电子票据',
        detail: '缴费完成后在「票据」页下载电子发票，可用于医保报销与商保理赔。',
      },
    ],
    cautions: [
      '报告解读请结合面诊，异常指标请及时复诊，不要自行解读用药。',
    ],
  },
  {
    id: 'patient-consult',
    title: '在线咨询与随访',
    summary: '通过图文/电话咨询主治医生，接收出院随访与用药提醒。',
    audience: ['patient'],
    tags: ['在线咨询', '随访', '用药提醒', '复诊'],
    steps: [
      {
        no: 1,
        title: '发起咨询',
        detail: '在「在线咨询」选择就诊过的医生，按指引发送症状描述与照片，医生在工作时间内回复。',
      },
      {
        no: 2,
        title: '接收随访',
        detail: '出院后护士/医生通过小程序推送随访问卷与用药提醒，请按时填写。',
      },
      {
        no: 3,
        title: '预约复诊',
        detail: '随访中医生建议复诊时，可直接在对话中点入复诊号源预约。',
      },
    ],
    cautions: [
      '在线咨询不替代急诊；出现胸痛、呼吸困难等急症请立即拨打 120。',
    ],
  },
];

/* ============================================================================
 * 纯函数
 * ========================================================================== */

/** 合法角色集合 */
const VALID_ROLES: readonly ManualRole[] = ['doctor', 'nurse', 'pharmacist', 'admin', 'patient'];

/** 角色中文显示名映射【产品化收尾】 */
const ROLE_LABELS: Record<ManualRole, string> = {
  doctor: '医生',
  nurse: '护士',
  pharmacist: '药师',
  admin: '管理员',
  patient: '患者',
};

/**
 * 归一化入参角色：合法角色原样返回；未知/空值回退 'doctor'。
 * （'all' 仅用于内容盘 audience 标记，不作为终端入参。）
 */
export function normalizeManualRole(raw: string | undefined | null): ManualRole {
  const head = (raw ?? '').trim().toLowerCase();
  if ((VALID_ROLES as readonly string[]).includes(head)) return head as ManualRole;
  return 'doctor';
}

/** 判断章节对某角色是否可见（audience 含 'all' 或含该角色） */
export function isChapterVisible(chapter: ManualChapter, role: ManualRole): boolean {
  return chapter.audience.includes('all') || chapter.audience.includes(role);
}

/**
 * 按角色组装操作手册（纯函数，演示就绪）。
 *
 * @param roleRaw 入参角色（doctor/nurse/pharmacist/admin/patient，未知回退 doctor）
 * @param now     生成时间（可注入便于测试，默认当前时间）
 * @returns       结构完整的 Manual（toc 与 chapters 同序、同 id）
 */
export function getUserManual(
  roleRaw?: string | null,
  now: string = new Date().toISOString(),
): Manual {
  const role = normalizeManualRole(roleRaw);
  const chapters = USER_MANUAL_CHAPTERS.filter((c) => isChapterVisible(c, role));
  const toc: ManualTocItem[] = chapters.map((c) => ({
    id: c.id,
    title: c.title,
    stepCount: c.steps.length,
  }));
  const totalSteps = chapters.reduce((n, c) => n + c.steps.length, 0);
  return {
    title: '健澜AI原生医院操作系统OS · 用户操作手册',
    version: MANUAL_VERSION,
    role,
    roleLabel: ROLE_LABELS[role],
    generatedAt: now,
    copyright: MANUAL_COPYRIGHT,
    toc,
    chapters,
    totalChapters: chapters.length,
    totalSteps,
  };
}
