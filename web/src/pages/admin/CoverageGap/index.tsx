/**
 * 健澜科技 jlmedaios — M173-A 覆盖率缺口页（99% → 99.5%+，仅 admin）
 *
 * 【质量提升与新场景】
 *
 * 直读 BFF GET /api/v1/admin/test/coverage-gap 返回的
 *   { gaps: CoverageGapReport, plan: CoverageImprovementPlan, progress: CoverageProgress }：
 *  - 顶部深海蓝横幅：当前行率 / 目标行率 / 距目标还差行数；
 *  - 四桶缺口卡：错误处理（catch）/ 边界条件 / 权限边界 / 降级路径，
 *    各带剩余行数、风险权重、hotspot 数；
 *  - 提升计划表：按 P0→P2 排序，展示测试技术、预计覆盖行数、工作量、验收口径；
 *  - 进度跟踪条：已完成 / 待办 / 预计当前行率 / 状态机。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* -------------------- 与 BFF 类型对齐（纯结构镜像，不引后端包） -------------------- */

type GapCategory = 'error_handling' | 'boundary' | 'permission' | 'degradation';
type PlanPriority = 'P0' | 'P1' | 'P2';

interface GapHotspot {
  file: string;
  symbol: string;
  kind: string;
  uncoveredLines: number;
  description: string;
}

interface GapCategoryStat {
  category: GapCategory;
  label: string;
  riskWeight: 1 | 2 | 3;
  priority: PlanPriority;
  uncoveredLines: number;
  hotspots: GapHotspot[];
}

interface CoverageGapReport {
  generatedAt: string;
  currentRate: number;
  targetRate: number;
  totalLines: number;
  coveredLines: number;
  remainingLines: number;
  deltaToTarget: number;
  linesNeededToTarget: number;
  categories: GapCategoryStat[];
  totalUncoveredLines: number;
  targetPass: boolean;
}

interface PlanItem {
  id: string;
  category: GapCategory;
  file: string;
  symbol: string;
  kind: string;
  technique: string;
  targetLines: number;
  effortHours: number;
  priority: PlanPriority;
  acceptance: string;
}

interface CoverageImprovementPlan {
  generatedAt: string;
  items: PlanItem[];
  totalPlannedLines: number;
  estimatedRateAfter: number;
  reachesTarget: boolean;
  totalEffortHours: number;
}

interface CoverageProgress {
  totalItems: number;
  doneItems: number;
  pendingItems: number;
  plannedLines: number;
  coveredAdded: number;
  projectedRate: number;
  remainingLinesToTarget: number;
  completionPct: number;
  status: 'not_started' | 'in_progress' | 'on_track' | 'behind' | 'achieved';
  droppedEvents: number;
}

/** BFF 路由返回的信封 */
interface CoverageGapPayload {
  gaps: CoverageGapReport;
  plan: CoverageImprovementPlan;
  progress: CoverageProgress;
}

/* -------------------- 深海蓝 VI 色板与字典 -------------------- */

const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
  pass: '#52c41a',
  fail: '#ff4d4f',
  warn: '#faad14',
};

const CATEGORY_LABEL: Record<GapCategory, string> = {
  error_handling: '错误处理',
  boundary: '边界条件',
  permission: '权限边界',
  degradation: '降级路径',
};

const PRIORITY_COLOR: Record<PlanPriority, string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'blue',
};

const STATUS_LABEL: Record<CoverageProgress['status'], string> = {
  not_started: '未启动',
  in_progress: '进行中',
  on_track: '在轨',
  behind: '滞后',
  achieved: '已达成',
};

const STATUS_COLOR: Record<CoverageProgress['status'], string> = {
  not_started: 'default',
  in_progress: 'processing',
  on_track: 'success',
  behind: 'warning',
  achieved: 'success',
};

function fmtPct(rate: number): number {
  return Math.round(rate * 10000) / 100;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

/* -------------------- 提升计划表列 -------------------- */

const planColumns: ColumnsType<PlanItem> = [
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
    render: (p: PlanPriority) => <Tag color={PRIORITY_COLOR[p]}>{p}</Tag>,
  },
  {
    title: '类别',
    dataIndex: 'category',
    key: 'category',
    width: 110,
    render: (c: GapCategory) => CATEGORY_LABEL[c],
  },
  {
    title: '位置',
    key: 'location',
    render: (_: unknown, r: PlanItem) => (
      <div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{r.file}</div>
        <div>{r.symbol}</div>
      </div>
    ),
  },
  {
    title: '测试技术',
    dataIndex: 'technique',
    key: 'technique',
    ellipsis: true,
  },
  {
    title: '预计覆盖',
    dataIndex: 'targetLines',
    key: 'targetLines',
    width: 90,
    sorter: (a, b) => a.targetLines - b.targetLines,
    render: (n: number) => <span style={{ color: VI.accent }}>{n} 行</span>,
  },
  {
    title: '工作量',
    dataIndex: 'effortHours',
    key: 'effortHours',
    width: 80,
    render: (n: number) => `${n}h`,
  },
  {
    title: '验收口径',
    dataIndex: 'acceptance',
    key: 'acceptance',
    ellipsis: true,
  },
];

/* -------------------- 主页面 -------------------- */

export default function CoverageGapPage() {
  const [data, setData] = useState<CoverageGapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/test/coverage-gap');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as CoverageGapPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const gaps = data?.gaps;
  const plan = data?.plan;
  const progress = data?.progress;
  const currentPct = gaps ? fmtPct(gaps.currentRate) : 0;
  const targetPct = gaps ? Math.round(gaps.targetRate * 1000) / 10 : 99.5;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          覆盖率缺口 · 99% → 99.5%+ 冲刺闭环（M173-A）
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          错误处理 / 边界条件 / 权限边界 / 降级路径 · 纯函数驱动 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在计算覆盖率缺口…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && gaps && plan && progress && (
          <>
            {/* 顶部结论横幅 */}
            <Alert
              type={gaps.targetPass ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
              message={
                gaps.targetPass
                  ? `已达标：行覆盖率 ${currentPct}% ≥ ${targetPct}%`
                  : `距 ${targetPct}% 还差 ${gaps.linesNeededToTarget} 行（当前 ${currentPct}%）`
              }
              description={
                plan.reachesTarget
                  ? `执行计划后预计行率 ${fmtPct(plan.estimatedRateAfter)}%，可达成 ${targetPct}% 目标`
                  : '当前计划不足以达成目标，需追加补测条目'
              }
            />

            {/* 核心指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={5}>
                <Card>
                  <Statistic title="当前行覆盖率" value={currentPct} suffix="%" />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic title="目标行覆盖率" value={targetPct} suffix="%" />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="剩余缺口行"
                    value={gaps.totalUncoveredLines}
                    valueStyle={{ color: VI.fail }}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="计划补测行"
                    value={plan.totalPlannedLines}
                    valueStyle={{ color: VI.accent }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="预计工作量"
                    value={plan.totalEffortHours}
                    suffix="人时"
                  />
                </Card>
              </Col>
            </Row>

            {/* 四桶缺口卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {gaps.categories.map((cat) => {
                const pct = Math.round(
                  (cat.uncoveredLines / Math.max(1, gaps.totalUncoveredLines)) * 1000,
                ) / 10;
                return (
                  <Col span={6} key={cat.category}>
                    <Card size="small">
                      <Statistic
                        title={
                          <span>
                            {cat.label}{' '}
                            <Tag color={PRIORITY_COLOR[cat.priority]}>
                              {cat.priority}
                            </Tag>
                          </span>
                        }
                        value={cat.uncoveredLines}
                        suffix={
                          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                            行 · {cat.hotspots.length} 个缺口点
                          </span>
                        }
                      />
                      <Progress
                        percent={pct}
                        size="small"
                        format={() => `权重 ${cat.riskWeight}`}
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* 进度跟踪 */}
            <Card
              title={
                <span>
                  进度跟踪{' '}
                  <Tag color={STATUS_COLOR[progress.status]}>
                    {STATUS_LABEL[progress.status]}
                  </Tag>
                </span>
              }
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="完成条目"
                    value={progress.doneItems}
                    suffix={`/ ${progress.totalItems}`}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="已补测行"
                    value={progress.coveredAdded}
                    suffix={`/ ${progress.plannedLines}`}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="预计当前行率"
                    value={fmtPct(progress.projectedRate)}
                    suffix="%"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="距目标还需"
                    value={progress.remainingLinesToTarget}
                    suffix="行"
                    valueStyle={{ color: VI.warn }}
                  />
                </Col>
              </Row>
              <Progress
                percent={Math.round(progress.completionPct * 1000) / 10}
                size="small"
                style={{ marginTop: 16 }}
              />
            </Card>

            {/* 提升计划表 */}
            <Card
              title={`提升计划（${plan.items.length} 条 · 执行后预计 ${fmtPct(
                plan.estimatedRateAfter,
              )}%）`}
            >
              <Table
                rowKey="id"
                columns={planColumns}
                dataSource={plan.items}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size="small"
              />
            </Card>

            <Paragraph
              style={{ marginTop: 16, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}
            >
              报告生成于 {fmtTime(gaps.generatedAt)} · 基线口径：总行数 {gaps.totalLines} ·
              已覆盖 {gaps.coveredLines} 行
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
