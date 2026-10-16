/**
 * 健澜科技 jlmedaios - 传染病防控 V2 页（M221-A）
 *
 * 甲乙丙类报告/发热门诊三区两通道/暴发识别/疫苗冷链/结核DOTs/HIV母婴阻断。深海蓝 VI。
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
  reporting: { total: number; timely: number };
  feverClinic: { visits: number; zones: number };
  outbreak: { detected: number };
  vaccine: { coldChain: boolean; doses: number };
  tb: { dots: number };
  hiv: { prevention: number };
  emerging: { monitoring: number };
  management: { drills: number };
  suggestions: string[];
}

export default function InfectiousDiseaseV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/infectious-disease/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>传染病防控 V2</Title>
        <Paragraph type="secondary">甲乙丙类报告 / 发热门诊·三区两通道 / 暴发识别 / 疫苗冷链 / 结核·HIV 管理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="传染病报告" value={data.reporting.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="发热门诊" value={data.feverClinic.visits} /></Card></Col>
              <Col span={6}><Card><Statistic title="暴发预警" value={data.outbreak.detected} /></Card></Col>
              <Col span={6}><Card><Statistic title="疫苗剂次" value={data.vaccine.doses} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>防控能力</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'cold', name: '疫苗冷链', value: data.vaccine.coldChain ? '正常' : '异常' },
                  { key: 'tb', name: '结核 DOTs', value: data.tb.dots },
                  { key: 'hiv', name: 'HIV 母婴阻断', value: data.hiv.prevention },
                  { key: 'drill', name: '应急演练', value: data.management.drills },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '状态', dataIndex: 'value', key: 'value' },
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
