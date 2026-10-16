/**
 * 健澜科技 jlmedaios - 高质量发展 V2 页（M230-A）
 *
 * 国考55指标/三级公立医院绩效考核/现代医院管理制度/三年规划/三医联动/薪酬编制改革。深海蓝 VI。
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
  nationalExam: { quality: number; efficiency: number; development: number; satisfaction: number };
  tertiaryPerformance: { score: number };
  indicators: { completed: number; total: number };
  governance: { charter: boolean; council: boolean };
  plan: { threeYear: boolean };
  reform: { threeMedical: boolean; salary: boolean };
  performance: { evaluation: number };
  monitoring: { dashboards: number };
  suggestions: string[];
}

export default function HighQualityDevelopmentV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/high-quality-development/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>高质量发展 V2</Title>
        <Paragraph type="secondary">国考 55 指标 / 三级公立医院绩效考核 / 现代医院管理制度·章程·理事会 / 三年规划·三医联动·薪酬编制改革</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="医疗质量" value={data.nationalExam.quality} /></Card></Col>
              <Col span={6}><Card><Statistic title="运行效率" value={data.nationalExam.efficiency} /></Card></Col>
              <Col span={6}><Card><Statistic title="持续发展" value={data.nationalExam.development} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={data.nationalExam.satisfaction} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>发展指标明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'tertiary', name: '三级绩效得分', value: data.tertiaryPerformance.score },
                  { key: 'indicators', name: '指标完成', value: `${data.indicators.completed}/${data.indicators.total}` },
                  { key: 'perf', name: '绩效评价', value: data.performance.evaluation },
                  { key: 'dash', name: '监测大屏', value: data.monitoring.dashboards },
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
