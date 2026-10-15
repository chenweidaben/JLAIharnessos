/**
 * 健澜科技 jlmedaios - 系统帮助中心聚合器（M147-D，生产就绪）
 *
 * 「知识图谱与患者教育」模块：帮助中心沉淀高频操作路径、患者教育问答与
 * 系统快捷键，面向医生 / 护士 / 管理员全员开放，是 Personal Agent 的前置
 * 自助入口。本模块为「纯函数核心」：不连库、无副作用、可直接单测。
 *
 * 对外契约（纯函数）：
 *  - buildHelpCenter(role, page): 按角色 + 分面（page）组装帮助内容；
 *  - searchHelp(keyword, role):  在该角色可见内容内做标题/标签/正文检索。
 *
 * 内容四大板块：
 *  1. features  功能介绍 —— 平台核心能力（含知识图谱、患者教育）；
 *  2. steps     操作步骤 —— 每个高频任务「三步完成」；
 *  3. faq       常见问题 FAQ —— 22 条真实高频问答；
 *  4. shortcuts 快捷键 —— 桌面端效率热键。
 *
 * 角色过滤规则：某条 HelpItem 对角色 R 可见，当且仅当 audience 含 'all' 或含 R。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 帮助中心可见角色（'all' 表示对所有角色开放） */
export type HelpRole = 'doctor' | 'nurse' | 'admin' | 'all';

/** 帮助内容四大分面 */
export type HelpCategory = 'features' | 'steps' | 'faq' | 'shortcuts';

/** 帮助条目（功能/步骤/FAQ/快捷键统一建模） */
export interface HelpItem {
  /** 条目唯一 id（目录锚点 / 搜索去重用） */
  id: string;
  /** 所属分面 */
  category: HelpCategory;
  /** 条目标题 */
  title: string;
  /** 正文说明 */
  body: string;
  /** 检索标签 */
  tags: string[];
  /** 可见角色集合（'all' 全员可见） */
  audience: HelpRole[];
  /** category === 'steps' 时的三步操作（恰好 3 步） */
  steps?: string[];
  /** category === 'shortcuts' 时的热键 */
  shortcut?: string;
}

/** buildHelpCenter 总产出 */
export interface HelpContent {
  /** 实际生效角色（入参归一化后） */
  role: HelpRole;
  /** 实际生成分面（入参归一化后；'all' 表示全部） */
  page: HelpCategory | 'all';
  /** 生成时间（ISO，可注入便于测试） */
  generatedAt: string;
  /** 功能介绍 */
  features: HelpItem[];
  /** 三步操作 */
  steps: HelpItem[];
  /** 常见问题 FAQ */
  faq: HelpItem[];
  /** 快捷键 */
  shortcuts: HelpItem[];
  /** 当前角色可见条目总数 */
  total: number;
}

/* ------------------------------- 内容盘（生产就绪） ------------------------------- */

/**
 * 全部帮助条目（内置知识库快照；后续替换为 CMS / 知识图谱拉取时，
 * buildHelpCenter / searchHelp 签名保持不变）。
 *
 * 「知识图谱与患者教育」：features 中 feat-graph / feat-edu 直接对应
 * 知识图谱辅助诊断与患者教育随访能力。
 */
export const HELP_ITEMS: HelpItem[] = [
  /* ============ 一、功能介绍 ============ */
  {
    id: 'feat-agent',
    category: 'features',
    title: 'Personal Agent 对话式工作台',
    body: 'Personal Agent 是你的对话式工作助手：用自然语言说「帮我写一份入院记录」「看下 3 床今天的化验」，它会调起对应业务模块并回填草稿，经你确认、修改、采纳三步闭环后入档。',
    tags: ['Personal Agent', '对话', '智能体', '工作台'],
    audience: ['all'],
  },
  {
    id: 'feat-graph',
    category: 'features',
    title: '知识图谱辅助诊断',
    body: '「知识图谱与患者教育」核心能力之一：系统将症状、诊断、检验、药品、指南条目关联成知识图谱，接诊时在右侧给出鉴别诊断与用药证据链，所有建议均可溯源到指南条目，不替代医生决策。',
    tags: ['知识图谱', '辅助诊断', '鉴别诊断', '指南'],
    audience: ['doctor', 'nurse'],
  },
  {
    id: 'feat-edu',
    category: 'features',
    title: '患者教育与随访',
    body: '「知识图谱与患者教育」面向患者侧：出院后系统按病种推送个性化宣教材料与复诊提醒，患者在手机端阅读打卡，医生可在后台查看阅读率与依从性，形成院内外连续照护。',
    tags: ['患者教育', '随访', '宣教', '依从性'],
    audience: ['all'],
  },
  {
    id: 'feat-ai-record',
    category: 'features',
    title: 'AI 智能病历',
    body: '依据病程、医嘱与检验结果自动生成入院记录、病程小结与出院草稿；体温单、护理记录数据自动回传，减少重复录入。所有 AI 草稿必须经医生核对签名后才生效。',
    tags: ['AI 病历', '病程', '出院小结', '草稿'],
    audience: ['doctor'],
  },
  {
    id: 'feat-critical',
    category: 'features',
    title: '危急值闭环管理',
    body: '检验/检查危急值一经触发，立即弹窗 + 声音提醒并置顶工单。系统按规定时限倒计时督办，超时未闭环自动升级上报科主任，全程留痕可追溯。',
    tags: ['危急值', '闭环', '督办', '超时升级'],
    audience: ['doctor', 'nurse'],
  },
  {
    id: 'feat-secure',
    category: 'features',
    title: '数据安全与审计',
    body: '患者数据按最小必要原则可见，越权访问被拒绝并记录；所有关键操作留痕审计，支持按人/时间/操作检索。离开工位请锁屏，严禁共用账号或在私人设备导出病历。',
    tags: ['数据安全', '权限', '审计', '合规'],
    audience: ['all'],
  },

  /* ============ 二、操作步骤（三步完成） ============ */
  {
    id: 'step-admission',
    category: 'steps',
    title: '三步完成一份入院记录',
    body: '首次管床时用 Personal Agent 快速成稿，再人工核对签名，平均 3 分钟完成。',
    tags: ['入院记录', 'Personal Agent', '签名'],
    audience: ['doctor'],
    steps: [
      '对 Personal Agent 说「为该患者生成入院记录草稿」，选择患者与病区',
      '核对并补全主诉、现病史与既往史，修正 Agent 草稿中的表述',
      '电子签名提交入档，系统自动归档到患者 360 视图',
    ],
  },
  {
    id: 'step-prescription',
    category: 'steps',
    title: '三步开具一张处方',
    body: '处方提交前系统自动做相互作用、剂量、过敏三重筛查。',
    tags: ['处方', '审方', '开药'],
    audience: ['doctor'],
    steps: [
      '在接诊单上选定或录入诊断（ICD 编码自动联想）',
      '确认 Agent 给出的用药与剂量建议，按患者情况调整',
      '提交审方，通过后由药房发药；被拦截时按建议调整或填写理由保留',
    ],
  },
  {
    id: 'step-handoff',
    category: 'steps',
    title: '三步完成床边交班（SBAR）',
    body: '危重患者必须书面 + 口头双交班并双方签名。',
    tags: ['交班', 'SBAR', '护理'],
    audience: ['nurse'],
    steps: [
      '在交班台选中本班患者，危急值与特殊管路自动高亮',
      '按 SBAR（现状-背景-评估-建议）结构生成交班草稿并核对',
      '交班人与接班护士双签名，漏交项将被系统拦截提醒',
    ],
  },
  {
    id: 'step-critical',
    category: 'steps',
    title: '三步处理一个危急值',
    body: '危急值需在规定时限内处置并回访，全程倒计时督办。',
    tags: ['危急值', '处置', '回访'],
    audience: ['doctor', 'nurse'],
    steps: [
      '在提醒中心确认接收危急值弹窗，系统开始倒计时',
      '立即处置并在病程/护理记录中填写处置措施',
      '规定时限内回访患者并标记闭环，超时自动升级上报',
    ],
  },
  {
    id: 'step-consult',
    category: 'steps',
    title: '三步发起一次会诊',
    body: '跨科会诊走线上申请，避免口头委托留痕缺失。',
    tags: ['会诊', '跨科', '申请'],
    audience: ['doctor'],
    steps: [
      '打开患者 360 视图，点击「发起会诊」',
      '填写会诊目的、病情摘要与期望回复时限',
      '推送目标科室并在会诊单跟踪回复，结果回写病历',
    ],
  },

  /* ============ 三、常见问题 FAQ（22 条，覆盖高频操作） ============ */
  {
    id: 'faq-login',
    category: 'faq',
    title: '登录失败 / 验证码收不到',
    body: '先确认工号与密码大小写；连续输错 5 次会临时锁定 15 分钟。短信/邮件验证码延迟超过 1 分钟可点「重新发送」；仍无法登录请联系信息科并提供登录时间。',
    tags: ['登录', '验证码', '锁定'],
    audience: ['all'],
  },
  {
    id: 'faq-password',
    category: 'faq',
    title: '忘记密码如何重置',
    body: '登录页点「忘记密码」，通过绑定手机/邮箱自助重置；未绑定账号需由科室管理员在后台重置初始密码，首次登录会强制改密。',
    tags: ['密码', '重置', '忘记密码'],
    audience: ['all'],
  },
  {
    id: 'faq-loading',
    category: 'faq',
    title: '页面一直转圈 / 数据不显示',
    body: '先刷新一次；若持续转圈，查看右上角健康标识是否为绿色。红色说明服务异常，请勿重复提交，等待恢复并按告警提示处理，超过 5 分钟报信息科。',
    tags: ['转圈', '刷新', '健康检查'],
    audience: ['all'],
  },
  {
    id: 'faq-permission',
    category: 'faq',
    title: '看不到某个患者或功能',
    body: '这是权限隔离：你仅能看到本科室或被授权患者。需要跨科查看请走会诊/授权申请，审批通过后临时授权，到期自动回收。',
    tags: ['权限', '看不到', '授权', '会诊'],
    audience: ['all'],
  },
  {
    id: 'faq-intercept',
    category: 'faq',
    title: '处方被系统拦截怎么办',
    body: '拦截源于相互作用、超剂量或过敏史。请按弹窗建议调整药品/剂量；确需保留时填写临床理由并双签，理由会进入审方留痕。',
    tags: ['处方', '拦截', '相互作用', '审方'],
    audience: ['doctor'],
  },
  {
    id: 'faq-narcotic',
    category: 'faq',
    title: '精麻药品为什么要双签',
    body: '麻醉、第一类精神药品按法规需开方人与核对人双签，并核对患者身份与身份证。双签缺失时处方无法提交，这是硬性合规校验，不能跳过。',
    tags: ['精麻药品', '双签', '合规'],
    audience: ['doctor', 'nurse', 'admin'],
  },
  {
    id: 'faq-critical',
    category: 'faq',
    title: '危急值需要多久内处理',
    body: '按医院制度，临床危急值一般要求 10 分钟内接收、及时处置并在规定时限内回访闭环。系统按此倒计时督办，超时自动升级科主任。',
    tags: ['危急值', '时限', '督办'],
    audience: ['doctor', 'nurse'],
  },
  {
    id: 'faq-agent',
    category: 'faq',
    title: '如何让 Personal Agent 帮我写病历',
    body: '在工作台对话框直接描述需求，例如「为 3 床生成今日病程小结」。Agent 会调取该患者近 24 小时病情生成草稿，你核对修改后采纳签名即可。',
    tags: ['Personal Agent', '病历', '病程'],
    audience: ['doctor', 'nurse'],
  },
  {
    id: 'faq-handoff',
    category: 'faq',
    title: '交班单在哪里生成',
    body: '进入护理工作台「交班」模块，系统按班次自动汇总本科患者；确认后按 SBAR 生成交班草稿，双签名发布。历史交班单可在「交班记录」检索。',
    tags: ['交班', 'SBAR', '护理'],
    audience: ['nurse'],
  },
  {
    id: 'faq-skin',
    category: 'faq',
    title: '皮试结果未回填能否继续给药',
    body: '不能。皮试结果未回填时系统会拦截后续相关用药医嘱，这是安全校验。请先在医嘱执行模块回填皮试阴性/阳性，阳性者同时触发替代药品提示。',
    tags: ['皮试', '医嘱执行', '拦截'],
    audience: ['nurse', 'doctor'],
  },
  {
    id: 'faq-temp',
    category: 'faq',
    title: '体温单数据没有自动回传',
    body: '先确认体温数据已在护理记录模块保存；体温单每日固定时段汇总。若仍缺失，检查是否漏测未录入；连续缺失联系信息科核对物联网采集设备。',
    tags: ['体温单', '回传', '护理记录'],
    audience: ['nurse'],
  },
  {
    id: 'faq-crossdept',
    category: 'faq',
    title: '如何申请跨科查看患者',
    body: '在患者 360 视图点「申请授权」，选择科室、事由与期限，提交后由对方科室管理员审批。审批期间该患者对您临时可见，到期自动回收。',
    tags: ['跨科', '授权', '申请'],
    audience: ['doctor', 'nurse'],
  },
  {
    id: 'faq-export',
    category: 'faq',
    title: '病历 / 检验报告如何导出打印',
    body: '在患者 360 视图选择「导出」，支持 PDF 病历夹与单张报告。导出操作会记入审计日志；外发需经科室审批，严禁将患者数据拷贝到私人设备。',
    tags: ['导出', '打印', 'PDF', '审计'],
    audience: ['all'],
  },
  {
    id: 'faq-notify',
    category: 'faq',
    title: '消息 / 待办没有提醒',
    body: '先检查浏览器是否允许通知；其次在「个人设置-消息提醒」确认开关。工作台右上角铃铛可查看全部未读，被静音的会话会在列表置灰标注。',
    tags: ['消息', '通知', '待办'],
    audience: ['all'],
  },
  {
    id: 'faq-todo',
    category: 'faq',
    title: '我的待办事项在哪里',
    body: '工作台「待办」页集中展示待审处方、危急值回访、交班未闭环与会诊回复。也可直接问 Personal Agent「今天我有哪些待办」。',
    tags: ['待办', '工作台', '提醒'],
    audience: ['all'],
  },
  {
    id: 'faq-search',
    category: 'faq',
    title: '搜不到某条诊断或药品',
    body: '全局搜索支持拼音首字母与模糊匹配；若仍搜不到，可能是该药品未在本院目录或诊断编码未维护。诊断/药品字典问题请报信息科补充。',
    tags: ['搜索', '诊断', '药品', '字典'],
    audience: ['doctor', 'nurse', 'admin'],
  },
  {
    id: 'faq-edit',
    category: 'faq',
    title: '已签名的记录写错了怎么改',
    body: '已签名记录不可直接删除，需发起「修改/纠错」流程：写明修改原因，经上级医师审批后留痕修订，原内容以划线方式保留，全程可追溯。',
    tags: ['修改', '纠错', '留痕'],
    audience: ['doctor', 'nurse'],
  },
  {
    id: 'faq-mfa',
    category: 'faq',
    title: '换手机后 MFA 如何重新绑定',
    body: '在登录页选择「更换验证设备」，用原手机短信或备用邮箱验证后重新绑定；原手机已不可用时，联系科室管理员在后台解除旧绑定，再由本人重新扫码绑定。',
    tags: ['MFA', '换绑', '两步验证'],
    audience: ['all'],
  },
  {
    id: 'faq-print',
    category: 'faq',
    title: '打印报告单样式错乱',
    body: '优先使用系统「打印」按钮的内置模板，不要用浏览器自带打印。错乱时检查浏览器缩放是否为 100%；仍异常请清空浏览器缓存后重试。',
    tags: ['打印', '报告', '样式'],
    audience: ['all'],
  },
  {
    id: 'faq-switch',
    category: 'faq',
    title: '如何切换门诊 / 住院视图',
    body: '工作台左上角视图切换器可在门诊、住院、管理视图间切换；当前角色无权限的视图不显示。切换后左侧目录与待办会随视图刷新。',
    tags: ['视图', '门诊', '住院', '切换'],
    audience: ['all'],
  },
  {
    id: 'faq-feedback',
    category: 'faq',
    title: 'AI 建议不准确如何反馈',
    body: '在 Agent 建议卡片点「反馈」，选择不准的具体原因（诊断/用药/表述），可补充说明。反馈会进入模型优化队列，不影响你本次采纳的结果。',
    tags: ['AI', '反馈', '建议'],
    audience: ['doctor', 'nurse'],
  },
  {
    id: 'faq-cache',
    category: 'faq',
    title: '界面显示异常 / 如何清缓存',
    body: '按 Ctrl+R 刷新一次；布局错乱或数据陈旧时，在「个人设置-高级」点「清除本地缓存」后重新登录。切勿直接删除浏览器所有数据，以免影响其他站点。',
    tags: ['缓存', '刷新', '界面'],
    audience: ['all'],
  },

  /* ============ 四、快捷键 ============ */
  {
    id: 'sc-save',
    category: 'shortcuts',
    title: '保存当前病历 / 表单',
    body: '在病历、表单、交班单等编辑页快速保存草稿，无需滚动到底部点保存按钮。',
    tags: ['保存', '草稿'],
    audience: ['all'],
    shortcut: 'Ctrl + S',
  },
  {
    id: 'sc-search',
    category: 'shortcuts',
    title: '全局搜索（患者 / 诊断 / 药品）',
    body: '快速唤起全局搜索框，支持患者姓名、住院号、诊断与药品名模糊检索。',
    tags: ['搜索', '全局'],
    audience: ['all'],
    shortcut: 'Ctrl + K',
  },
  {
    id: 'sc-help',
    category: 'shortcuts',
    title: '打开帮助中心',
    body: '随时呼出本帮助中心，按关键字查找操作路径与 FAQ。',
    tags: ['帮助', '快捷键'],
    audience: ['all'],
    shortcut: 'Ctrl + /',
  },
  {
    id: 'sc-sign',
    category: 'shortcuts',
    title: '电子签名',
    body: '在待签名页面快速唤起电子签名确认框，等同于点击「签名」按钮。',
    tags: ['签名', '电子签名'],
    audience: ['doctor', 'nurse', 'admin'],
    shortcut: 'F2',
  },
  {
    id: 'sc-submit',
    category: 'shortcuts',
    title: '提交当前表单',
    body: '在表单编辑完成后快速提交，避免鼠标寻找提交按钮。',
    tags: ['提交', '表单'],
    audience: ['all'],
    shortcut: 'Ctrl + Enter',
  },
  {
    id: 'sc-reload',
    category: 'shortcuts',
    title: '刷新当前页面数据',
    body: '当数据疑似陈旧时快速重新拉取列表与详情，等同于浏览器刷新。',
    tags: ['刷新', '数据'],
    audience: ['all'],
    shortcut: 'Ctrl + R',
  },
  {
    id: 'sc-close',
    category: 'shortcuts',
    title: '关闭弹窗 / 抽屉',
    body: '关闭当前打开的弹窗、抽屉或下拉面板，回到主列表。',
    tags: ['关闭', '弹窗'],
    audience: ['all'],
    shortcut: 'Esc',
  },
  {
    id: 'sc-new',
    category: 'shortcuts',
    title: '新建工单 / 申请',
    body: '快速新建会诊申请、授权申请等工单，省去点击「新建」按钮。',
    tags: ['新建', '工单'],
    audience: ['doctor', 'nurse', 'admin'],
    shortcut: 'Alt + N',
  },
];

/* ------------------------------- 纯函数 ------------------------------- */

/** 合法终端角色集合 */
const VALID_ROLES: readonly HelpRole[] = ['doctor', 'nurse', 'admin'];

/** 合法分面集合 */
const VALID_PAGES: readonly HelpCategory[] = ['features', 'steps', 'faq', 'shortcuts'];

/**
 * 归一化入参角色：合法角色原样返回；未知/空值回退为 'doctor'。
 * （'all' 仅用于内容盘 audience 标记，不作为终端入参。）
 */
export function normalizeHelpRole(raw: string | undefined | null): HelpRole {
  const head = (raw ?? '').trim().toLowerCase();
  if ((VALID_ROLES as readonly string[]).includes(head)) return head as HelpRole;
  return 'doctor';
}

/** 归一化入参分面：合法分面原样返回；未知/空值回退为 'all'（全部）。 */
export function normalizeHelpPage(raw: string | undefined | null): HelpCategory | 'all' {
  const head = (raw ?? '').trim().toLowerCase();
  if ((VALID_PAGES as readonly string[]).includes(head)) return head as HelpCategory;
  return 'all';
}

/** 判断条目对某角色是否可见（audience 含 'all' 或含该角色） */
export function isHelpItemVisible(item: HelpItem, role: HelpRole): boolean {
  return item.audience.includes('all') || item.audience.includes(role);
}

/** 按角色取出可见条目（内部复用，供 build / search 共用） */
function visibleItems(roleRaw: string | undefined | null): HelpItem[] {
  const role = normalizeHelpRole(roleRaw);
  return HELP_ITEMS.filter((it) => isHelpItemVisible(it, role));
}

/**
 * 按角色 + 分面组装帮助中心内容（纯函数）。
 * @param roleRaw  入参角色（doctor/nurse/admin，未知回退 doctor）
 * @param pageRaw  入参分面（features/steps/faq/shortcuts，未知回退 all）
 * @param now      生成时间（可注入便于测试，默认当前时间）
 */
export function buildHelpCenter(
  roleRaw?: string | null,
  pageRaw?: string | null,
  now: string = new Date().toISOString(),
): HelpContent {
  const role = normalizeHelpRole(roleRaw);
  const page = normalizeHelpPage(pageRaw);
  const visible = visibleItems(roleRaw);

  const bucket = (cat: HelpCategory): HelpItem[] => visible.filter((it) => it.category === cat);
  const content: HelpContent = {
    role,
    page,
    generatedAt: now,
    features: bucket('features'),
    steps: bucket('steps'),
    faq: bucket('faq'),
    shortcuts: bucket('shortcuts'),
    total: visible.length,
  };

  // 指定分面时，仅返回该分面，其余分面置空（total 仍为该角色可见总数）
  if (page !== 'all') {
    content.features = page === 'features' ? content.features : [];
    content.steps = page === 'steps' ? content.steps : [];
    content.faq = page === 'faq' ? content.faq : [];
    content.shortcuts = page === 'shortcuts' ? content.shortcuts : [];
  }
  return content;
}

/**
 * 在该角色可见内容内检索（纯函数）。
 * 命中优先级：标题 > 标签 > 正文；空关键字返回空数组；每条至多命中一次。
 * @param keyword 检索关键字（去空白、大小写不敏感）
 * @param roleRaw  入参角色（决定检索范围，未知回退 doctor）
 */
export function searchHelp(keyword: string, roleRaw?: string | null): HelpItem[] {
  const q = (keyword ?? '').trim().toLowerCase();
  if (!q) return [];

  const out: HelpItem[] = [];
  for (const item of visibleItems(roleRaw)) {
    const hitTitle = item.title.toLowerCase().includes(q);
    const hitTag = !hitTitle && item.tags.some((t) => t.toLowerCase().includes(q));
    const hitBody = !hitTitle && !hitTag && item.body.toLowerCase().includes(q);
    if (hitTitle || hitTag || hitBody) out.push(item);
  }
  return out;
}
