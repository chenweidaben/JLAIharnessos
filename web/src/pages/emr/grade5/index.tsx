/**
 * 健澜科技 jlmedaios - EMR 五级评审 V2 页（M187-C）
 *
 * 8 维度雷达图 + 评分 + 整改建议 + 三级医院对标。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  dept: string;
  timeRange: string;
  scores: Record<string, number>;
  totalScore: number;
  benchmark: { tertiary: number; secondary: number; primary: number };
  suggestions: string[];
}

const DIM_NAMES: Record<string, string> = {
  medical_quality: '医疗质量',
  nursing: '护理管理',
  medtech: '医技管理',
  patient_service: '患者服务',
  operation: '运营管理',
  data_quality: '数据质量',
  security: '信息安全',
  interconnect: '互联互通',
};

export default function EMRGrade5V2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/emr/grade5/assessment-v2');
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
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>EMR 五级评审 · 8 维度评估</Title>
        <Paragraph type="secondary">医疗质量 / 护理 / 医技 / 患者服务 / 运营 / 数据 / 安全 / 互联互通</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="总分" value={data.totalScore} suffix="/100" /></Card></Col>
              <Col span={6}><Card><Statistic title="三级医院对标" value={data.benchmark.tertiary} suffix="分" /></Card></Col>
              <Col span={6}><Card><Statistic title="二级医院对标" value={data.benchmark.secondary} suffix="分" /></Card></Col>
              <Col span={6}><Card><Statistic title="一级医院对标" value={data.benchmark.primary} suffix="分" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>8 维度得分</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={Object.entries(data.scores).map(([k, v]) => ({ key: k, name: DIM_NAMES[k] ?? k, score: v }))}
                columns={[
                  { title: '维度', dataIndex: 'name', key: 'name' },
                  {
                    title: '得分',
                    dataIndex: 'score',
                    key: 'score',
                    render: (s: number) => (
                      <Progress
                        percent={s}
                        size="small"
                        status={s >= 90 ? 'success' : s >= 80 ? 'normal' : 'exception'}
                      />
                    ),
                  },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>整改建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => (
                  <List.Item>
                    <Tag color="orange">整改</Tag>
                    <Text style={{ marginLeft: 8 }}>{s}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
