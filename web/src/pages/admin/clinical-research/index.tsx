/**
 * 健澜科技 jlmedaios - 临床科研页（M202-D）
 *
 * 临床试验/受试者/CRF数据/AE-SAE/RWS/伦理审查。深海蓝 VI。
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
  trials: { active: number; recruiting: number; completed: number; totalSubjects: number };
  data: { crfPages: number; queries: number; resolvedQueries: number };
  safety: { totalAE: number; sae: number; monitoringVisits: number };
  rws: { studies: number; datasets: number; publications: number };
  ethics: { pendingReviews: number; approved: number };
  suggestions: string[];
}

export default function ClinicalResearchPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/research/report');
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
        <Title level={3} style={{ color: VI.deep }}>临床试验与真实世界研究</Title>
        <Paragraph type="secondary">在研项目 / 受试者入组 / CRF 数据 / AE·SAE 安全 / RWS / 伦理审查</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="在研项目" value={data.trials.active} /></Card></Col>
              <Col span={6}><Card><Statistic title="总受试者" value={data.trials.totalSubjects} /></Card></Col>
              <Col span={6}><Card><Statistic title="SAE" value={data.safety.sae} /></Card></Col>
              <Col span={6}><Card><Statistic title="RWS 研究" value={data.rws.studies} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>试验安全</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ae', name: '不良事件总数', value: data.safety.totalAE },
                  { key: 'sae', name: '严重不良事件 SAE', value: data.safety.sae },
                  { key: 'mon', name: '监查访视', value: data.safety.monitoringVisits },
                  { key: 'eth', name: '待伦理审查', value: data.ethics.pendingReviews },
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
