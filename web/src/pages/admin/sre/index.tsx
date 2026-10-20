/**
 * 健澜科技 jlmedaios - SRE 页（M197-D）
 *
 * SLO/SLI/错误预算/告警/事件/容量/灾备/文化。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  slo: { availability: number; latency: number; correctness: number };
  sli: { availability: number; latencyMs: number; throughput: number; errorRate: number };
  errorBudget: { total: number; consumed: number; remaining: number; burnRate: number };
  alerting: { rules: number; critical: number; warning: number; noise: number };
  incidents: { total: number; p0: number; p1: number; postmortems: number; knowledgeBase: number };
  capacity: { currentUtilization: number; projectedGrowth: number };
  dr: { drills: number; rto: number; rpo: number };
  culture: { blamelessPostmortem: boolean; training: number };
  suggestions: string[];
}

export default function SREPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/sre/report');
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>SRE 深化</Title>
        <Paragraph type="secondary">SLO / SLI / 错误预算 / 告警 / 事件管理 / 容量规划 / 灾备演练 / 可靠性文化</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="可用性 SLO">
                  <Statistic value={`${(data.slo.availability * 100).toFixed(3)}%`} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="错误预算消耗">
                  <Statistic value={`${(data.errorBudget.burnRate * 100).toFixed(1)}%`} />
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="P0 事件" value={data.incidents.p0} /></Card></Col>
              <Col span={6}><Card><Statistic title="RTO(分钟)" value={data.dr.rto} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>SLO/SLI 对比</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'avail', name: '可用性', slo: `${(data.slo.availability * 100).toFixed(3)}%`, sli: `${(data.sli.availability * 100).toFixed(3)}%` },
                  { key: 'lat', name: '延迟达标率', slo: `${(data.slo.latency * 100).toFixed(1)}%`, sli: `${data.sli.latencyMs}ms` },
                  { key: 'correct', name: '正确率', slo: `${(data.slo.correctness * 100).toFixed(2)}%`, sli: `${(data.sli.errorRate * 100).toFixed(2)}%` },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: 'SLO 目标', dataIndex: 'slo', key: 'slo' },
                  { title: '当前 SLI', dataIndex: 'sli', key: 'sli' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
