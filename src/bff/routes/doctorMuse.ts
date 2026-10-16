/**
 * 健澜科技 jlmedaios - Doctor MUSE 个人医生智能体路由（M169-B）
 *
 * 知识图谱与Personal Agent：
 *   GET /api/v1/doctor/muse/:staffId
 *     返回一名医生的个人经验智能体画像——四维经验沉淀（诊断/用药/手术/沟通）、
 *     基于本人经验的场景化推荐、以及与同行聚合指标的对比。
 *
 * 本切片边界（不写 SQL、无新表）：
 *  - 聚合层为纯函数，路由层使用进程内确定性种子数据，便于前后端联调与单测；
 *  - 真实环境由持久层替换 seedExperiences() 即可，纯函数签名不变；
 *  - 只读端点，不触发任何决策写入或自动处置动作。
 *
 * 隐私：只返回医生本人脱敏经验画像与同行聚合对比，不公开任何同行案例。
 * 权限：登录即可访问本人；查看他人 staffId 由前端带教场景另行控制。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import {
  buildDoctorMUSEProfile,
  compareWithPeer,
  recommendFromMUSE,
  type DoctorExperience,
  type DoctorExperienceCategory,
  type MUSEContext,
} from '../aggregators/doctorMuseAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 路由响应信封 */
export interface DoctorMUSEResponse {
  demo: boolean;
  staffId: string;
  /** 个人画像（四维沉淀 + 高频标签 + 成功率） */
  profile: ReturnType<typeof buildDoctorMUSEProfile>;
  /** 当前上下文下基于本人经验的推荐 */
  recommendations: ReturnType<typeof recommendFromMUSE>;
  /** 与同行聚合指标对比（仅统计，不含同行案例） */
  peerComparison: ReturnType<typeof compareWithPeer>;
}

/**
 * 确定性种子：一名医生近一年的本人经验沉淀样例。
 * 真实环境替换为 medmuse.doctor_muse_experience 表读取；本切片不写 SQL。
 */
function seedExperiences(): DoctorExperience[] {
  return [
    // 诊断思维
    {
      category: 'diagnosis',
      outcome: 'failure',
      title: '老年心衰合并房颤的鉴别漏诊',
      detail: '初诊按普通上感处理，漏评 BNP 与心律；后复发再诊才纠正',
      tags: ['心衰', '房颤', '老年'],
      recordedAt: '2026-04-12T09:00:00.000Z',
    },
    {
      category: 'diagnosis',
      outcome: 'success',
      title: '以 BNP/NT-proBNP 分层鉴别心源性 vs 肺源性呼吸困难',
      tags: ['心衰', '鉴别诊断'],
      recordedAt: '2026-05-08T09:00:00.000Z',
    },
    {
      category: 'diagnosis',
      outcome: 'reflection',
      title: '不典型胸痛需常规加做 D-二聚体与心电图动态复查',
      tags: ['胸痛', '鉴别诊断'],
      recordedAt: '2026-06-20T09:00:00.000Z',
    },
    // 用药经验
    {
      category: 'medication',
      outcome: 'success',
      title: '依诺肝素桥接华法林的老年剂量调整',
      drugName: '依诺肝素',
      dose: '4000IU qd 皮下',
      tags: ['抗凝', '老年'],
      recordedAt: '2026-05-15T09:00:00.000Z',
    },
    {
      category: 'medication',
      outcome: 'failure',
      title: '左氧氟沙星与华法林联用致 INR 骤升',
      drugName: '左氧氟沙星',
      dose: '0.5g qd',
      adverseReaction: '联用华法林 INR 4.2，伴牙龈出血',
      tags: ['抗凝', '药物相互作用'],
      recordedAt: '2026-07-02T09:00:00.000Z',
    },
    {
      category: 'medication',
      outcome: 'success',
      title: 'ARNI 起始小剂量滴定耐受良好',
      drugName: '沙库巴曲缬沙坦',
      dose: '50mg bid 起始，2 周后加量',
      tags: ['心衰', 'ARNI'],
      recordedAt: '2026-08-10T09:00:00.000Z',
    },
    // 手术决策
    {
      category: 'surgery',
      outcome: 'success',
      title: '腹腔镜胆囊切除术中解剖变异的辨认',
      procedure: '腹腔镜胆囊切除术',
      intraOpJudgment: 'Calot 三角脂肪堆积时先置观察孔再分离',
      postOpManagement: '术后 6h 下床、清淡饮食，无胆漏',
      tags: ['腹腔镜', '胆道'],
      recordedAt: '2026-06-01T09:00:00.000Z',
    },
    {
      category: 'surgery',
      outcome: 'reflection',
      title: '高龄患者急诊阑尾切除的麻醉与术后肺部管理',
      procedure: '腹腔镜阑尾切除术',
      intraOpJudgment: '气腹压力降至 10mmHg，缩短手术时间',
      postOpManagement: '术后早期拍背排痰，预防肺部感染',
      tags: ['急诊', '老年'],
      recordedAt: '2026-08-22T09:00:00.000Z',
    },
    // 患者沟通
    {
      category: 'communication',
      outcome: 'success',
      title: '用「三层信息法」告知心衰长期用药方案',
      technique: '三层信息法（是什么/为什么/怎么办）',
      patientFeedback: '患者表示听懂了，依从性提升',
      improvement: '下次加入书面服药日历',
      tags: ['患教', '心衰'],
      recordedAt: '2026-07-18T09:00:00.000Z',
    },
    {
      category: 'communication',
      outcome: 'failure',
      title: '手术同意书签署时未充分说明术中冰冻概率',
      patientFeedback: '患者术后对冰冻结果预期不足，产生误解',
      improvement: '同意书阶段加入「术中可能改变方案」可视化示意',
      tags: ['知情同意', '沟通'],
      recordedAt: '2026-09-05T09:00:00.000Z',
    },
  ];
}

/**
 * 同行聚合统计（仅指标，不含任何同行经验内容）。
 * 真实环境由 medmuse.doctor_muse_stats 按科室聚合后注入。
 */
function seedPeerGroup(staffId: string): Array<{
  totalExperiences: number;
  successRate: number;
  categoryCounts: Record<DoctorExperienceCategory, number>;
}> {
  void staffId;
  return [
    {
      totalExperiences: 12,
      successRate: 0.75,
      categoryCounts: { diagnosis: 4, medication: 3, surgery: 3, communication: 2 },
    },
    {
      totalExperiences: 18,
      successRate: 0.82,
      categoryCounts: { diagnosis: 6, medication: 5, surgery: 4, communication: 3 },
    },
    {
      totalExperiences: 9,
      successRate: 0.67,
      categoryCounts: { diagnosis: 3, medication: 2, surgery: 2, communication: 2 },
    },
    {
      totalExperiences: 15,
      successRate: 0.8,
      categoryCounts: { diagnosis: 5, medication: 4, surgery: 3, communication: 3 },
    },
  ];
}

export const doctorMuseRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/doctor/muse/:staffId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAuth(c);
      if (denied) return denied;

      const staffId = (c.params.staffId ?? '').trim();
      if (!staffId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少员工工号 staffId', c.traceId), 400);
      }

      // 可选上下文：?category=medication&keywords=老年,抗凝
      const categoryRaw = (c.query.get('category') ?? '').trim() as DoctorExperienceCategory | '';
      const allowedCategories: DoctorExperienceCategory[] = ['diagnosis', 'medication', 'surgery', 'communication'];
      const category = allowedCategories.includes(categoryRaw as DoctorExperienceCategory)
        ? (categoryRaw as DoctorExperienceCategory)
        : undefined;
      const keywords = (c.query.get('keywords') ?? '')
        .split(/[,，、;；\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const context: MUSEContext = { category, keywords };

      try {
        const experiences = seedExperiences();
        const profile = buildDoctorMUSEProfile(staffId, experiences);
        const recommendations = recommendFromMUSE(staffId, context, experiences, 5);
        const peerComparison = compareWithPeer(staffId, profile, seedPeerGroup(staffId));

        const payload: DoctorMUSEResponse = {
          demo: true,
          staffId,
          profile,
          recommendations,
          peerComparison,
        };
        return json(ok(payload, 'Doctor MUSE 个人智能体已加载', c.traceId));
      } catch (err) {
        console.error(`[doctorMuse] GET /doctor/muse/:staffId [${c.traceId}]`, err);
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            err instanceof Error ? err.message : 'Doctor MUSE 个人智能体加载失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
