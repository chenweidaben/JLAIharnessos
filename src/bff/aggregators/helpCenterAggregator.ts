/**
 * 健澜科技 jlmedaios - 系统帮助中心聚合器（M125-D，演示就绪）
 *
 * 帮助中心是「纯函数核心」：不连库、无副作用、可直接单测。
 *  - buildHelpContent(role): 按角色组装帮助目录（左侧目录）+ 正文（右侧内容）；
 *  - searchHelp(keyword, content): 在已组装内容内做标题/标签/正文检索。
 *
 * 内容盘（演示就绪，与线上帮助文档同结构，后续替换为 CMS 拉取即可）：
 *  1. 新员工入职指南（如何使用 Personal Agent）——对所有角色可见；
 *  2. 医生操作手册（门诊 / 住院 / 处方）——仅 doctor；
 *  3. 护士操作手册（交班 / 护理记录）——仅 nurse；
 *  4. 管理员手册（配置 / 监控 / 审计）——仅 admin；
 *  5. 常见问题 FAQ——对所有角色可见。
 *
 * 角色过滤规则：某分节对角色 R 可见，当且仅当 audience 含 'all' 或含 R。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 帮助中心可见角色（'all' 表示对所有角色开放） */
export type HelpRole = 'doctor' | 'nurse' | 'admin' | 'newbie' | 'all';

/** 帮助文章（单篇正文） */
export interface HelpArticle {
  /** 文章唯一 id（目录锚点用） */
  id: string;
  /** 文章标题 */
  title: string;
  /** 正文（演示就绪，纯文本/分段由前端渲染） */
  body: string;
  /** 检索标签 */
  tags: string[];
}

/** 帮助分节（左侧目录的一个分组） */
export interface HelpSection {
  /** 分节唯一 id */
  id: string;
  /** 分节标题 */
  title: string;
  /** 分节图标名（前端按名映射深海蓝 VI 图标） */
  icon: string;
  /** 可见角色集合（'all' 表示全员可见） */
  audience: HelpRole[];
  /** 分节一句话简介 */
  summary: string;
  /** 分节下文章 */
  articles: HelpArticle[];
}

/** buildHelpContent 总产出 */
export interface HelpContent {
  /** 实际生效角色（入参归一化后） */
  role: HelpRole;
  /** 生成时间（ISO） */
  generatedAt: string;
  /** 当前角色可见的分节（已过滤） */
  sections: HelpSection[];
  /** 展平后的文章总数 */
  totalArticles: number;
  /** 展平后的文章列表（便于搜索/前端渲染） */
  articles: HelpArticle[];
}

/** searchHelp 单条命中结果 */
export interface HelpSearchResult {
  article: HelpArticle;
  /** 所属分节 id */
  sectionId: string;
  /** 所属分节标题 */
  sectionTitle: string;
  /** 命中字段：title / tag / body */
  hitOn: 'title' | 'tag' | 'body';
}

/* ------------------------------- 内容盘（演示就绪） ------------------------------- */

/** 全部帮助分节（演示就绪快照；后续可替换为 CMS/知识库拉取，纯函数签名不变） */
export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'sec-onboarding',
    title: '新员工入职指南',
    icon: 'rocket',
    audience: ['all'],
    summary: '第一次登录？用 10 分钟跑通 Personal Agent，把日常工作交给对话式助手。',
    articles: [
      {
        id: 'onb-login',
        title: '首次登录与工作台',
        body: '使用工号 + 初始密码登录工作台，首次登录会强制修改密码并完成手机绑定（MFA）。登录后默认进入「我的工作台」，左上角可切换门诊 / 住院 / 管理视图。',
        tags: ['登录', '工作台', '初始密码', 'MFA'],
      },
      {
        id: 'onb-agent',
        title: '认识 Personal Agent',
        body: 'Personal Agent 是你的对话式工作助手：直接用自然语言说「帮我写一份入院记录」「看下 3 床今天的化验」，它会调起对应业务模块并回填草稿。首次使用建议先完成 3 分钟引导演练，熟悉确认 / 修改 / 采纳三步闭环。',
        tags: ['Personal Agent', '对话', '智能体', '引导'],
      },
      {
        id: 'onb-task',
        title: '任务提醒与待办',
        body: '工作台「待办」集中展示待审处方、危急值回访、交班未闭环事项。Personal Agent 会在节点前主动提醒；你也可以直接对它说「今天我有哪些待办」。',
        tags: ['待办', '提醒', '回访'],
      },
      {
        id: 'onb-security',
        title: '数据安全与权限',
        body: '所有操作留痕审计；离开工位请锁屏。患者数据按最小必要原则可见，越权访问会被拒绝并记录。严禁共用账号、严禁在私人设备导出病历。',
        tags: ['数据安全', '权限', '审计', '锁屏'],
      },
    ],
  },
  {
    id: 'sec-doctor',
    title: '医生操作手册',
    icon: 'stethoscope',
    audience: ['doctor'],
    summary: '门诊接诊、住院管床、处方开具与审方的标准操作路径。',
    articles: [
      {
        id: 'doc-outpatient',
        title: '门诊接诊',
        body: '在门诊工作站叫号后进入接诊单：先看主诉与既往史卡片，再开具检查/检验/处方。Personal Agent 会基于诊断给出用药与检查建议，确认后一键带入处方笺。',
        tags: ['门诊', '接诊', '叫号', '诊断建议'],
      },
      {
        id: 'doc-inpatient',
        title: '住院管床',
        body: '在住院视图按床位查看管床患者：每日查房可让 Agent 汇总「昨夜至今晨变化」草稿病程记录；异常检验值会置顶标红，需在规定时限内处理并签名闭环。',
        tags: ['住院', '管床', '病程记录', '查房'],
      },
      {
        id: 'doc-prescription',
        title: '处方开具与审方',
        body: '处方提交前系统自动做相互作用/剂量/过敏筛查；出现拦截提示时按建议调整或填写理由保留。精麻毒药品需双签并核对身份证。处方审核未通过会退回「待修改」。',
        tags: ['处方', '审方', '拦截', '精麻药品', '双签'],
      },
    ],
  },
  {
    id: 'sec-nurse',
    title: '护士操作手册',
    icon: 'heart',
    audience: ['nurse'],
    summary: '床边交班（SBAR）、护理记录录入、医嘱执行的规范流程。',
    articles: [
      {
        id: 'nur-handoff',
        title: '床边交班（SBAR）',
        body: '使用交班模块按 SBAR 结构（现状-背景-评估-建议）生成交班单，危重患者必须书面 + 口头双交班并双方签名。危急值、特殊管路在交班单高亮，漏交会被系统拦截提醒。',
        tags: ['交班', 'SBAR', '危重', '签名'],
      },
      {
        id: 'nur-nursing-note',
        title: '护理记录录入',
        body: '在护理记录模块按时间轴录入生命体征、护理措施与病情观察；可让 Agent 依据医嘱生成护理记录草稿，核对后签名。体温单数据自动回传，无需重复录入。',
        tags: ['护理记录', '生命体征', '体温单', '签名'],
      },
      {
        id: 'nur-med-admin',
        title: '医嘱执行与核对',
        body: '执行医嘱前执行「三查七对」并扫码核对患者腕带；给药后实时记录执行时间与执行人。口服/静脉/皮试分类留痕，皮试结果未回填不得执行后续用药。',
        tags: ['医嘱执行', '三查七对', '扫码', '皮试'],
      },
    ],
  },
  {
    id: 'sec-admin',
    title: '管理员手册',
    icon: 'setting',
    audience: ['admin'],
    summary: '系统参数配置、运行监控与审计日志的管理入口。',
    articles: [
      {
        id: 'adm-config',
        title: '参数与权限配置',
        body: '在管理后台维护科室/角色/账号与数据字典。权限按角色模板下发，遵循最小必要原则；新增账号默认仅给本科室只读，业务权限走申请审批流。',
        tags: ['配置', '角色', '权限', '数据字典'],
      },
      {
        id: 'adm-monitor',
        title: '运行监控',
        body: '监控大盘展示接口耗时、错误率、Agent 任务队列与数据库连接。出现红色阈值时按告警指引扩容或回滚；发布窗口内变更需在变更登记里留痕。',
        tags: ['监控', '告警', '大盘', '发布'],
      },
      {
        id: 'adm-audit',
        title: '审计日志',
        body: '审计日志记录登录、越权尝试、关键数据导出与权限变更，支持按人/时间/操作检索与导出留证。日志只读、不可篡改，保留周期按制度执行。',
        tags: ['审计', '日志', '导出', '留证'],
      },
    ],
  },
  {
    id: 'sec-faq',
    title: '常见问题 FAQ',
    icon: 'question',
    audience: ['all'],
    summary: '登录、显示、权限、密码等高频问题自助排查。',
    articles: [
      {
        id: 'faq-login',
        title: '登录失败 / 验证码收不到',
        body: '先确认工号与大小写；连续输错会临时锁定 15 分钟。短信/邮件验证码延迟超过 1 分钟可点「重新发送」；仍无法登录请联系信息科并提供登录时间。',
        tags: ['登录', '验证码', '锁定'],
      },
      {
        id: 'faq-data',
        title: '页面数据不显示 / 转圈',
        body: '先刷新一次；若持续转圈，查看右上角健康标识是否为绿色。红色说明服务异常，勿重复提交，等待恢复并按告警提示处理。',
        tags: ['数据', '转圈', '刷新', '健康检查'],
      },
      {
        id: 'faq-permission',
        title: '看不到某个患者 / 功能',
        body: '这是权限隔离：你仅能看到本科室或被授权患者。需要跨科查看请走会诊/授权申请，审批通过后临时授权，到期自动回收。',
        tags: ['权限', '看不到', '授权', '会诊'],
      },
      {
        id: 'faq-password',
        title: '忘记密码',
        body: '登录页点「忘记密码」，通过绑定手机/邮箱重置；未绑定账号需由科室管理员在后台重置初始密码。',
        tags: ['密码', '重置', '忘记密码'],
      },
    ],
  },
];

/* ------------------------------- 纯函数 ------------------------------- */

/** 合法角色集合 */
const VALID_ROLES: readonly HelpRole[] = ['doctor', 'nurse', 'admin', 'newbie'];

/**
 * 归一化入参角色：合法角色原样返回；未知/空值回退为 'doctor'。
 * （'all' 仅用于内容盘 audience 标记，不作为终端入参。）
 */
export function normalizeHelpRole(raw: string | undefined | null): HelpRole {
  const head = (raw ?? '').trim().toLowerCase();
  if ((VALID_ROLES as readonly string[]).includes(head)) return head as HelpRole;
  return 'doctor';
}

/** 判断分节对某角色是否可见（audience 含 'all' 或含该角色） */
export function isSectionVisible(section: HelpSection, role: HelpRole): boolean {
  return section.audience.includes('all') || section.audience.includes(role);
}

/**
 * 按角色组装帮助中心内容（纯函数，演示就绪）。
 * @param roleRaw 入参角色（doctor/nurse/admin/newbie，未知回退 doctor）
 * @param now     生成时间（可注入便于测试，默认当前时间）
 */
export function buildHelpContent(roleRaw?: string | null, now: string = new Date().toISOString()): HelpContent {
  const role = normalizeHelpRole(roleRaw);
  const sections = HELP_SECTIONS.filter((s) => isSectionVisible(s, role));
  const articles = sections.flatMap((s) => s.articles);
  return {
    role,
    generatedAt: now,
    sections,
    totalArticles: articles.length,
    articles,
  };
}

/**
 * 在已组装内容内检索（纯函数，演示就绪）。
 * 命中优先级：标题 > 标签 > 正文；空关键字返回空数组。
 * @param keyword 检索关键字（去空白、大小写不敏感）
 * @param content buildHelpContent 的产出
 */
export function searchHelp(keyword: string, content: HelpContent): HelpSearchResult[] {
  const q = (keyword ?? '').trim().toLowerCase();
  if (!q) return [];

  const out: HelpSearchResult[] = [];
  for (const section of content.sections) {
    for (const article of section.articles) {
      if (article.title.toLowerCase().includes(q)) {
        out.push({ article, sectionId: section.id, sectionTitle: section.title, hitOn: 'title' });
        continue;
      }
      if (article.tags.some((t) => t.toLowerCase().includes(q))) {
        out.push({ article, sectionId: section.id, sectionTitle: section.title, hitOn: 'tag' });
        continue;
      }
      if (article.body.toLowerCase().includes(q)) {
        out.push({ article, sectionId: section.id, sectionTitle: section.title, hitOn: 'body' });
      }
    }
  }
  return out;
}
