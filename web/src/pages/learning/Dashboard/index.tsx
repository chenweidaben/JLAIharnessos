/**
 * 健澜科技 jlmedaios - 学习引擎监控看板
 *
 * 依据宪法第三章（国家机构民生保障与公共服务信息化职责）精神：
 *   四张深海蓝 VI 图表（#0A2540 底色 / #4A90D9 强调）——
 *   1) 采纳率趋势（折线，今日 vs 昨日环比）；
 *   2) 策略权重分布（饼图）；
 *   3) 知识增长曲线（面积累计）；
 *   4) 患者画像覆盖率（仪表盘）。
 *
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 * 权限：medmuse:view。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Empty, Layout, Row, Spin, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { get } from '@/services/request';
import { usePermission } from '@/router/guards';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';
const PALETTE = ['#4A90D9', '#6FC3DF', '#7FD1AE', '#F2C14E', '#E07A5F'];

/** 与 BFF GET /api/v1/learning/dashboard 响应 data 对齐 */
interface TrendView {
  delta: number;
  pctChange: number;
}
interface DashboardData {
  adoptionRate: {
    series: Array<{ date: string; rate: number }>;
    current: number;
    trend: TrendView;
  };
  weightDistribution: {
    slices: Array<{ type: string; weight: number }>;
  };
  knowledgeGrowth: {
    series: Array<{ date: string; count: number }>;
    total: number;
    trend: TrendView;
  };
  patientProfileCoverage: {
    profiled: number;
    total: number;
    rate: number;
    trend: TrendView;
  };
}
interface DashboardResponse {
  demo: boolean;
  dashboard: DashboardData;
}

/** 环比小标签：上升绿 / 下降红 */
function TrendBadge({ trend, percent }: { trend: TrendView; percent?: boolean }) {
  const sign = trend.delta > 0 ? '+' : '';
  const value = percent ? `${(trend.pctChange * 100).toFixed(1)}%` : trend.delta.toFixed(2);
  return (
    <Badge
      count={`${sign}${value}`}
      style={{ background: trend.delta >= 0 ? '#52c41a' : '#cf1322', fontSize: 12 }}
      overflowCount={9999}
    />
  );
}

export default function LearningDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const { hasPermission } = usePermission();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<DashboardResponse>('/learning/dashboard', undefined, { silent: true });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '学习引擎看板加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canView = hasPermission('medmuse:view');
  const d = data?.dashboard;
  const isEmpty =
    !!d &&
    d.adoptionRate.series.length === 0 &&
    d.weightDistribution.slices.length === 0 &&
    d.knowledgeGrowth.series.length === 0 &&
    d.patientProfileCoverage.total === 0;

  // 图 1：采纳率趋势
  const adoptionOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${(v * 100).toFixed(1)}%` },
    grid: { left: 48, right: 24, top: 32, bottom: 32 },
    xAxis: {
      type: 'category',
      data: d?.adoptionRate.series.map((p) => p.date.slice(5)) ?? [],
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
    },
    yAxis: {
      type: 'value',
      max: 1,
      axisLabel: { color: 'rgba(255,255,255,0.65)', formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [
      {
        name: '采纳率',
        type: 'line',
        smooth: true,
        data: d?.adoptionRate.series.map((p) => p.rate) ?? [],
        lineStyle: { color: ACCENT, width: 3 },
        itemStyle: { color: ACCENT },
        areaStyle: { color: 'rgba(74,144,217,0.25)' },
      },
    ],
  };

  // 图 2：权重分布饼图
  const weightOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', valueFormatter: (v: number) => `${(v * 100).toFixed(1)}%` },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.75)' } },
    series: [
      {
        name: '权重分布',
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '46%'],
        label: { color: 'rgba(255,255,255,0.85)', formatter: '{b} {d}%' },
        data:
          d?.weightDistribution.slices.map((s, i) => ({
            name: s.type,
            value: s.weight,
            itemStyle: { color: PALETTE[i % PALETTE.length] },
          })) ?? [],
      },
    ],
  };

  // 图 3：知识增长曲线
  const growthOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 24, top: 32, bottom: 32 },
    xAxis: {
      type: 'category',
      data: d?.knowledgeGrowth.series.map((p) => p.date.slice(5)) ?? [],
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [
      {
        name: '累计知识条目',
        type: 'line',
        smooth: true,
        step: 'end',
        data: d?.knowledgeGrowth.series.map((p) => p.count) ?? [],
        lineStyle: { color: '#7FD1AE', width: 3 },
        itemStyle: { color: '#7FD1AE' },
        areaStyle: { color: 'rgba(127,209,174,0.25)' },
      },
    ],
  };

  // 图 4：画像覆盖率仪表盘
  const coverage = d?.patientProfileCoverage;
  const coverageOption = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        progress: { show: true, width: 14, itemStyle: { color: ACCENT } },
        axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(255,255,255,0.12)']] } },
        axisLabel: { show: false },
        pointer: { show: true, itemStyle: { color: '#fff' } },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          color: '#fff',
          offsetCenter: [0, '10%'],
          formatter: (v: number) => `${v.toFixed(0)}%`,
        },
        data: [{ value: Math.round((coverage?.rate ?? 0) * 100) }],
      },
    ],
  };

  const chartCard = (title: string, extra: React.ReactNode, chart: React.ReactNode) => (
    <Card
      bodyStyle={{ background: DEEP_BG, borderRadius: 8, height: 320 }}
      style={{ background: DEEP_BG }}
      title={<span style={{ color: '#fff' }}>{title}</span>}
      extra={extra}
    >
      {chart}
    </Card>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>学习引擎监控看板</Title>
        <div>
          {data?.demo && <Badge count="演示数据" style={{ background: '#faad14', marginRight: 12 }} overflowCount={99} />}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>
        </div>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error}
            action={<Button size="small" danger onClick={() => void load()}>重试</Button>}
          />
        )}
        {!canView && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="缺少 medmuse:view 权限，无法查看学习引擎看板" />
        )}

        {loading && !d ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="加载学习引擎指标…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无学习引擎指标数据：反馈日志 / 策略 / 知识库尚未沉淀" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              {chartCard(
                '采纳率趋势',
                <TrendBadge trend={d!.adoptionRate.trend} percent />,
                <ReactECharts option={adoptionOption} style={{ height: 250 }} />,
              )}
            </Col>
            <Col xs={24} lg={12}>
              {chartCard(
                '策略权重分布',
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>激活版本归一化</Text>,
                <ReactECharts option={weightOption} style={{ height: 250 }} />,
              )}
            </Col>
            <Col xs={24} lg={12}>
              {chartCard(
                '知识增长曲线',
                <TrendBadge trend={d!.knowledgeGrowth.trend} />,
                <ReactECharts option={growthOption} style={{ height: 250 }} />,
              )}
            </Col>
            <Col xs={24} lg={12}>
              {chartCard(
                '患者画像覆盖率',
                <TrendBadge trend={d!.patientProfileCoverage.trend} percent />,
                <div>
                  <ReactECharts option={coverageOption} style={{ height: 220 }} />
                  <Text style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center', display: 'block' }}>
                    已画像 {coverage?.profiled ?? 0} / 触达 {coverage?.total ?? 0}
                  </Text>
                </div>,
              )}
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
