/**
 * 健澜科技 jlmedaios - 病历质量 V2 页（M209-C）
 *
 * 运行/终末/内涵/EMR评级/首页/复印/PDCA。深海蓝 VI。
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
  runtime: { onTime: number; defects: number };
  terminal: { gradeA: number; gradeB: number; gradeC: number };
  connotation: { deepQC: number };
  emrRating: { level: number };
  homepage: { complete: number };
  copy: { requested: number };
  pdca: { closedLoop: number };
  suggestions: string[];
}

export default function MRQualityV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/mr-quality/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>病历质量 V2 深化</Title>
        <Paragraph type="secondary">运行病历质控 / 终末甲乙丙级 / EMR 0-8 级评级 / 首页数据校验 / PDCA 闭环</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="运行病历" value={data.runtime.onTime} /></Card></Col>
              <Col span={6}><Card><Statistic title="甲级率" value={`${(data.terminal.gradeA / (data.terminal.gradeA + data.terminal.gradeB + data.terminal.gradeC) * 100).toFixed(1)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="EMR 评级" value={`${data.emrRating.level} 级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="PDCA 闭环" value={data.pdca.closedLoop} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>终末病历分级</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'a', name: '甲级', value: data.terminal.gradeA },
                  { key: 'b', name: '乙级', value: data.terminal.gradeB },
                  { key: 'c', name: '丙级', value: data.terminal.gradeC },
                ]}
                columns={[
                  { title: '等级', dataIndex: 'name', key: 'name' },
                  { title: '份数', dataIndex: 'value', key: 'value' },
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
