/**
 * 健澜科技 jlmedaios - 中医页（M202-C）
 *
 * 辨证/诊断/中药/针灸推拿/中西医结合/治未病/康复/质量。深海蓝 VI。
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
  diagnosis: { consultations: number; tongueDiagnosis: number; pulseDiagnosis: number; constitutionAssess: number };
  treatment: { herbalDecoction: number; acupuncture: number; tuina: number; cupping: number };
  integrated: { combinedTreatments: number };
  preventive: { healthPreservation: number };
  quality: { herbStandardRate: number };
  suggestions: string[];
}

export default function TCMPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/specialty/tcm/report');
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
        <Title level={3} style={{ color: VI.deep }}>中医中药与中西医结合</Title>
        <Paragraph type="secondary">辨证论治 / 望闻问切 / 中药饮片 / 针灸推拿 / 中西医结合 / 治未病</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="中医门诊" value={data.diagnosis.consultations} /></Card></Col>
              <Col span={6}><Card><Statistic title="中药汤剂" value={data.treatment.herbalDecoction} /></Card></Col>
              <Col span={6}><Card><Statistic title="针灸治疗" value={data.treatment.acupuncture} /></Card></Col>
              <Col span={6}><Card><Statistic title="中药规范率" value={`${(data.quality.herbStandardRate * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>中医治疗分布</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'herb', name: '中药汤剂', value: data.treatment.herbalDecoction },
                  { key: 'acu', name: '针灸', value: data.treatment.acupuncture },
                  { key: 'tui', name: '推拿', value: data.treatment.tuina },
                  { key: 'cup', name: '拔罐', value: data.treatment.cupping },
                ]}
                columns={[
                  { title: '治疗方式', dataIndex: 'name', key: 'name' },
                  { title: '人次', dataIndex: 'value', key: 'value' },
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
