/**
 * 健澜科技 jlmedaios - 护理敏感质量指标（NQI）月度趋势看板
 *
 * 四个指标卡（跌倒/压疮/管路滑脱/给药错误）+ 月度发生率折线图。
 * 数据来自 GET /api/v1/nursing/nqi（store/service）；后端未接真实库时返回 demo。
 *
 * Copyright (c) 健澜科技
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useNursingNqiStore } from '@/store/nursingNqiStore';

const { Header, Content } = Layout;
const { Title } = Typography;

/** 健澜深海蓝色系 */
const PALETTE = ['#0A4D8C', '#13C2C2', '#FAAD14', '#F5222D'];

export default function NqiDashboardPage() {
  const { data, loading, error, fetchTrend } = useNursingNqiStore();

  useEffect(() => {
    void fetchTrend();
  }, [fetchTrend]);

  const indicators = data?.indicators ?? [];
  const months = data?.months ?? [];

  const lineOption: EChartsOption = {
    color: PALETTE,
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} ‰` },
    legend: { top: 0, data: indicators.map((i) => i.name) },
    grid: { left: 50, right: 24, top: 44, bottom: 40 },
    xAxis: {
      type: 'category',
      data: months,
      boundaryGap: false,
      axisLabel: { rotate: 30 },
    },
    yAxis: { type: 'value', name: '‰' },
    series: indicators.map((ind) => ({
      name: ind.name,
      type: 'line' as const,
      smooth: true,
      data: ind.trend.map((p) => p.rate),
    })),
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          护理敏感质量指标看板
        </Title>
        {data?.demo && (
          <Tag color="orange" style={{ marginLeft: 12 }}>演示数据</Tag>
        )}
      </Header>
      <Content style={{ padding: 24 }}>
        {error && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />
        )}
        <Spin spinning={loading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {indicators.map((ind, idx) => (
              <Col key={ind.key} xs={24} sm={12} lg={6}>
                <Card style={{ marginBottom: 16 }}>
                  <Statistic
                    title={
                      <span style={{ color: PALETTE[idx % PALETTE.length] }}>{ind.name}</span>
                    }
                    value={ind.latestRate}
                    precision={2}
                    suffix={ind.unit}
                  />
                  <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                    区间累计 {ind.totalEvents} 例 · 平均 {ind.avgRate}
                    {ind.unit}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          <Card title="月度发生率趋势（每千住院床日）">
            {months.length > 0 ? (
              <ReactECharts option={lineOption} style={{ height: 380 }} notMerge />
            ) : (
              <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.35)' }}>
                暂无趋势数据
              </div>
            )}
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
