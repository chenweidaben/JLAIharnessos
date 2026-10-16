/**
 * 健澜科技 jlmedaios - 疼痛管理页（M222-D）
 *
 * NRS/VAS评估/术后·创伤·分娩急性疼痛/慢性腰背痛·神经病理性·癌痛三阶梯PCA/神经阻滞介入多模式/无痛病房。深海蓝 VI。
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
  assessment: { nrs: number; vas: number; fps: number };
  acute: { postoperative: number; trauma: number; labor: number };
  chronic: { lowBack: number; neuropathic: number };
  cancer: { threeLadder: number; pca: number };
  clinic: { visits: number };
  multimodal: { nerveBlock: number; intervention: number };
  nursing: { ward: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function PainReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/pain/report');
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
        <Title level={3} style={{ color: VI.deep }}>疼痛管理</Title>
        <Paragraph type="secondary">NRS·VAS 评估 / 术后·创伤·分娩急性疼痛 / 慢性腰背痛·神经病理性·癌痛三阶梯 / 多模式镇痛</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="NRS 评估" value={data.assessment.nrs} /></Card></Col>
              <Col span={6}><Card><Statistic title="术后疼痛" value={data.acute.postoperative} /></Card></Col>
              <Col span={6}><Card><Statistic title="癌痛三阶梯" value={data.cancer.threeLadder} /></Card></Col>
              <Col span={6}><Card><Statistic title="无痛病房" value={data.nursing.ward} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>镇痛方式</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'trauma', name: '创伤疼痛', value: data.acute.trauma },
                  { key: 'labor', name: '分娩镇痛', value: data.acute.labor },
                  { key: 'lbp', name: '慢性腰背痛', value: data.chronic.lowBack },
                  { key: 'nb', name: '神经阻滞', value: data.multimodal.nerveBlock },
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
