/**
 * 健澜科技 jlmedaios - 急诊管理 V2 页（M225-C）
 *
 * I-IV级分诊·红黄绿四区/抢救室成功率·留观转归/胸痛卒中创伤绿色通道/急诊输液·滞留时间。深海蓝 VI。
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
  triage: { total: number; level1: number; level2: number };
  resuscitation: { cases: number; success: number };
  observation: { cases: number; admitted: number };
  ward: { transferred: number };
  greenChannel: { chest: number; stroke: number; trauma: number };
  infusion: { cases: number };
  complaint: { count: number };
  management: { boardingTime: number };
  suggestions: string[];
}

export default function EmergencyMgmtV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/emergency/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>急诊管理 V2</Title>
        <Paragraph type="secondary">I-IV 级分诊·红黄绿四区 / 抢救室·留观转归 / 胸痛卒中创伤绿色通道 / 急诊输液·滞留时间</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="急诊总量" value={data.triage.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="I级危重" value={data.triage.level1} /></Card></Col>
              <Col span={6}><Card><Statistic title="抢救成功" value={`${Math.round((data.resuscitation.success / data.resuscitation.cases) * 100)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="滞留时间(小时)" value={data.management.boardingTime} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>绿色通道</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'chest', name: "胸痛中心", value: data.greenChannel.chest },
                  { key: 'stroke', name: "卒中中心", value: data.greenChannel.stroke },
                  { key: 'trauma', name: "创伤中心", value: data.greenChannel.trauma },
                  { key: 'obs', name: "留观病例", value: data.observation.cases },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
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
