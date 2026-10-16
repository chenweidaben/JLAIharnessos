/**
 * 健澜科技 jlmedaios - 学习闭环数据飞轮页（M183-B）
 *
 * ECharts 环形图展示飞轮四环节占比，趋势线展示每日推荐量与采纳率变化。
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Card, Col, Layout, Row, Spin, Statistic, Typography } from 'antd';
import * as echarts from 'echarts';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = {
  deep: '#0A2540',
  mid: '#1E5F8C',
  accent: '#4A90D9',
  bg: '#f5f7fa',
};

interface FlywheelData {
  totalRecommendations: number;
  totalAdopted: number;
  totalRejected: number;
  totalKnowledge: number;
  adoptionRate: number;
  flywheelVelocity: number;
  trend: Array<{
    date: string;
    recommendations: number;
    adopted: number;
    adoptionRate: number;
    knowledge: number;
  }>;
  stages: Array<{ key: string; label: string; value: number; description: string }>;
  degraded?: boolean;
  message?: string;
}

export default function LearningFlywheelPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<FlywheelData | null>(null);
  const donutRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<FlywheelData>('/api/v1/learning/flywheel');
        if (!cancelled) setData(resp);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data || !donutRef.current || !trendRef.current) return;

    // 环形图：四环节占比
    const donutChart = echarts.init(donutRef.current);
    donutChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: VI.deep } },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, color: VI.deep, formatter: '{b}\n{c}' },
          data: data.stages.map((s, i) => ({
            name: s.label,
            value: s.value,
            itemStyle: { color: [VI.mid, VI.accent, '#52c41a', '#faad14'][i] },
          })),
        },
      ],
    });

    // 趋势线：推荐量 + 采纳率双轴
    const trendChart = echarts.init(trendRef.current);
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['推荐下发', '采纳数', '采纳率'], textStyle: { color: VI.deep } },
      grid: { left: 50, right: 50, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: data.trend.map((t) => t.date),
        axisLabel: { color: VI.deep },
      },
      yAxis: [
        {
          type: 'value',
          name: '数量',
          axisLabel: { color: VI.deep },
        },
        {
          type: 'value',
          name: '采纳率',
          min: 0,
          max: 1,
          axisLabel: { color: VI.deep, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
        },
      ],
      series: [
        {
          name: '推荐下发',
          type: 'bar',
          data: data.trend.map((t) => t.recommendations),
          itemStyle: { color: VI.accent },
        },
        {
          name: '采纳数',
          type: 'bar',
          data: data.trend.map((t) => t.adopted),
          itemStyle: { color: '#52c41a' },
        },
        {
          name: '采纳率',
          type: 'line',
          yAxisIndex: 1,
          data: data.trend.map((t) => t.adoptionRate),
          smooth: true,
          lineStyle: { color: '#faad14', width: 3 },
          itemStyle: { color: '#faad14' },
        },
      ],
    });

    const handleResize = (): void => {
      donutChart.resize();
      trendChart.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      donutChart.dispose();
      trendChart.dispose();
    };
  }, [data]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            学习闭环数据飞轮
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            推荐下发 → 医生反馈 → 经验沉淀 → 采纳率提升——AI 原生医院越用越聪明。
          </Paragraph>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载飞轮数据…" />
          </div>
        )}

        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        {!loading && !error && data && (
          <>
            {data.degraded && (
              <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={data.message ?? '数据库暂不可用'} />
            )}

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="总推荐数" value={data.totalRecommendations} valueStyle={{ color: VI.mid }} />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="总采纳数" value={data.totalAdopted} valueStyle={{ color: '#52c41a' }} />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="整体采纳率"
                    value={`${(data.adoptionRate * 100).toFixed(1)}%`}
                    valueStyle={{ color: VI.accent }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="飞轮转速（日均采纳）"
                    value={data.flywheelVelocity.toFixed(1)}
                    valueStyle={{ color: '#faad14' }}
                    suffix="条/天"
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} lg={10}>
                <Card title={<Text strong style={{ color: VI.deep }}>飞轮四环节占比</Text>}>
                  <div ref={donutRef} style={{ height: 320 }} />
                </Card>
              </Col>
              <Col xs={24} lg={14}>
                <Card title={<Text strong style={{ color: VI.deep }}>推荐量与采纳率趋势</Text>}>
                  <div ref={trendRef} style={{ height: 320 }} />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
