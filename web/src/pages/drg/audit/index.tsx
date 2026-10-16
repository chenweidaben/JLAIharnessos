/**
 * 健澜科技 jlmedaios - DRG 智能审核 V2 页（M187-D）
 *
 * 高套分值/低标入院/分解住院/拒付风险分布。深海蓝 VI。
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

interface Alert {
  recordId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

interface Result {
  timeRange: string;
  totalRecords: number;
  highCodingAlerts: Alert[];
  lowAdmissionCount: number;
  breakdownCount: number;
  rejectionRiskDistribution: { low: number; medium: number; high: number };
  suggestions: string[];
}

function sevColor(s: string): string {
  if (s === 'high') return 'red';
  if (s === 'medium') return 'orange';
  return 'default';
}

export default function DRGAuditV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/drg/audit/report-v2');
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
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>DRG 智能审核 · 医保风险预警</Title>
        <Paragraph type="secondary">高套分值 / 低标入院 / 分解住院 / 拒付风险分布</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="总病案数" value={data.totalRecords} /></Card></Col>
              <Col span={4}><Card><Statistic title="高套分值疑似" value={data.highCodingAlerts.length} /></Card></Col>
              <Col span={4}><Card><Statistic title="低标入院" value={data.lowAdmissionCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="分解住院" value={data.breakdownCount} /></Card></Col>
              <Col span={4}>
                <Card><Statistic title="高风险" value={data.rejectionRiskDistribution.high} valueStyle={{ color: '#cf1322' }} /></Card>
              </Col>
              <Col span={4}>
                <Card><Statistic title="中风险" value={data.rejectionRiskDistribution.medium} valueStyle={{ color: '#fa8c16' }} /></Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>高套分值疑似清单</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="recordId"
                size="small"
                pagination={false}
                dataSource={data.highCodingAlerts}
                columns={[
                  { title: '病案号', dataIndex: 'recordId', key: 'recordId' },
                  { title: '原因', dataIndex: 'reason', key: 'reason' },
                  {
                    title: '等级',
                    dataIndex: 'severity',
                    key: 'severity',
                    render: (s: string) => <Tag color={sevColor(s)}>{s}</Tag>,
                  },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>整改建议</Text>}>
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
