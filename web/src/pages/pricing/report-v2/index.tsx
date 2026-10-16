/**
 * 健澜科技 jlmedaios - 物价收费 V2 页（M226-B）
 *
 * 医疗服务价格·集采/药品零差率·耗材SPD比价/收费规范·价格公示自查/均次费用·费用结构分析。深海蓝 VI。
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
  service: { items: number; adjusted: number };
  drug: { zeroMarkup: boolean };
  consumable: { spd: number; compared: number };
  billing: { regulated: number };
  compliance: { disclosed: boolean; selfChecked: number };
  revenue: { total: number };
  analysis: { structure: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function PricingV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/pricing/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>物价收费 V2</Title>
        <Paragraph type="secondary">医疗服务价格·集采 / 药品零差率·耗材 SPD 比价 / 收费规范·价格公示自查 / 均次费用·费用结构</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="服务项目" value={data.service.items} /></Card></Col>
              <Col span={6}><Card><Statistic title="调价项目" value={data.service.adjusted} /></Card></Col>
              <Col span={6}><Card><Statistic title="SPD 耗材" value={data.consumable.spd} /></Card></Col>
              <Col span={6}><Card><Statistic title="总收入(亿元)" value={Math.round(data.revenue.total / 100000000 * 100) / 100} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>物价收费明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'drug', name: '药品零差率', value: data.drug.zeroMarkup ? '已执行' : '未执行' },
                  { key: 'compare', name: '耗材比价', value: data.consumable.compared },
                  { key: 'billing', name: '规范收费', value: data.billing.regulated },
                  { key: 'self', name: '价格自查', value: data.compliance.selfChecked },
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
