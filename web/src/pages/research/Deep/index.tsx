/**
 * 健澜科技 jlmedaios - M162-C 科研管理深化页（课题/论文/成果转化/经费）
 *
 * 【医院全场景】科研管理要真实，不能凑数：
 *  - 课题管理：国自然 / 省自然 / 院级 三档，状态闭环 申报→进行中→结题→验收；
 *  - 论文管理：投稿 / 接收 / 发表 / 被引 四阶段计数与累计引用；
 *  - 成果转化：专利 / 软著 / 产品 三类，区分受理与授权/上线；
 *  - 经费管理：预算 vs 支出 vs 结题审计三栏对照，超支在 BFF 入库即拦截。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading / error（可重试）/ empty；
 *  - 里程碑经 PUT /api/v1/research/projects/:id/milestone 登记，
 *    乱序 / 重复由 BFF 纯函数拦截并回显错误。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Layout,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

type ProjectCategory = 'nsfc' | 'provincial' | 'institute';
type ProjectStatus = 'applying' | 'active' | 'completed' | 'accepted';
type MilestoneStage = 'proposal' | 'approval' | 'midterm' | 'closing' | 'acceptance';

interface ResearchProject {
  id: string;
  projectNo: string;
  title: string;
  dept: string;
  year: number;
  category: ProjectCategory;
  leader: string;
  status: ProjectStatus;
  progress: number;
  budget: number;
  spent: number;
  auditStatus: 'pending' | 'passed' | 'issues';
  papers: Array<{ title: string; journal: string; stage: string; citations: number }>;
  outputs: Array<{ name: string; kind: string; status: string }>;
  impactScore: number;
}

interface PortfolioSummary {
  totalCount: number;
  byCategory: Record<ProjectCategory, number>;
  byStatus: Record<ProjectStatus, number>;
  budgetTotal: number;
  spentTotal: number;
  paperCounts: Record<string, number>;
  totalCitations: number;
  outputCounts: Record<string, number>;
  avgImpact: number;
  auditIssueCount: number;
}

interface Portfolio {
  dept: string;
  year: number;
  summary: PortfolioSummary;
  projects: ResearchProject[];
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
  grid: '#e6ebf2',
};

const DEPT_OPTIONS = [
  { value: 'NEU', label: '神经内科' },
  { value: 'CAR', label: '心血管内科' },
  { value: 'RES', label: '呼吸与危重症医学科' },
];

const YEAR_OPTIONS = [
  { value: 2025, label: '2025 年度' },
  { value: 2026, label: '2026 年度' },
];

const CATEGORY_LABEL: Record<ProjectCategory, { label: string; color: string }> = {
  nsfc: { label: '国自然', color: 'geekblue' },
  provincial: { label: '省自然', color: 'blue' },
  institute: { label: '院级', color: 'cyan' },
};

const STATUS_LABEL: Record<ProjectStatus, { label: string; color: string }> = {
  applying: { label: '申报中', color: 'default' },
  active: { label: '进行中', color: 'processing' },
  completed: { label: '已结题', color: 'warning' },
  accepted: { label: '已验收', color: 'success' },
};

const STAGE_OPTIONS: { value: MilestoneStage; label: string }[] = [
  { value: 'proposal', label: '申报' },
  { value: 'approval', label: '立项' },
  { value: 'midterm', label: '中期检查' },
  { value: 'closing', label: '结题' },
  { value: 'acceptance', label: '验收' },
];

/** 影响力等级配色 */
function impactColor(score: number): string {
  if (score >= 80) return '#52C41A';
  if (score >= 60) return '#1E5AA8';
  if (score >= 40) return '#FA8C16';
  return '#CF1322';
}

/* --------------------------------- 组件 --------------------------------- */

export default function ResearchDeepPage() {
  const [dept, setDept] = useState('NEU');
  const [year, setYear] = useState(2026);
  const [data, setData] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 里程碑弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<ResearchProject | null>(null);
  const [stage, setStage] = useState<MilestoneStage>('approval');
  const [milestoneName, setMilestone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(async (d: string, y: number) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/v1/research/projects?dept=${encodeURIComponent(d)}&year=${y}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载科研项目组合失败');
        return;
      }
      setData(json.data as Portfolio);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(dept, year);
  }, [dept, year, load]);

  const openMilestone = (p: ResearchProject) => {
    setActiveProject(p);
    setStage('approval');
    setMilestone('');
    setModalError('');
    setModalOpen(true);
  };

  const submitMilestone = async () => {
    if (!activeProject) return;
    setSubmitting(true);
    setModalError('');
    try {
      const resp = await fetch(`/api/v1/research/projects/${activeProject.id}/milestone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: milestoneName || STAGE_OPTIONS.find((s) => s.value === stage)?.label,
          stage,
          recordedAt: new Date().toISOString().slice(0, 10),
        }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setModalError(json.message || '里程碑登记失败');
        return;
      }
      setModalOpen(false);
      void load(dept, year);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<ResearchProject> = [
    {
      title: '课题编号',
      dataIndex: 'projectNo',
      width: 150,
      render: (v: string) => <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '课题名称 / 负责人',
      dataIndex: 'title',
      render: (_: string, r) => (
        <div>
          <div style={{ fontWeight: 600, color: VI.deep }}>{r.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>负责人：{r.leader}</Text>
        </div>
      ),
    },
    {
      title: '档次',
      dataIndex: 'category',
      width: 90,
      render: (v: ProjectCategory) => <Tag color={CATEGORY_LABEL[v].color}>{CATEGORY_LABEL[v].label}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: ProjectStatus) => <Tag color={STATUS_LABEL[v].color}>{STATUS_LABEL[v].label}</Tag>,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 120,
      render: (v: number) => (
        <div style={{ background: VI.grid, borderRadius: 4, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${v}%`, background: VI.accent, height: '100%' }} />
        </div>
      ),
    },
    {
      title: '经费(万)',
      width: 110,
      render: (_: unknown, r) => (
        <Text style={{ fontSize: 12 }}>
          预算 {r.budget} / 支出 {r.spent}
        </Text>
      ),
    },
    {
      title: '论文',
      width: 90,
      render: (_: unknown, r) => <Text style={{ fontSize: 12 }}>{r.papers.length} 篇</Text>,
    },
    {
      title: '成果转化',
      width: 90,
      render: (_: unknown, r) => <Text style={{ fontSize: 12 }}>{r.outputs.length} 项</Text>,
    },
    {
      title: '影响力',
      width: 90,
      render: (_: unknown, r) => (
        <Text strong style={{ color: impactColor(r.impactScore) }}>{r.impactScore.toFixed(1)}</Text>
      ),
    },
    {
      title: '操作',
      width: 110,
      render: (_: unknown, r) => (
        <Button size="small" type="link" style={{ color: VI.accent }} onClick={() => openMilestone(r)}>
          登记里程碑
        </Button>
      ),
    },
  ];

  const s = data?.summary;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            科研管理深化 · 课题 / 论文 / 成果转化 / 经费
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            【医院全场景】国自然 · 省自然 · 院级全生命周期管理，里程碑纯函数推进，影响力口径透明可审计
          </Paragraph>
        </div>

        {/* 筛选区 */}
        <Card
          size="small"
          style={{ marginBottom: 16, background: '#fff' }}
          title={
            <Space>
              <Text strong style={{ color: VI.deep }}>科室 / 年度</Text>
            </Space>
          }
        >
          <Space wrap>
            <Select
              value={dept}
              options={DEPT_OPTIONS}
              style={{ width: 200 }}
              onChange={(v) => setDept(v)}
            />
            <Select
              value={year}
              options={YEAR_OPTIONS}
              style={{ width: 140 }}
              onChange={(v) => setYear(v)}
            />
            <Button onClick={() => void load(dept, year)}>刷新</Button>
          </Space>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载科研项目组合中…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button size="small" onClick={() => void load(dept, year)}>重试</Button>}
          />
        )}

        {!loading && !error && data && s && (
          <>
            {/* 汇总指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={4}>
                <Card size="small">
                  <Statistic title="课题总数" value={s.totalCount} suffix="项" />
                </Card>
              </Col>
              <Col xs={12} sm={4}>
                <Card size="small">
                  <Statistic
                    title="国自然 / 省自然 / 院级"
                    value={`${s.byCategory.nsfc} / ${s.byCategory.provincial} / ${s.byCategory.institute}`}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={4}>
                <Card size="small">
                  <Statistic title="经费预算/支出" value={`${s.budgetTotal} / ${s.spentTotal}`} suffix="万" />
                </Card>
              </Col>
              <Col xs={12} sm={4}>
                <Card size="small">
                  <Statistic
                    title="论文 投/收/发/引"
                    value={`${s.paperCounts.submitted ?? 0} / ${s.paperCounts.accepted ?? 0} / ${s.paperCounts.published ?? 0} / ${s.paperCounts.cited ?? 0}`}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={4}>
                <Card size="small">
                  <Statistic title="累计引用" value={s.totalCitations} suffix="次" />
                </Card>
              </Col>
              <Col xs={12} sm={4}>
                <Card size="small">
                  <Statistic
                    title="平均影响力"
                    value={s.avgImpact}
                    precision={1}
                    valueStyle={{ color: impactColor(s.avgImpact) }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 课题台账表 */}
            <Card
              title={<span style={{ color: '#fff' }}>课题台账（{data.year} 年度 · {data.dept}）</span>}
              headStyle={{ background: VI.deep }}
            >
              <Table<ResearchProject>
                rowKey="id"
                columns={columns}
                dataSource={data.projects}
                pagination={false}
                size="middle"
              />
            </Card>

            <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center' }}>
              © {new Date().getFullYear()} 杭州健澜科技有限公司 · 科研管理深化（里程碑纯函数推进 / 影响力透明口径）
            </Paragraph>
          </>
        )}

        {/* 里程碑登记弹窗 */}
        <Modal
          open={modalOpen}
          title={`登记里程碑 · ${activeProject?.title ?? ''}`}
          onCancel={() => setModalOpen(false)}
          onOk={() => void submitMilestone()}
          confirmLoading={submitting}
          okText="确认登记"
          cancelText="取消"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">阶段将按生命周期顺序推进（申报→立项→中期→结题→验收），乱序或重复会被拦截。</Text>
            <Select
              value={stage}
              options={STAGE_OPTIONS}
              style={{ width: '100%' }}
              onChange={(v) => setStage(v as MilestoneStage)}
            />
            <Input
              placeholder="里程碑名称（如：国自然立项下达）"
              value={milestoneName}
              onChange={(e) => setMilestone(e.target.value)}
            />
            {modalError && <Alert type="error" showIcon message={modalError} />}
          </Space>
        </Modal>
      </Content>
    </Layout>
  );
}
