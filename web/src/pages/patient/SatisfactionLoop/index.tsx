/**
 * 健澜科技 jlmedaios - 【CDSS与运营精细化】M165-C 患者满意度与服务改进闭环页
 *
 * 设计原则：满意度闭环要真改进，不能只是登记投诉。
 *   页面按 收集 → 分析 → 改进 → 验证 四阶段呈现：
 *     收集  满意度/投诉/表扬三通道计数与均分；
 *     分析  问题归类、根因定位与趋势信号；
 *     改进  每条措施责任到人 + 限期，杜绝空改进；
 *     验证  改进前后复查对比，效果评定，未改善回炉不留尾巴。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Badge, Card, Col, Layout, Progress, Row, Space, Spin, Steps, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const PAGE_BG = '#f5f7fa';

/* 与 BFF SatisfactionLoopView 对齐的前端类型 */
interface CollectSummary {
  total: number;
  satisfactionCount: number;
  complaintCount: number;
  praiseCount: number;
  avgScore: number;
  dissatisfactionRatio: number;
}
interface LoopIssue {
  category: string;
  label: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  trend: 'rising' | 'stable' | 'falling';
  sampleComments: string[];
}
interface LoopAction {
  issueCategory: string;
  rootCause: string;
  action: string;
  owner: string;
  dueDays: number;
  priority: 'high' | 'medium' | 'low';
  target: string;
}
interface ImprovementEffect {
  improvementId: string;
  beforeScore: number | null;
  afterScore: number | null;
  delta: number | null;
  verdict: 'resolved' | 'improved' | 'no_change' | 'regressed';
  standardized: boolean;
  needsRework: boolean;
  conclusion: string;
}
interface SatisfactionLoopView {
  periodDays: number;
  dataSource: 'database' | 'demo';
  loop: {
    collect: CollectSummary;
    analyze: { issues: LoopIssue[]; underpowered: boolean };
    improve: { actions: LoopAction[] };
    verify: {
      total: number;
      resolvedCount: number;
      improvedCount: number;
      noChangeCount: number;
      regressedCount: number;
      standardizedCount: number;
      reworkCount: number;
      effects: ImprovementEffect[];
    };
  };
}

const SEVERITY_COLOR: Record<string, string> = { high: '#cf1322', medium: '#d48806', low: '#52c41a' };
const TREND_TEXT: Record<string, string> = { rising: '↑ 上升', stable: '→ 平稳', falling: '↓ 下降' };
const VERDICT_META: Record<string, { color: string; text: string }> = {
  resolved: { color: '#52c41a', text: '已解决' },
  improved: { color: '#4A90D9', text: '有改善' },
  no_change: { color: '#d48806', text: '无变化·回炉' },
  regressed: { color: '#cf1322', text: '恶化·督办' },
};

function StatCard({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <Card size="small" style={{ background: '#fff', borderTop: `3px solid ${ACCENT}` }}>
      <div style={{ fontSize: 13, color: '#8c8c8c' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: DEEP_BG, marginTop: 4 }}>
        {value}
        {suffix && <span style={{ fontSize: 13, fontWeight: 400, color: '#8c8c8c' }}> {suffix}</span>}
      </div>
    </Card>
  );
}

export default function SatisfactionLoopPage() {
  const [data, setData] = useState<SatisfactionLoopView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch('/api/v1/patient/satisfaction/loop');
        const json = await resp.json();
        if (json.code !== 0) throw new Error(json.message || '加载失败');
        if (!cancelled) setData(json.data as SatisfactionLoopView);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '网络异常');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
        <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <Spin size="large" tip="正在汇聚满意度闭环数据…" />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
        <Content style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
          <Alert type="error" showIcon message="加载失败" description={error} />
        </Content>
      </Layout>
    );
  }

  const loop = data?.loop;
  if (!loop) return null;
  const { collect, analyze, improve, verify } = loop;

  return (
    <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* 头部：深海蓝横幅 */}
        <Card
          style={{
            background: `linear-gradient(135deg, ${DEEP_BG} 0%, ${MID_BLUE} 100%)`,
            border: 'none',
            marginBottom: 16,
          }}
        >
          <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <Title level={3} style={{ color: '#fff', margin: 0 }}>
                患者满意度与服务改进闭环
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
                收集 → 分析 → 改进 → 验证：每一条不满意都驱动成可跟踪的改进事项，收完即改、改完即验。
              </Paragraph>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Badge
                count={data?.dataSource === 'demo' ? '演示数据' : '真实数据'}
                style={{ background: data?.dataSource === 'demo' ? '#d48806' : '#52c41a' }}
              />
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 8 }}>
                近 {data?.periodDays ?? 90} 天
              </div>
            </div>
          </Space>
        </Card>

        {/* 四阶段步骤条 */}
        <Card style={{ marginBottom: 16 }}>
          <Steps
            current={4}
            size="small"
            items={[
              { title: '收集', description: '满意度+投诉+表扬', icon: <SearchOutlined /> },
              { title: '分析', description: '归类+根因+趋势', icon: <ToolOutlined /> },
              { title: '改进', description: '措施+责任人+限期', icon: <ToolOutlined /> },
              { title: '验证', description: '复查+效果+标准化', icon: <CheckCircleOutlined /> },
            ]}
          />
        </Card>

        {/* 阶段一：收集 */}
        <Card title={<span style={{ color: MID_BLUE }}>① 收集 · 三通道信号</span>} style={{ marginBottom: 16 }} size="small">
          <Row gutter={[12, 12]}>
            <Col xs={12} sm={8} md={4}><StatCard label="信号总数" value={collect.total} /></Col>
            <Col xs={12} sm={8} md={4}><StatCard label="满意度问卷" value={collect.satisfactionCount} /></Col>
            <Col xs={12} sm={8} md={4}><StatCard label="投诉" value={collect.complaintCount} /></Col>
            <Col xs={12} sm={8} md={4}><StatCard label="表扬" value={collect.praiseCount} /></Col>
            <Col xs={12} sm={8} md={4}><StatCard label="满意度均分" value={collect.avgScore.toFixed(1)} suffix="/5" /></Col>
            <Col xs={12} sm={8} md={4}>
              <StatCard label="不满意率" value={`${Math.round(collect.dissatisfactionRatio * 100)}%`} />
            </Col>
          </Row>
          {analyze.underpowered && (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              message="样本量较小（<10），结论仅供参考，不做夸大判定。"
            />
          )}
        </Card>

        {/* 阶段二：分析 */}
        <Card title={<span style={{ color: MID_BLUE }}>② 分析 · 归类 / 根因 / 趋势</span>} style={{ marginBottom: 16 }} size="small">
          {analyze.issues.length === 0 ? (
            <Paragraph type="secondary">近 90 天未收集到不满意信号，继续保持。</Paragraph>
          ) : (
            analyze.issues.map((issue) => (
              <div key={issue.category} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space size="middle" wrap>
                  <Text strong style={{ fontSize: 15 }}>{issue.label}</Text>
                  <Tag color={SEVERITY_COLOR[issue.severity]}>
                    {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}优 · {issue.count} 条
                  </Tag>
                  <Tag color={issue.trend === 'rising' ? 'red' : issue.trend === 'falling' ? 'green' : 'default'}>
                    {TREND_TEXT[issue.trend]}
                  </Tag>
                </Space>
                {issue.sampleComments.length > 0 && (
                  <div style={{ marginTop: 8, paddingLeft: 12 }}>
                    {issue.sampleComments.map((c, i) => (
                      <Text key={i} type="secondary" style={{ display: 'block', fontSize: 13 }}>
                        「{c}」
                      </Text>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </Card>

        {/* 阶段三：改进 */}
        <Card title={<span style={{ color: MID_BLUE }}>③ 改进 · 责任到人 + 限期</span>} style={{ marginBottom: 16 }} size="small">
          {improve.actions.length === 0 ? (
            <Paragraph type="secondary">暂无待改进事项。</Paragraph>
          ) : (
            improve.actions.map((action) => (
              <div key={action.issueCategory} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space size="middle" wrap style={{ marginBottom: 6 }}>
                  <Tag color={ACCENT}>{action.rootCause}</Tag>
                  <Text strong>责任：{action.owner}</Text>
                  <Tag icon={<ClockCircleOutlined />} color="orange">限期 {action.dueDays} 天</Tag>
                </Space>
                <Paragraph style={{ marginBottom: 4 }}>{action.action}</Paragraph>
                <Text type="secondary" style={{ fontSize: 13 }}>目标：{action.target}</Text>
              </div>
            ))
          )}
        </Card>

        {/* 阶段四：验证 */}
        <Card
          title={<span style={{ color: MID_BLUE }}>④ 验证 · 复查满意度 + 效果评估 + 标准化</span>}
          size="small"
          extra={
            <Space>
              <Tag color="#52c41a">解决 {verify.resolvedCount}</Tag>
              <Tag color={ACCENT}>改善 {verify.improvedCount}</Tag>
              <Tag color="#d48806">无变化 {verify.noChangeCount}</Tag>
              <Tag color="#cf1322">恶化 {verify.regressedCount}</Tag>
            </Space>
          }
        >
          {verify.effects.length === 0 ? (
            <Paragraph type="secondary">暂无复查记录。</Paragraph>
          ) : (
            verify.effects.map((e) => {
              const meta = VERDICT_META[e.verdict];
              return (
                <div key={e.improvementId} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Space size="middle" wrap style={{ marginBottom: 6 }}>
                    <Tag color={meta.color}>{meta.text}</Tag>
                    {e.beforeScore !== null && e.afterScore !== null && (
                      <Text>
                        {e.beforeScore.toFixed(1)} → {e.afterScore.toFixed(1)}
                        <Text type="secondary">（Δ {e.delta! >= 0 ? '+' : ''}{e.delta?.toFixed(1)}）</Text>
                      </Text>
                    )}
                    {e.standardized && <Tag icon={<CheckCircleOutlined />} color="green">已标准化沉淀</Tag>}
                    {e.needsRework && <Tag icon={<ReloadOutlined />} color="red">回炉再分析</Tag>}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 13 }}>{e.conclusion}</Text>
                </div>
              );
            })
          )}
          {verify.reworkCount > 0 && (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              message={`${verify.reworkCount} 项改进未达预期，已回炉重新定位根因；闭环不收完即止。`}
            />
          )}
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">改进事项总数 {verify.total} · 已标准化 {verify.standardizedCount} 项</Text>
            <Progress
              percent={verify.total > 0 ? Math.round((verify.standardizedCount / verify.total) * 100) : 0}
              strokeColor={{ from: MID_BLUE, to: ACCENT }}
              size="small"
            />
          </div>
        </Card>

        <Paragraph style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 24 }}>
          杭州健澜科技有限公司 · 【CDSS与运营精细化】满意度改进闭环 M165-C
        </Paragraph>
      </Content>
    </Layout>
  );
}
