/**
 * 健澜科技 jlmedaios - 急救体系 V2 页（M222-C）
 *
 * 120院前/I-IV级分诊/心跳骤停·休克·MODS/卒中胸痛创伤绿色通道/灾害救援/CPR-BLS-ACLS培训。深海蓝 VI。
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
  prehospital: { calls: number; avgResponse: number };
  triage: { level1: number; level2: number; level3: number; level4: number };
  critical: { cardiacArrest: number; shock: number; mods: number };
  greenChannel: { stroke: number; chestPain: number; trauma: number };
  surgery: { urgent: number };
  observation: { patients: number };
  disaster: { drills: number };
  training: { cpr: number; bls: number; acls: number };
  suggestions: string[];
}

export default function EmergencyV2Page() {
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
        <Title level={3} style={{ color: VI.deep }}>急救体系 V2</Title>
        <Paragraph type="secondary">120 院前 / I-IV 级分诊 / 心跳骤停·休克·MODS / 卒中·胸痛·创伤绿色通道 / CPR·BLS·ACLS 培训</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="120 呼救" value={data.prehospital.calls} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均反应" value={`${data.prehospital.avgResponse} 分钟`} /></Card></Col>
              <Col span={6}><Card><Statistic title="心跳骤停" value={data.critical.cardiacArrest} /></Card></Col>
              <Col span={6}><Card><Statistic title="绿色通道" value={data.greenChannel.stroke + data.greenChannel.chestPain} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>分诊与危重症</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'l1', name: '一级（红）', value: data.triage.level1 },
                  { key: 'l2', name: '二级（黄）', value: data.triage.level2 },
                  { key: 'l3', name: '三级（绿）', value: data.triage.level3 },
                  { key: 'l4', name: '四级（蓝）', value: data.triage.level4 },
                ]}
                columns={[
                  { title: '分诊', dataIndex: 'name', key: 'name' },
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
