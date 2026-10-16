/**
 * 健澜科技 jlmedaios - 远程医疗页（M195-B）
 *
 * 远程会诊/门诊/影像/病理/心电/超声/手术指导/培训。深海蓝 VI。
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
  consultation: { inHospital: number; crossHospital: number; crossProvince: number };
  outpatient: { visits: number };
  imaging: { studies: number; turnaround: number };
  pathology: { studies: number; turnaround: number };
  ecg: { studies: number; turnaround: number };
  ultrasound: { studies: number; turnaround: number };
  surgeryGuidance: { cases: number };
  training: { sessions: number; participants: number };
  quality: { averageAccuracy: number; averageTurnaround: number };
  suggestions: string[];
}

export default function TelemedicinePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/telemedicine/report');
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
        <Title level={3} style={{ color: VI.deep }}>远程医疗深化</Title>
        <Paragraph type="secondary">远程会诊 / 影像 / 病理 / 心电 / 超声 / 手术指导 / 培训</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="院内会诊" value={data.consultation.inHospital} /></Card></Col>
              <Col span={6}><Card><Statistic title="跨院会诊" value={data.consultation.crossHospital} /></Card></Col>
              <Col span={6}><Card><Statistic title="跨省会诊" value={data.consultation.crossProvince} /></Card></Col>
              <Col span={6}><Card><Statistic title="报告准确率" value={`${(data.quality.averageAccuracy * 100).toFixed(1)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>远程模态统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'img', name: '远程影像', count: data.imaging.studies, ta: `${data.imaging.turnaround}h` },
                  { key: 'path', name: '远程病理', count: data.pathology.studies, ta: `${data.pathology.turnaround}h` },
                  { key: 'ecg', name: '远程心电', count: data.ecg.studies, ta: `${data.ecg.turnaround}h` },
                  { key: 'us', name: '远程超声', count: data.ultrasound.studies, ta: `${data.ultrasound.turnaround}h` },
                ]}
                columns={[
                  { title: '模态', dataIndex: 'name', key: 'name' },
                  { title: '例数', dataIndex: 'count', key: 'count' },
                  { title: ' turnaround', dataIndex: 'ta', key: 'ta' },
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
