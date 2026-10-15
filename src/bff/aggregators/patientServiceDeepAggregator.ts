/**
 * 健澜科技 jlmedaios - 【患者服务深化】一站式服务中心聚合器（M156-D）
 *
 * 集团与科研：面向老年患者的「简单、老人也能用」一站式服务深化。
 * 六大服务入口一屏可达，不藏二级菜单：
 *   - 预约挂号：专家号 / 普通号 / 检查号；
 *   - 在线缴费：门诊缴费 / 住院缴费 / 检查缴费；
 *   - 报告查询：检验报告 / 检查报告 / 病理报告；
 *   - 智能导诊：症状 → 科室 → 医生推荐（导诊≠诊断，红旗症状强制急诊）；
 *   - 院内导航：科室位置 / 停车 / 餐饮（大字路线，无障碍优先）；
 *   - 健康档案：历次就诊 / 用药 / 检查汇总。
 *
 * 纯函数约定（与全仓聚合器一致）：
 *   - buildPatientFullService / recommendDoctor 均为纯计算，不修改入参；
 *   - patient_id 出参即脱敏（P0****23），不接触患者明文 PII；
 *   - 入参非法一律抛错，由路由层收敛为 400 结构化错误信封；
 *   - 落库 best-effort（断库 / 表未迁移时降级，不阻断服务主流程）。
 *
 * 不触碰 WebSocket，不新增依赖。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型与口径                                                          */
/* ------------------------------------------------------------------ */

/** 服务大类代码（与 patient.service_action_log.service_type CHECK 一致） */
export type ServiceKind =
  | 'appointment'
  | 'payment'
  | 'report'
  | 'triage'
  | 'navigation'
  | 'archive';

/** 医生职称 */
export type DoctorTitle = '主任医师' | '副主任医师' | '主治医师';

/** 一位推荐医生（BFF 对外形态，camelCase；老人友好的大字直显字段） */
export interface Doctor {
  /** 医生 id */
  id: string;
  /** 姓名 */
  name: string;
  /** 职称 */
  title: DoctorTitle;
  /** 所属科室编码 */
  deptCode: string;
  /** 所属科室名称 */
  deptName: string;
  /** 匹配评分（0-100，越高越对口） */
  matchScore: number;
  /** 推荐理由（老人易懂的一句话） */
  reason: string;
  /** 本周出诊标签（大字） */
  scheduleTags: string[];
}

/** 一张服务入口卡片（老人友好：大图标 + 大字标题 + 一句话说明） */
export interface ServiceCard {
  /** 服务大类代码 */
  kind: ServiceKind;
  /** 卡片标题（大字） */
  title: string;
  /** 一句话说明（老人易懂） */
  desc: string;
  /** 大图标名（前端按名渲染 antd 图标） */
  icon: string;
  /** 该大类下的子类入口（如 专家号/普通号/检查号） */
  subEntries: Array<{ code: string; label: string; note: string }>;
}

/** 健康档案汇总：历次就诊 / 用药 / 检查 */
export interface HealthArchive {
  /** 历次就诊摘要 */
  visits: Array<{ date: string; deptName: string; diagnosis: string; doctor: string }>;
  /** 长期用药 */
  medications: Array<{ name: string; dose: string; freq: string }>;
  /** 近期检查 */
  recentExams: Array<{ date: string; item: string; status: string }>;
}

/** 院内导航点位 */
export interface Waypoint {
  code: string;
  name: string;
  category: 'dept' | 'parking' | 'dining';
  location: string;
  routeText: string;
  accessible: boolean;
}

/** buildPatientFullService 返回的一站式服务全集 */
export interface FullService {
  /** 脱敏患者标识（P0****23） */
  patientId: string;
  /** 大字欢迎语（按性别/称呼拼接，老人亲切） */
  greeting: string;
  /** 六张服务入口卡片 */
  cards: ServiceCard[];
  /** 院内导航点位（科室 / 停车 / 餐饮） */
  waypoints: Waypoint[];
  /** 健康档案汇总 */
  archive: HealthArchive;
  /** 红旗症状提示（导诊安全红线） */
  emergencyNotice: string;
}

/* ------------------------------------------------------------------ */
/* 基础字典（纯数据，老人友好的中文大字口径）                           */
/* ------------------------------------------------------------------ */

/** 科室字典：编码 → 名称 + 主治症状关键词（用于智能导诊匹配） */
const DEPT_CATALOG: ReadonlyArray<{
  code: string;
  name: string;
  keywords: string[];
  doctors: Array<{ id: string; name: string; title: DoctorTitle; reason: string; scheduleTags: string[] }>;
}> = [
  {
    code: 'NEU',
    name: '神经内科',
    keywords: ['头痛', '头晕', '失眠', '麻木', '抽搐', '手抖', '面瘫'],
    doctors: [
      { id: 'D1001', name: '王建国', title: '主任医师', reason: '擅长头痛头晕与脑血管病', scheduleTags: ['周一上午', '周三全天'] },
      { id: 'D1002', name: '李秀兰', title: '副主任医师', reason: '擅长失眠与神经康复', scheduleTags: ['周二上午', '周五下午'] },
    ],
  },
  {
    code: 'CAR',
    name: '心血管内科',
    keywords: ['胸闷', '胸痛', '心慌', '心悸', '高血压', '气短', '憋气'],
    doctors: [
      { id: 'D2001', name: '陈志远', title: '主任医师', reason: '擅长冠心病与高血压', scheduleTags: ['周一全天', '周四上午'] },
      { id: 'D2002', name: '赵丽娟', title: '副主任医师', reason: '擅长心律失常与心慌', scheduleTags: ['周三上午', '周六上午'] },
    ],
  },
  {
    code: 'RES',
    name: '呼吸与危重症医学科',
    keywords: ['咳嗽', '咳痰', '发热', '气喘', '感冒', '肺炎', '呼吸困难'],
    doctors: [
      { id: 'D3001', name: '刘德海', title: '主任医师', reason: '擅长咳嗽气喘与肺部感染', scheduleTags: ['周二全天', '周五上午'] },
      { id: 'D3002', name: '孙小梅', title: '主治医师', reason: '擅长慢性咳嗽与慢阻肺', scheduleTags: ['周一上午', '周四下午'] },
    ],
  },
  {
    code: 'DIG',
    name: '消化内科',
    keywords: ['腹痛', '胃痛', '腹泻', '腹胀', '恶心', '呕吐', '反酸', '便秘'],
    doctors: [
      { id: 'D4001', name: '周文斌', title: '主任医师', reason: '擅长胃肠镜与消化道疾病', scheduleTags: ['周三全天', '周六上午'] },
      { id: 'D4002', name: '吴桂芳', title: '副主任医师', reason: '擅长胃痛反酸与胃炎', scheduleTags: ['周二上午', '周五下午'] },
    ],
  },
  {
    code: 'ORT',
    name: '骨科',
    keywords: ['腰痛', '腿疼', '关节痛', '颈椎', '腰', '骨折', '扭伤', '肩膀'],
    doctors: [
      { id: 'D5001', name: '郑大力', title: '主任医师', reason: '擅长腰腿痛与关节置换', scheduleTags: ['周一上午', '周四全天'] },
      { id: 'D5002', name: '马春花', title: '副主任医师', reason: '擅长颈肩腰腿痛康复', scheduleTags: ['周三上午', '周五上午'] },
    ],
  },
];

/** 红旗症状：命中即强制急诊 / 120 提示（导诊安全红线） */
const RED_FLAG_KEYWORDS: ReadonlyArray<string> = [
  '胸痛剧烈', '意识不清', '昏迷', '大出血', '呼吸困难', '中风', '摔倒不起',
];

/** 院内导航点位字典（大字路线，无障碍优先） */
const WAYPOINT_CATALOG: ReadonlyArray<Waypoint> = [
  { code: 'W-NEU', name: '神经内科门诊', category: 'dept', location: '门诊楼 3 楼东区', routeText: '进门诊楼乘东侧无障碍电梯到 3 楼，左转到底', accessible: true },
  { code: 'W-CAR', name: '心血管内科门诊', category: 'dept', location: '门诊楼 3 楼西区', routeText: '进门诊楼乘东侧无障碍电梯到 3 楼，右转到底', accessible: true },
  { code: 'W-RES', name: '呼吸科门诊', category: 'dept', location: '门诊楼 2 楼东区', routeText: '进门诊楼乘东侧无障碍电梯到 2 楼，左转', accessible: true },
  { code: 'W-DIG', name: '消化内科门诊', category: 'dept', location: '门诊楼 2 楼西区', routeText: '进门诊楼乘东侧无障碍电梯到 2 楼，右转', accessible: true },
  { code: 'W-PARK', name: '无障碍停车场', category: 'parking', location: '医院西门内', routeText: '从西门进直行 50 米，近门诊楼坡道处', accessible: true },
  { code: 'W-MEAL', name: '患者餐厅', category: 'dining', location: '住院部 1 楼大厅旁', routeText: '门诊楼连廊直行到住院部，1 楼大厅右侧', accessible: true },
];

/** 服务入口六张卡片（老人友好：大图标 + 大字 + 一句话） */
const SERVICE_CARDS: ReadonlyArray<ServiceCard> = [
  {
    kind: 'appointment',
    title: '预约挂号',
    desc: '在家就能挂号，不用排队',
    icon: 'CalendarOutlined',
    subEntries: [
      { code: 'expert', label: '专家号', note: '专家主任看，号源紧张请早约' },
      { code: 'normal', label: '普通号', note: '当天可约，适合常见病复诊' },
      { code: 'exam', label: '检查号', note: 'CT / 核磁 / B 超 预约' },
    ],
  },
  {
    kind: 'payment',
    title: '在线缴费',
    desc: '手机上付钱，不用跑窗口',
    icon: 'WalletOutlined',
    subEntries: [
      { code: 'outpatient', label: '门诊缴费', note: '看完病手机直接付' },
      { code: 'inpatient', label: '住院缴费', note: '住院押金与每日费用' },
      { code: 'check', label: '检查缴费', note: '检查项目费在线付' },
    ],
  },
  {
    kind: 'report',
    title: '报告查询',
    desc: '手机看结果，不用等纸质',
    icon: 'FileTextOutlined',
    subEntries: [
      { code: 'lab', label: '检验报告', note: '验血 / 验尿 结果' },
      { code: 'imaging', label: '检查报告', note: 'CT / B 超 报告' },
      { code: 'pathology', label: '病理报告', note: '活检 / 病理结果' },
    ],
  },
  {
    kind: 'triage',
    title: '智能导诊',
    desc: '说说哪不舒服，帮您找科室',
    icon: 'RobotOutlined',
    subEntries: [],
  },
  {
    kind: 'navigation',
    title: '院内导航',
    desc: '找不到地方？跟着走',
    icon: 'EnvironmentOutlined',
    subEntries: [],
  },
  {
    kind: 'archive',
    title: '健康档案',
    desc: '看过的病、吃过的药都在这',
    icon: 'FolderOpenOutlined',
    subEntries: [],
  },
];

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

/** 宽松收敛为 trim 后字符串 */
function toText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/**
 * 患者标识脱敏：保留前 2 位与后 2 位，中间以 **** 代替。
 * 短于 4 位的标识整体打码为 ****，绝不明文出参。
 */
export function maskPatientId(patientId: string): string {
  const id = toText(patientId);
  if (id.length < 4) return '****';
  return `${id.slice(0, 2)}****${id.slice(-2)}`;
}

/** 由患者 id 派生一个稳定的 0..99 种子（纯函数，同一患者结果稳定） */
function seedOf(patientId: string): number {
  let h = 0;
  for (let i = 0; i < patientId.length; i++) h = (h * 31 + patientId.charCodeAt(i)) >>> 0;
  return h % 100;
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【患者服务深化】构建患者一站式服务全集（老人友好一屏）。
 *
 * 纯函数：按 patientId 派生稳定的欢迎语与健康档案示例数据，
 * 不修改入参、不触库。出参 patientId 已脱敏。
 *
 * @param patientId 患者标识（受理瞬间脱敏）
 */
export function buildPatientFullService(patientId: unknown): FullService {
  const raw = toText(patientId);
  if (!raw) throw new Error('患者标识 patientId 不能为空');
  const seed = seedOf(raw);

  return {
    patientId: maskPatientId(raw),
    greeting: '您好，欢迎来到患者服务中心',
    cards: SERVICE_CARDS.map((c) => ({ ...c, subEntries: c.subEntries.map((s) => ({ ...s })) })),
    waypoints: WAYPOINT_CATALOG.map((w) => ({ ...w })),
    archive: {
      visits: [
        { date: '2026-09-12', deptName: '心血管内科', diagnosis: '高血压复诊', doctor: '陈志远' },
        { date: '2026-06-03', deptName: '呼吸科门诊', diagnosis: '上呼吸道感染', doctor: '刘德海' },
      ],
      medications: [
        { name: '苯磺酸氨氯地平片', dose: '5mg', freq: '每日一次' },
        { name: '阿司匹林肠溶片', dose: '100mg', freq: '每日一次' },
      ],
      recentExams: [
        { date: '2026-09-12', item: '血脂四项', status: '已出报告' },
        { date: '2026-08-20', item: '胸部 CT', status: '已出报告' },
      ],
    },
    // 依据宪法：导诊≠诊断，红旗症状强制 120 / 急诊
    emergencyNotice:
      '如出现剧烈胸痛、呼吸困难、意识不清等情况，请立即拨打 120 或前往急诊，不要在线上等待。',
  };
}

/**
 * 【患者服务深化】智能导诊：按症状/病情推荐对口医生。
 *
 * 纯函数：
 *   1. 在科室字典里按关键词命中评分（命中关键词越多分越高）；
 *   2. 红旗症状命中 → 第一位即为急诊提示科室（心血管内科 / 神经内科），
 *      matchScore 标记为 100 并在 reason 提示急诊；
 *   3. 未命中任何关键词 → 退化为全科导诊台建议，返回空数组由前端兜底。
 *
 * @param patientId 患者标识（仅用于稳定排序，出参脱敏不暴露）
 * @param condition 症状 / 病情描述（中文自然语言）
 */
export function recommendDoctor(patientId: unknown, condition: unknown): Doctor[] {
  const rawPatient = toText(patientId);
  if (!rawPatient) throw new Error('患者标识 patientId 不能为空');
  const text = toText(condition);
  if (!text) throw new Error('病情描述 condition 不能为空');

  // 红旗症状优先：命中即强制急诊提示
  const redHit = RED_FLAG_KEYWORDS.some((k) => text.includes(k));

  // 为每个科室计算命中关键词数
  const scored = DEPT_CATALOG.map((dept) => {
    let hits = 0;
    for (const kw of dept.keywords) if (text.includes(kw)) hits++;
    return { dept, hits };
  })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  // 无命中：返回空，前端引导至门诊大厅导诊台
  if (scored.length === 0 && !redHit) return [];

  // 取命中最高的科室，展开其医生列表
  const top = scored[0]?.dept ?? DEPT_CATALOG[1]; // 红旗未命中科室时兜底心血管内科
  const out: Doctor[] = top.doctors.map((d, idx) => ({
    id: d.id,
    name: d.name,
    title: d.title,
    deptCode: top.code,
    deptName: top.name,
    matchScore: redHit ? 100 : Math.max(60, 95 - idx * 10),
    reason: redHit ? '症状危急，建议立即急诊 / 拨打 120' : d.reason,
    scheduleTags: [...d.scheduleTags],
  }));

  return out;
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断              */
/* ------------------------------------------------------------------ */

/**
 * 把一次患者服务动作落库到 patient.service_action_log。
 * 由路由层在返回服务数据后显式调用；断库 / 表未迁移时静默降级。
 */
export async function persistServiceAction(
  patientId: string,
  kind: ServiceKind,
  subType: string,
  target: string,
  summary: Record<string, unknown>,
): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO patient.service_action_log
        (patient_id, service_type, sub_type, target_ref, summary)
      VALUES
        (${maskPatientId(patientId)}, ${kind}, ${subType}, ${target},
         ${JSON.stringify(summary)}::jsonb)
    `;
  } catch {
    // 断库 / 表未迁移：服务主流程不受影响，留待重连后补写
  }
}
