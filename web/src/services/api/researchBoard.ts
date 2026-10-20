/**
 * 健澜科技 jlmedaios - 科研管理看板 API（M485）
 * 对接 BFF /api/v1/research/* ：
 *   /research/projects  在研项目
 *   /research/papers    论文
 *   /research/patents  专利
 *   /research/funds     经费
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface ProjectRow {
  id: string;
  name: string;
  pi: string;
  fund: number;
  progress: number; // 0-100
  demo?: boolean;
}

export interface PaperRow {
  id: string;
  title: string;
  journal: string;
  impact: number;
  year: number;
  demo?: boolean;
}

export interface PatentRow {
  id: string;
  title: string;
  type: '发明' | '实用新型' | '外观';
  grantedAt: string;
  demo?: boolean;
}

export interface FundRow {
  id: string;
  source: string;
  received: number;
  spent: number;
  demo?: boolean;
}

const DEMO_PROJECTS: ProjectRow[] = [
  { id: 'pj-1', name: '基于大模型的 EMR 质控方法学研究', pi: '陈**', fund: 500000, progress: 65, demo: true },
  { id: 'pj-2', name: 'AI 原生医院操作系统关键技术', pi: '王**', fund: 1200000, progress: 48, demo: true },
  { id: 'pj-3', name: 'DRG 分组下的临床路径优化', pi: '李**', fund: 300000, progress: 82, demo: true },
  { id: 'pj-4', name: 'CDS 深度规则引擎构建', pi: '赵**', fund: 450000, progress: 35, demo: true },
  { id: 'pj-5', name: '患者随访智能体 MedMuse 研发', pi: '周**', fund: 600000, progress: 58, demo: true },
];

const DEMO_PAPERS: PaperRow[] = [
  { id: 'pp-1', title: '大模型在病历质控中的应用研究', journal: '中华医院管理杂志', impact: 2.8, year: 2026, demo: true },
  { id: 'pp-2', title: 'CDS 规则引擎对合理用药的影响', journal: '中国药房', impact: 1.9, year: 2026, demo: true },
  { id: 'pp-3', title: 'DRG 背景下临床路径变异分析', journal: '中国卫生经济', impact: 2.2, year: 2026, demo: true },
  { id: 'pp-4', title: 'AI 护士排班算法的实践', journal: '护理研究', impact: 1.5, year: 2026, demo: true },
  { id: 'pp-5', title: '患者 360 时间线在三级评审中的作用', journal: '中国数字医学', impact: 1.7, year: 2026, demo: true },
];

const DEMO_PATENTS: PatentRow[] = [
  { id: 'pt-1', title: '一种基于大模型的病历自动质控方法', type: '发明', grantedAt: '2026-03-15', demo: true },
  { id: 'pt-2', title: 'AI 护士排班系统 V1.0', type: '实用新型', grantedAt: '2026-05-20', demo: true },
  { id: 'pt-3', title: '患者随访智能体交互界面', type: '外观', grantedAt: '2026-07-08', demo: true },
  { id: 'pt-4', title: 'CDS 规则配置可视化编辑器', type: '发明', grantedAt: '2026-09-12', demo: true },
];

const DEMO_FUNDS: FundRow[] = [
  { id: 'f-1', source: '国家自然科学基金', received: 800000, spent: 420000, demo: true },
  { id: 'f-2', source: '省科技厅重点研发', received: 1500000, spent: 680000, demo: true },
  { id: 'f-3', source: '市卫健委一般项目', received: 300000, spent: 180000, demo: true },
  { id: 'f-4', source: '横向课题(企业合作)', received: 600000, spent: 240000, demo: true },
];

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchProjects = () => safeGet<ProjectRow>('/research/projects', DEMO_PROJECTS);
export const fetchPapers = () => safeGet<PaperRow>('/research/papers', DEMO_PAPERS);
export const fetchPatents = () => safeGet<PatentRow>('/research/patents', DEMO_PATENTS);
export const fetchFunds = () => safeGet<FundRow>('/research/funds', DEMO_FUNDS);
