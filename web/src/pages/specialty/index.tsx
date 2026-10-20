/**
 * 健澜科技 jlmedaios - 专科页（M201-C）
 *
 * 妇幼/产科/妇科/儿科/肿瘤/化疗/放疗/专科质量。深海蓝 VI。
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
  dept: string;
  timeRange: string;
  maternalHealth: { prenatalChecks: number; highRiskPregnancies: number };
  delivery: { deliveries: number; cesareanRate: number };
  gynecology: { visits: number; surgeries: number };
  pediatrics: { visits: number; vaccinations: number };
  oncology: { screening: number; diagnosed: number; chemo: number; radiotherapy: number; followup: number };
  quality: { avgStayDays: number; readmissionRate: number };
  suggestions: string[];
}

export default function SpecialtyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/specialty/report?dept=妇幼肿瘤');
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
        <Title level={3} style={{ color: VI.deep }}>妇幼健康与肿瘤专科</Title>
        <Paragraph type="secondary">孕前/孕期/分娩/产后/儿童/妇科/肿瘤筛查/化疗/放疗/随访</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="产检数" value={data.maternalHealth.prenatalChecks} /></Card></Col>
              <Col span={6}><Card><Statistic title="分娩数" value={data.delivery.deliveries} /></Card></Col>
              <Col span={6}><Card><Statistic title="肿瘤筛查" value={data.oncology.screening} /></Card></Col>
              <Col span={6}><Card><Statistic title="化疗患者" value={data.oncology.chemo} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>专科质量</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'csr', name: '剖宫产率', value: `${(data.delivery.cesareanRate * 100).toFixed(1)}%` },
                  { key: 'lod', name: '平均住院日', value: `${data.quality.avgStayDays} 天` },
                  { key: 'rar', name: '再入院率', value: `${(data.quality.readmissionRate * 100).toFixed(1)}%` },
                  { key: 'rad', name: '放疗患者', value: data.oncology.radiotherapy },
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
