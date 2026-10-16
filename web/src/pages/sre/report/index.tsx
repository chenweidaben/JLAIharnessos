/**
 * 健澜科技 jlmedaios - SRE 页（M216-D）
 *
 * SLI/SLO/错误预算/监控告警/事故复盘/容量规划/多活灾备/混沌工程。深海蓝 VI。
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
  slo: { availability: number; latency: number };
  monitoring: { alerts: number };
  postmortem: { incidents: number; blameless: boolean };
  capacity: { planned: number };
  disasterRecovery: { activeActive: boolean; rto: number; rpo: number };
  chaos: { experiments: number };
  oncall: { engineers: number };
  culture: { blameless: boolean };
  suggestions: string[];
}

export default function SREReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/sre/report');
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
        <Title level={3} style={{ color: VI.deep }}>SRE 站点可靠性工程</Title>
        <Paragraph type="secondary">SLI/SLO / 错误预算 / 监控告警 / 无指责复盘 / 多活灾备 RTO·RPO / 混沌工程</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="可用性" value={`${data.slo.availability}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="延迟 P99" value={`${data.slo.latency}ms`} /></Card></Col>
              <Col span={6}><Card><Statistic title="事故数" value={data.postmortem.incidents} /></Card></Col>
              <Col span={6}><Card><Statistic title="混沌实验" value={data.chaos.experiments} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>灾备能力</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'aa', name: '多活架构', value: data.disasterRecovery.activeActive ? '已启用' : '未启用' },
                  { key: 'rto', name: 'RTO（恢复时间目标）', value: `${data.disasterRecovery.rto} 分钟` },
                  { key: 'rpo', name: 'RPO（恢复点目标）', value: `${data.disasterRecovery.rpo} 分钟` },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '数值', dataIndex: 'value', key: 'value' },
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
