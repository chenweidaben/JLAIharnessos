/**
 * 健澜科技 jlmedaios - 健康管理 V2 页（M222-B）
 *
 * 健康体检/风险评估/慢病管理/健康教育/生活方式干预/健康档案/商保对接。深海蓝 VI。
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
  screening: { exams: number };
  risk: { assessed: number };
  chronic: { hypertension: number; diabetes: number; cad: number; copd: number };
  education: { sessions: number };
  intervention: { lifestyle: number };
  records: { ehr: number };
  insurance: { commercial: number };
  center: { visits: number };
  suggestions: string[];
}

export default function HealthManagementV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/health-management/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>健康管理 V2</Title>
        <Paragraph type="secondary">健康体检 / 风险评估 / 慢病管理（高血压·糖尿病·冠心病·慢阻肺）/ 生活方式干预</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="健康体检" value={data.screening.exams} /></Card></Col>
              <Col span={6}><Card><Statistic title="风险评估" value={data.risk.assessed} /></Card></Col>
              <Col span={6}><Card><Statistic title="生活方式干预" value={data.intervention.lifestyle} /></Card></Col>
              <Col span={6}><Card><Statistic title="健康档案" value={data.records.ehr} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>慢病管理</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ht', name: '高血压', value: data.chronic.hypertension },
                  { key: 'dm', name: '糖尿病', value: data.chronic.diabetes },
                  { key: 'cad', name: '冠心病', value: data.chronic.cad },
                  { key: 'copd', name: '慢阻肺', value: data.chronic.copd },
                ]}
                columns={[
                  { title: '病种', dataIndex: 'name', key: 'name' },
                  { title: '管理例数', dataIndex: 'value', key: 'value' },
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
