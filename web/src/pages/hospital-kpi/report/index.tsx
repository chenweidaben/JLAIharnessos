/**
 * 健澜科技 jlmedaios - 国考绩效页（M210-D）
 *
 * 医疗质量/运营效率/持续发展/满意度/55指标。深海蓝 VI。
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
  quality: { level34Surgery: number; cmi: number; lowRiskMortality: number };
  efficiency: { time: number; resource: number };
  development: { talent: number; discipline: number; research: number };
  satisfaction: { patient: number; employee: number };
  indicators: { total: number };
  suggestions: string[];
}

export default function HospitalKPIReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/hospital-kpi/report');
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
        <Title level={3} style={{ color: VI.deep }}>公立医院绩效考核（国考）</Title>
        <Paragraph type="secondary">医疗质量 / 运营效率 / 持续发展 / 满意度 / 55 个国考指标</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="三四级手术占比" value={`${(data.quality.level34Surgery * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="CMI" value={data.quality.cmi} /></Card></Col>
              <Col span={6}><Card><Statistic title="低风险死亡率" value={`${(data.quality.lowRiskMortality * 1000).toFixed(2)}‰`} /></Card></Col>
              <Col span={6}><Card><Statistic title="国考指标" value={data.indicators.total} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>四维度</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'q', name: '医疗质量', value: `${(data.quality.level34Surgery * 100).toFixed(0)}%` },
                  { key: 'e', name: '运营效率', value: `${(data.efficiency.time * 100).toFixed(0)}%` },
                  { key: 'd', name: '持续发展', value: `${(data.development.talent * 100).toFixed(0)}%` },
                  { key: 's', name: '满意度', value: `${(data.satisfaction.patient * 100).toFixed(0)}%` },
                ]}
                columns={[
                  { title: '维度', dataIndex: 'name', key: 'name' },
                  { title: '水平', dataIndex: 'value', key: 'value' },
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
