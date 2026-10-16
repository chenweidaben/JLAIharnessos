/**
 * 健澜科技 jlmedaios - 学科评估 V3 页（M230-D）
 *
 * 复旦专科声誉/科研学术/STEM/科技量值排名/国家临床重点专科/标杆对比/短板提升计划。深海蓝 VI。
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
  fudan: { reputation: number };
  stem: { ranking: number };
  techValue: { score: number };
  national: { keySpecialties: number };
  indicators: { total: number };
  projects: { construction: number };
  benchmark: { partners: number };
  improvement: { plans: number };
  suggestions: string[];
}

export default function DisciplineAssessmentV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/discipline-assessment/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>学科评估 V3</Title>
        <Paragraph type="secondary">复旦专科声誉·科研学术 / STEM·科技量值排名 / 国家临床重点专科 / 标杆对比·短板提升计划</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="复旦声誉学科" value={data.fudan.reputation} /></Card></Col>
              <Col span={6}><Card><Statistic title="STEM 排名" value={data.stem.ranking} /></Card></Col>
              <Col span={6}><Card><Statistic title="国家重点专科" value={data.national.keySpecialties} /></Card></Col>
              <Col span={6}><Card><Statistic title="建设项目" value={data.projects.construction} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>学科评估明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'tech', name: '科技量值得分', value: data.techValue.score },
                  { key: 'indicators', name: '评估指标', value: data.indicators.total },
                  { key: 'benchmark', name: '标杆对比单位', value: data.benchmark.partners },
                  { key: 'plan', name: '提升计划', value: data.improvement.plans },
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
