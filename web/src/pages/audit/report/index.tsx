/**
 * 健澜科技 jlmedaios - 审计管理页（M217-C）
 *
 * 财务/采购/医疗收费/信息系统/内外部审计/整改追踪/独立性。深海蓝 VI。
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
  financial: { audits: number };
  procurement: { audits: number };
  medicalBilling: { audits: number };
  isSecurity: { audits: number };
  internal: { audits: number };
  external: { audits: number };
  findings: { total: number; rectified: number };
  independence: { committee: boolean };
  suggestions: string[];
}

export default function AuditReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/audit/report');
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
        <Title level={3} style={{ color: VI.deep }}>医院审计管理</Title>
        <Paragraph type="secondary">财务 / 采购 / 医疗收费 / 信息系统安全 / 内外部审计 / 整改追踪</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="内部审计" value={data.internal.audits} /></Card></Col>
              <Col span={6}><Card><Statistic title="外部审计" value={data.external.audits} /></Card></Col>
              <Col span={6}><Card><Statistic title="审计发现" value={data.findings.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="已整改" value={data.findings.rectified} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>审计覆盖</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'fin', name: '财务审计', value: data.financial.audits },
                  { key: 'proc', name: '采购审计', value: data.procurement.audits },
                  { key: 'med', name: '医疗收费审计', value: data.medicalBilling.audits },
                  { key: 'is', name: '信息系统安全审计', value: data.isSecurity.audits },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '次数', dataIndex: 'value', key: 'value' },
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
