/**
 * 健澜科技 jlmedaios - M167-D 代码质量提升页（仅 admin）
 *
 * 【安全修复与质量提升】展示两块内容：
 *  - 覆盖率冲刺计划：当前/目标覆盖率、缺口、三段式里程碑（安全模块 → 核心业务 → 边界条件）；
 *  - 三类清零计划：any 类型 / @ts-ignore / 裸 console.log（保留 console.error / warn）。
 *
 * 三态：loading / error（可重试）/ empty。视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Progress, Row, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF codeQualityAggregator 输出对齐的类型 ---------------- */

interface CoverageMilestone {
  order: number;
  stage: string;
  from: number;
  to: number;
  focus: string;
}

interface CoverageFocusArea {
  area: string;
  reason: string;
  priority: number;
  estimatedGain: string;
}

interface CoverageImprovementPlan {
  current: number;
  target: number;
  gap: number;
  achieved: boolean;
  milestones: CoverageMilestone[];
  focusAreas: CoverageFocusArea[];
  summary: string;
}

interface EliminationTask {
  order: number;
  file: string;
  symbol: string;
  occurrences: number;
  action: string;
  expectedResult: string;
}

interface EliminationPlan {
  kind: 'any' | 'ts-ignore' | 'console-log';
  title: string;
  totalOccurrences: number;
  openItems: number;
  tasks: EliminationTask[];
  guardrails: string[];
  summary: string;
}

interface QualityView {
  coverage: CoverageImprovementPlan;
  elimination: { anyPlan: EliminationPlan; tsIgnorePlan: EliminationPlan; consolePlan: EliminationPlan };
  scan: {
    overallScore: number;
    grade: 'A' | 'B' | 'C' | 'D';
    totals: { open: number; fixed: number };
  };
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const KIND_COLOR: Record<EliminationPlan['kind'], string> = {
  any: 'volcano',
  'ts-ignore': 'magenta',
  'console-log': 'gold',
};

export default function CodeQualityPage() {
  const [data, setData] = useState<QualityView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/quality/code');
      const body = (await resp.json()) as { code: number; message?: string; data?: QualityView };
      if (body.code !== 0) {
        setError(body.message || '加载失败');
        setData(null);
        return;
      }
      setData(body.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const coverage = data?.coverage;
  const elimination = data?.elimination;
  const scan = data?.scan;

  const eliminationPlans: EliminationPlan[] = elimination
    ? [elimination.anyPlan, elimination.tsIgnorePlan, elimination.consolePlan]
    : [];

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
          代码质量提升 · M167-D
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【安全修复与质量提升】覆盖率 ≥99% 冲刺 · 零 any · 零 @ts-ignore · 裸 console.log 清零（保留 error/warn）
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载质量提升计划中…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => void load()}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无质量提升计划，稍后刷新即可。" />
        )}

        {!loading && !error && data && coverage && (
          <>
            {/* 覆盖率 VI 卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                    当前覆盖率
                  </Paragraph>
                  <Title level={3} style={{ margin: 0, color: VI.accent }}>
                    {coverage.current}%
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                    目标覆盖率（红线）
                  </Paragraph>
                  <Title level={3} style={{ margin: 0, color: coverage.achieved ? '#3f8600' : '#cf1322' }}>
                    {coverage.target}%
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                    待提升缺口
                  </Paragraph>
                  <Title level={3} style={{ margin: 0, color: coverage.gap > 0 ? '#d48806' : '#3f8600' }}>
                    {coverage.gap > 0 ? `+${coverage.gap} pt` : '已达标'}
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                    质量水位 / 待整改
                  </Paragraph>
                  <Title level={3} style={{ margin: 0, color: VI.accent }}>
                    {scan ? `${scan.overallScore} 分 · ${scan.totals.open} 项` : '—'}
                  </Title>
                </Card>
              </Col>
            </Row>

            {/* 覆盖率进度 */}
            <Card style={{ marginBottom: 16 }}>
              <Paragraph style={{ marginBottom: 12 }}>{coverage.summary}</Paragraph>
              <Progress
                percent={coverage.current}
                strokeColor={{ from: VI.deep, to: VI.accent }}
                format={(p) => `${p?.toFixed(1)}% / 目标 ${coverage.target}%`}
              />
            </Card>

            {/* 三段式里程碑 */}
            <Card title="覆盖率冲刺里程碑（安全模块优先）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="order"
                pagination={false}
                dataSource={coverage.milestones}
                locale={{ emptyText: '已达标，无需冲刺' }}
                columns={[
                  { title: '#', dataIndex: 'order', width: 60 },
                  { title: '阶段', dataIndex: 'stage', width: 180 },
                  {
                    title: '覆盖率区间',
                    dataIndex: 'from',
                    width: 200,
                    render: (_: unknown, row: CoverageMilestone) => (
                      <Text>
                        {row.from}% → {row.to}%
                      </Text>
                    ),
                  },
                  { title: '补测重点', dataIndex: 'focus' },
                ]}
              />
            </Card>

            {/* 重点补测领域 */}
            <Card title="重点补测领域（不凑数：安全 / 核心业务 / 边界）" style={{ marginBottom: 16 }}>
              <List
                dataSource={coverage.focusAreas}
                renderItem={(area) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span>
                          <Tag color="blue">P{area.priority}</Tag>
                          {area.area}
                          <Text type="secondary" style={{ marginLeft: 12 }}>
                            {area.estimatedGain}
                          </Text>
                        </span>
                      }
                      description={area.reason}
                    />
                  </List.Item>
                )}
              />
            </Card>

            {/* 三类清零计划 */}
            {eliminationPlans.map((plan) => (
              <Card
                key={plan.kind}
                title={
                  <span>
                    <Tag color={KIND_COLOR[plan.kind]}>{plan.title}</Tag>
                    <Text type="secondary" style={{ fontWeight: 'normal', marginLeft: 8 }}>
                      {plan.summary}
                    </Text>
                  </span>
                }
                style={{ marginBottom: 16 }}
              >
                <Table
                  rowKey="order"
                  pagination={false}
                  dataSource={plan.tasks}
                  locale={{ emptyText: '已清零，维持红线' }}
                  columns={[
                    { title: '#', dataIndex: 'order', width: 60 },
                    {
                      title: '文件 / 符号',
                      dataIndex: 'file',
                      width: 260,
                      render: (_: unknown, row: EliminationTask) => (
                        <div>
                          <Text code>{row.file}</Text>
                          <br />
                          <Text type="secondary">{row.symbol}</Text>
                        </div>
                      ),
                    },
                    { title: '出现次数', dataIndex: 'occurrences', width: 100 },
                    { title: '整改动作', dataIndex: 'action', ellipsis: true },
                    { title: '验收结果', dataIndex: 'expectedResult', ellipsis: true },
                  ]}
                />
                <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                  <Text strong>防回潮红线：</Text>
                </Paragraph>
                {plan.guardrails.map((g) => (
                  <Paragraph key={g} style={{ marginBottom: 4 }}>
                    <Text style={{ color: VI.accent }}>● </Text>
                    {g}
                  </Paragraph>
                ))}
              </Card>
            ))}
          </>
        )}
      </Content>
    </Layout>
  );
}
