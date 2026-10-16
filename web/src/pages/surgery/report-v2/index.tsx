/**
 * 健澜科技 jlmedaios - 手术中心 V2 页（M224-A）
 *
 * 手术排程/术前访视/Time Out·SSI/PACU术后镇痛/一二三四级手术/日间手术。深海蓝 VI。
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
  scheduling: { cases: number; rooms: number };
  preop: { visits: number; assessment: number };
  intraop: { timeout: number; ssi: number };
  postop: { pacu: number; analgesia: number };
  grading: { level1: number; level2: number; level3: number; level4: number };
  safety: { checklist: number };
  daySurgery: { cases: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function SurgeryV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/surgery/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>手术中心 V2</Title>
        <Paragraph type="secondary">手术排程 / 术前访视 / Time Out·SSI 预防 / PACU·术后镇痛 / 一二三四级手术 / 日间手术</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="手术台次" value={data.scheduling.cases} /></Card></Col>
              <Col span={6}><Card><Statistic title="手术间" value={data.scheduling.rooms} /></Card></Col>
              <Col span={6}><Card><Statistic title="Time Out" value={data.intraop.timeout} /></Card></Col>
              <Col span={6}><Card><Statistic title="日间手术" value={data.daySurgery.cases} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>手术分级</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'l1', name: '一级手术', value: data.grading.level1 },
                  { key: 'l2', name: '二级手术', value: data.grading.level2 },
                  { key: 'l3', name: '三级手术', value: data.grading.level3 },
                  { key: 'l4', name: '四级手术', value: data.grading.level4 },
                ]}
                columns={[
                  { title: '分级', dataIndex: 'name', key: 'name' },
                  { title: '台次', dataIndex: 'value', key: 'value' },
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
