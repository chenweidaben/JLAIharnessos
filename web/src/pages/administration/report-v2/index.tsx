/**
 * 健澜科技 jlmedaios - 行政办公 V2 页（M228-C）
 *
 * 公文收发/审核签发/党委会·院长办公会决议督办/印章·档案·法务/信访接待。深海蓝 VI。
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
  document: { received: number; issued: number; reviewed: number };
  meeting: { party: number; president: number; resolutions: number };
  supervision: { items: number; completed: number };
  seal: { used: number };
  archive: { stored: number };
  legal: { contracts: number; cases: number };
  petition: { received: number; resolved: number };
  service: { requests: number };
  suggestions: string[];
}

export default function AdministrationV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/administration/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>行政办公 V2</Title>
        <Paragraph type="secondary">公文收发·审核签发 / 党委会·院长办公会决议督办 / 印章·档案·法务 / 信访接待</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="收文" value={data.document.received} /></Card></Col>
              <Col span={6}><Card><Statistic title="发文" value={data.document.issued} /></Card></Col>
              <Col span={6}><Card><Statistic title="决议事项" value={data.meeting.resolutions} /></Card></Col>
              <Col span={6}><Card><Statistic title="督办完成" value={data.supervision.completed} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>行政工作明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'seal', name: '印章使用', value: data.seal.used },
                  { key: 'archive', name: '档案归档', value: data.archive.stored },
                  { key: 'legal', name: '合同审核', value: data.legal.contracts },
                  { key: 'petition', name: '信访办结', value: data.petition.resolved },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '数值', dataIndex: 'value', key: 'value' },
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
