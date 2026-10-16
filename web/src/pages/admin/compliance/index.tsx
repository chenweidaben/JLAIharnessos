/**
 * 健澜科技 jlmedaios - 合规管理页（M198-B）
 *
 * 法律法规/行业规范/医疗质量/医保/药品/设备/培训/审计。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Progress,
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
  laws: { dataSecurity: boolean; privacy: boolean; cybersecurity: boolean; basicMedical: boolean };
  industry: { emrStandard: boolean; interoperability: string; smartServiceGrade: string };
  medicalQuality: { compliant: number; issues: number };
  insurance: { compliant: number; issues: number };
  drug: { compliant: number; issues: number };
  device: { compliant: number; issues: number };
  training: { sessions: number; attendees: number; passRate: number };
  audit: { internal: number; external: number };
  findings: { high: number; medium: number; low: number; overallScore: number };
  suggestions: string[];
}

export default function CompliancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/compliance/report');
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
        <Title level={3} style={{ color: VI.deep }}>合规管理深化</Title>
        <Paragraph type="secondary">法律法规 / 行业规范 / 医疗质量 / 医保 / 药品 / 设备 / 培训 / 审计</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="合规总分">
                  <Progress type="circle" percent={data.findings.overallScore} size={60} />
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="高危发现" value={data.findings.high} valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="培训场次" value={data.training.sessions} /></Card></Col>
              <Col span={6}><Card><Statistic title="内部审计" value={data.audit.internal} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>各领域合规率</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'mq', name: '医疗质量', rate: data.medicalQuality.compliant },
                  { key: 'ins', name: '医保合规', rate: data.insurance.compliant },
                  { key: 'dr', name: '药品合规', rate: data.drug.compliant },
                  { key: 'dev', name: '设备合规', rate: data.device.compliant },
                ]}
                columns={[
                  { title: '领域', dataIndex: 'name', key: 'name' },
                  { title: '合规率(%)', dataIndex: 'rate', key: 'rate', render: (r: number) => <Progress percent={r} size="small" /> },
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
