/**
 * 健澜科技 jlmedaios - 患者安全 V2 页（M209-A）
 *
 * I-IV级事件/near miss/RCA/PDA腕带/高警示药品/Time Out/Just Culture。深海蓝 VI。
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
  events: { levelI: number; levelII: number; levelIII: number; levelIV: number; nearMiss: number };
  rca: { completed: number };
  identity: { pdaScanRate: number };
  medication: { highAlert: number; lookAlikeSoundAlike: number };
  surgery: { timeOutCompliance: number };
  infection: { healthcareAssociated: number };
  culture: { justCulture: boolean; safetyMonth: number };
  suggestions: string[];
}

export default function PatientSafetyV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/patient-safety/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>患者安全 V2 深化</Title>
        <Paragraph type="secondary">I-IV 级不良事件 / RCA 根因分析 / PDA 腕带身份识别 / 高警示药品 / Time Out / Just Culture</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="I 级事件" value={data.events.levelI} /></Card></Col>
              <Col span={6}><Card><Statistic title="Near Miss" value={data.events.nearMiss} /></Card></Col>
              <Col span={6}><Card><Statistic title="RCA 完成" value={data.rca.completed} /></Card></Col>
              <Col span={6}><Card><Statistic title="PDA 扫描率" value={`${(data.identity.pdaScanRate * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>事件分级</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: '1', name: 'I 级（警告）', value: data.events.levelI },
                  { key: '2', name: 'II 级（不良后果）', value: data.events.levelII },
                  { key: '3', name: 'III 级（未造成后果）', value: data.events.levelIII },
                  { key: '4', name: 'IV 级（隐患）', value: data.events.levelIV },
                ]}
                columns={[
                  { title: '级别', dataIndex: 'name', key: 'name' },
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
