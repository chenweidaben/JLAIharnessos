/**
 * 健澜科技 jlmedaios - 生产运维页（M201-D）
 *
 * 生产监控/日志/告警/事故/变更/容量/灾备/自动化。深海蓝 VI。
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
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  monitoring: { services: number; healthy: number; availability: number };
  logging: { dailyLogsGB: number; retainedDays: number };
  alerting: { rules: number; today: number; noiseRate: number };
  incidents: { total: number; p0: number; p1: number; resolved: number };
  changeMgmt: { changes: number; failed: number; rollback: number };
  capacity: { cpuAvg: number; memoryAvg: number; diskAvg: number };
  dr: { drills: number; rtoMinutes: number; rpoMinutes: number };
  automation: { deployJobs: number; inspectionJobs: number };
  suggestions: string[];
}

export default function ProductionOpsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/production-ops/report');
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
        <Title level={3} style={{ color: VI.deep }}>生产环境运维监控</Title>
        <Paragraph type="secondary">服务健康 / 日志管理 / 告警 / 事故复盘 / 变更管理 / 容量 / 灾备 / 自动化</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="可用性" value={`${(data.monitoring.availability * 100).toFixed(2)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="事故总数" value={data.incidents.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="今日告警" value={data.alerting.today} /></Card></Col>
              <Col span={6}><Card><Statistic title="CPU 平均" value={`${(data.capacity.cpuAvg * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>灾备指标</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'rto', name: 'RTO', value: `${data.dr.rtoMinutes} 分钟` },
                  { key: 'rpo', name: 'RPO', value: `${data.dr.rpoMinutes} 分钟` },
                  { key: 'dri', name: '年度演练', value: `${data.dr.drills} 次` },
                  { key: 'aut', name: '自动化部署', value: `${data.automation.deployJobs} 次/月` },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '值', dataIndex: 'value', key: 'value' },
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
