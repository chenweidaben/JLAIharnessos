/**
 * 健澜科技 jlmedaios - 老年健康 V2 页（M221-C）
 *
 * CGA老年综合评估/老年综合征/共病多重用药/ADL·IADL康复/MMSE·MoCA认知/医养结合。深海蓝 VI。
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
  cga: { assessed: number };
  syndrome: { fall: number; pressureUlcer: number; dementia: number; delirium: number; frailty: number };
  chronic: { comorbidity: number };
  medication: { polypharmacy: number };
  rehab: { adl: number; iadl: number };
  cognition: { mmse: number; moca: number };
  psych: { depression: number };
  management: { care: number };
  suggestions: string[];
}

export default function GeriatricsV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/geriatrics/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>老年健康 V2</Title>
        <Paragraph type="secondary">CGA 综合评估 / 老年综合征 / 共病·多重用药 / ADL·IADL 康复 / 认知评估</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="CGA 评估" value={data.cga.assessed} /></Card></Col>
              <Col span={6}><Card><Statistic title="衰弱" value={data.syndrome.frailty} /></Card></Col>
              <Col span={6}><Card><Statistic title="多重用药" value={data.medication.polypharmacy} /></Card></Col>
              <Col span={6}><Card><Statistic title="MMSE" value={data.cognition.mmse} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>老年综合征</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'fall', name: '跌倒', value: data.syndrome.fall },
                  { key: 'pu', name: '压疮', value: data.syndrome.pressureUlcer },
                  { key: 'dem', name: '痴呆', value: data.syndrome.dementia },
                  { key: 'del', name: '谵妄', value: data.syndrome.delirium },
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
