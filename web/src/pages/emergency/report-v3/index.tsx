/**
 * 健澜科技 jlmedaios - 急诊 V3 页（M204-A）
 *
 * I-IV级分诊/抢救/留观/绿色通道/急诊质量。深海蓝 VI。
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
  triage: { total: number; levelI: number; levelII: number; avgWaitMin: number; accuracy: number };
  resuscitation: { successRate: number; goldenHour: number };
  observation: { beds: number; avgStayHours: number; admissionRate: number };
  greenChannel: { chestPain: number; stroke: number; trauma: number; maternal: number };
  quality: { unplannedReturn: number; patientSatisfaction: number };
  suggestions: string[];
}

export default function EmergencyV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/emergency/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>急诊科 V2 深化</Title>
        <Paragraph type="secondary">I-IV 级分诊 / 抢救成功率 / 胸痛·卒中·创伤绿色通道 / 留观转归</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="急诊总量" value={data.triage.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="I 级濒危" value={data.triage.levelI} /></Card></Col>
              <Col span={6}><Card><Statistic title="抢救成功率" value={`${(data.resuscitation.successRate * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="患者满意度" value={`${(data.quality.patientSatisfaction * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>绿色通道</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'chest', name: "胸痛中心", value: data.greenChannel.chestPain },
                  { key: 'stroke', name: '卒中中心', value: data.greenChannel.stroke },
                  { key: 'trauma', name: '创伤中心', value: data.greenChannel.trauma },
                  { key: 'mat', name: '孕产妇急救', value: data.greenChannel.maternal },
                ]}
                columns={[
                  { title: '中心', dataIndex: 'name', key: 'name' },
                  { title: '例数', dataIndex: 'value', key: 'value' },
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
