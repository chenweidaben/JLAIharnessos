/**
 * 健澜科技 jlmedaios - DRG/DIP V2 页（M230-C）
 *
 * MDC/ADRG/DRG细分组/DIP核心综合病种/分值点值/病种成本/盈亏分析/CMI/时间费用消耗指数/病案编码/临床路径。深海蓝 VI。
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
  drg: { mdcs: number; adrgs: number; groups: number };
  dip: { coreDiseases: number; points: number };
  cost: { diseaseCost: number };
  profit: { ratio: number };
  cmi: { value: number };
  structure: { topDiseases: number };
  coding: { accuracy: number };
  pathway: { coverage: number };
  suggestions: string[];
}

export default function DRGDIPV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/drg-dip/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>DRG/DIP V2</Title>
        <Paragraph type="secondary">MDC·ADRG·DRG 细分组 / DIP 核心综合病种·分值点值 / 病种成本·盈亏分析 / CMI·编码·临床路径</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="DRG 组数" value={data.drg.groups} /></Card></Col>
              <Col span={6}><Card><Statistic title="DIP 分值" value={data.dip.points} /></Card></Col>
              <Col span={6}><Card><Statistic title="CMI" value={data.cmi.value} /></Card></Col>
              <Col span={6}><Card><Statistic title="编码准确率" value={`${data.coding.accuracy}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>DRG/DIP 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'mdc', name: 'MDC 大类', value: data.drg.mdcs },
                  { key: 'adrg', name: 'ADRG 操作组', value: data.drg.adrgs },
                  { key: 'cost', name: '病种均次成本', value: data.cost.diseaseCost },
                  { key: 'pathway', name: '临床路径覆盖率', value: `${data.pathway.coverage}%` },
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
