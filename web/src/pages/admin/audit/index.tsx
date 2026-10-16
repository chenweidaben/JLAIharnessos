/**
 * 健澜科技 jlmedaios - 审计管理页（M198-C）
 *
 * 内部审计/IT审计/医疗审计/发现/整改/追踪/报告/外部配合。深海蓝 VI。
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
  internal: { financial: number; economic: number; construction: number; procurement: number };
  it: { generalControls: number; applicationControls: number; securityAudit: number };
  medical: { billing: number; insurance: number; prescription: number; emr: number };
  findings: { open: number; inProgress: number; closed: number; overdue: number };
  remediation: { total: number; onTimeRate: number };
  tracking: { tracked: number };
  report: { issued: number };
  external: { coordinated: number };
  suggestions: string[];
}

export default function AuditPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/audit/report');
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
        <Title level={3} style={{ color: VI.deep }}>审计管理深化</Title>
        <Paragraph type="secondary">内部审计 / IT 系统审计 / 医疗服务审计 / 发现整改追踪 / 外部审计配合</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="未关闭发现" value={data.findings.open} valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="已关闭发现" value={data.findings.closed} /></Card></Col>
              <Col span={6}><Card><Statistic title="逾期发现" value={data.findings.overdue} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="整改及时率" value={`${(data.remediation.onTimeRate * 100).toFixed(1)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>审计类型统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'fin', name: '财务审计', count: data.internal.financial },
                  { key: 'it', name: 'IT 审计', count: data.it.securityAudit },
                  { key: 'med', name: '医疗审计', count: data.medical.prescription },
                  { key: 'proc', name: '采购审计', count: data.internal.procurement },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'count', key: 'count' },
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
