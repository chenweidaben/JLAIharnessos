/**
 * 健澜科技 jlmedaios - 系统智能度监控面板（M119-D）
 *
 * 依据宪法第七章（AI 原生医院 / MUSE 智能体治理）：
 *   核心指标大数字（大模型成功率 / 建议采纳率 / 问答准确率 / 业务覆盖率）；
 *   四维指标趋势线（近 N 周期，echarts）；
 *   红色告警（指标跌破阈值或环比骤降，critical 置顶）。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 * 权限：仅 admin 可访问（BFF 已强校验，前端不做开关）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Layout,
  List,
  Row,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
/** 告警红 */
const ALERT_RED = '#cf1322';
const ALERT_AMBER = '#faad14';

/** 与 BFF GET /api/v1/muse/system/intelligence 响应 data 对齐 */
interface TrendPoint {
  period: string;
  llmSuccessRate: number;
  recommendationAdoptionRate: number;
  qaAccuracy: number;
  coverageRate: number;
}

interface IntelligenceAlert {
  key: string;
  name: string;
  current: number;
  threshold: number;
  severity: 'critical' | 'warning';
  message: string;
}

interface SystemIntelligenceData {
  demo: boolean;
  generatedAt: string;
  llmSuccessRate: number;
  recommendationAdoptionRate: number;
  qaAccuracy: number;
  coverageRate: number;
  sampleSizes: {
    llmCalls: number;
    recommendations: number;
    qaSamples: number;
    coverageScenarios: number;
  };
  trends: TrendPoint[];
  alerts: IntelligenceAlert[];
}

/** 大数字卡片：指标低于阈值时数字标红 */
function MetricCard({
  label,
  value,
  sample,
  danger,
  accent,
}: {
  label: string;
  value: number;
  sample: string;
  danger: boolean;
  accent: string;
}) {
  return (
    <Card
      style={{ borderTop: `3px solid ${accent}`, borderRadius: 8, height: '100%' }}
      bodyStyle={{ padding: 20 }}
    >
      <Text type="secondary">{label}</Text>
      <div style={{ marginTop: 8 }}>
        <Title
          level={2}
          style={{ color: danger ? ALERT_RED : DEEP_BG, margin: 0 }}
        >
          {(value * 100).toFixed(1)}
          <Text style={{ fontSize: 14, color: 'rgba(10,37,64,0.55)', marginLeft: 4 }}>%</Text>
        </Title>
      </div>
      <Text style={{ fontSize: 12, color: 'rgba(10,37,64,0.45)' }}>{sample}</Text>
    </Card>
  );
}

export default function SystemIntelligencePage() {
  const [data, setData] = useState<SystemIntelligenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<SystemIntelligenceData>('/muse/system/intelligence', undefined, {
        silent: true,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '系统智能度看板加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isEmpty = !!data && data.trends.length === 0;

  // 红线（与 BFF 默认阈值对齐，用于数字标红）
  const dangerMap = useMemo(
    () => ({
      llmSuccessRate: (data?.llmSuccessRate ?? 1) < 0.9,
      recommendationAdoptionRate: (data?.recommendationAdoptionRate ?? 1) < 0.6,
      qaAccuracy: (data?.qaAccuracy ?? 1) < 0.85,
      coverageRate: (data?.coverageRate ?? 1) < 0.7,
    }),
    [data],
  );

  // 趋势线：四维比率 → 百分比折线（深海蓝 VI）
  const trendOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${(v * 100).toFixed(1)}%` },
    legend: {
      data: ['大模型成功率', '建议采纳率', '问答准确率', '业务覆盖率'],
      textStyle: { color: 'rgba(255,255,255,0.75)' },
    },
    grid: { left: 48, right: 24, top: 40, bottom: 32 },
    xAxis: {
      type: 'category',
      data: (data?.trends ?? []).map((t) => t.period),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
      axisLabel: { color: 'rgba(255,255,255,0.7)' },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      axisLabel: {
        color: 'rgba(255,255,255,0.65)',
        formatter: (v: number) => `${Math.round(v * 100)}%`,
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [
      {
        name: '大模型成功率',
        type: 'line',
        smooth: true,
        data: (data?.trends ?? []).map((t) => t.llmSuccessRate),
        lineStyle: { color: ACCENT },
        itemStyle: { color: ACCENT },
      },
      {
        name: '建议采纳率',
        type: 'line',
        smooth: true,
        data: (data?.trends ?? []).map((t) => t.recommendationAdoptionRate),
        lineStyle: { color: '#52c41a' },
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '问答准确率',
        type: 'line',
        smooth: true,
        data: (data?.trends ?? []).map((t) => t.qaAccuracy),
        lineStyle: { color: ALERT_AMBER },
        itemStyle: { color: ALERT_AMBER },
      },
      {
        name: '业务覆盖率',
        type: 'line',
        smooth: true,
        data: (data?.trends ?? []).map((t) => t.coverageRate),
        lineStyle: { color: '#9254de' },
        itemStyle: { color: '#9254de' },
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: DEEP_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          系统智能度监控
        </Title>
        <div>
          {data?.demo && (
            <Badge
              count="演示数据"
              style={{ background: ALERT_AMBER, marginRight: 12 }}
              overflowCount={99}
            />
          )}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            刷新
          </Button>
        </div>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error}
            action={
              <Button size="small" danger onClick={() => void load()}>
                重试
              </Button>
            }
          />
        )}

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="加载系统智能度看板…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无智能度趋势数据：开始积累大模型调用、建议反馈与问答样本后，这里会自动生成核心指标、趋势线与告警" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 核心指标大数字 */}
            <Col xs={24} sm={12} lg={6}>
              <MetricCard
                label="大模型成功率"
                value={data?.llmSuccessRate ?? 0}
                sample={`样本 ${data?.sampleSizes.llmCalls ?? 0} 次调用`}
                danger={dangerMap.llmSuccessRate}
                accent={dangerMap.llmSuccessRate ? ALERT_RED : ACCENT}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricCard
                label="建议采纳率"
                value={data?.recommendationAdoptionRate ?? 0}
                sample={`样本 ${data?.sampleSizes.recommendations ?? 0} 条建议`}
                danger={dangerMap.recommendationAdoptionRate}
                accent={dangerMap.recommendationAdoptionRate ? ALERT_RED : '#52c41a'}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricCard
                label="问答准确率"
                value={data?.qaAccuracy ?? 0}
                sample={`样本 ${data?.sampleSizes.qaSamples ?? 0} 次问答`}
                danger={dangerMap.qaAccuracy}
                accent={dangerMap.qaAccuracy ? ALERT_RED : ALERT_AMBER}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricCard
                label="业务覆盖率"
                value={data?.coverageRate ?? 0}
                sample={`样本 ${data?.sampleSizes.coverageScenarios ?? 0} 个场景`}
                danger={dangerMap.coverageRate}
                accent={dangerMap.coverageRate ? ALERT_RED : '#9254de'}
              />
            </Col>

            {/* 趋势线 */}
            <Col xs={24} lg={16}>
              <Card
                title={<span style={{ color: '#fff' }}>智能度趋势</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <ReactECharts option={trendOption} style={{ height: 360 }} />
              </Card>
            </Col>

            {/* 红色告警 */}
            <Col xs={24} lg={8}>
              <Card
                title={
                  <span style={{ color: '#fff' }}>
                    告警
                    <Tag color={ALERT_RED} style={{ marginLeft: 8 }}>
                      {(data?.alerts ?? []).length}
                    </Tag>
                  </span>
                }
                style={{ background: DEEP_BG, borderRadius: 8, height: 420 }}
                bodyStyle={{ background: DEEP_BG, overflowY: 'auto', maxHeight: 360 }}
              >
                {(data?.alerts ?? []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
                      各项智能度指标正常，暂无告警
                    </Text>
                  </div>
                ) : (
                  <List
                    size="small"
                    dataSource={data?.alerts ?? []}
                    renderItem={(a) => (
                      <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tag color={a.severity === 'critical' ? ALERT_RED : ALERT_AMBER}>
                              {a.severity === 'critical' ? '严重' : '预警'}
                            </Tag>
                            <Text style={{ color: '#fff', fontWeight: 600 }}>{a.name}</Text>
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                              {a.message}
                            </Text>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
