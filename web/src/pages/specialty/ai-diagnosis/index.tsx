/**
 * 健澜科技 jlmedaios - AI 影像病理页（M203-D）
 *
 * 肺结节/骨折/脑出血/眼底/乳腺AI/癌细胞检测/TNM/AUC/审计/迭代。深海蓝 VI。
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
  imaging: { lungNodule: number; fracture: number; ich: number; fundus: number; breast: number };
  pathology: { cancerDetection: number; lymphNode: number; tnmsStaging: number; molecular: number };
  reporting: { autoStructured: number; autoDescription: number };
  performance: { sensitivity: number; specificity: number; auc: number; timeSavedMin: number };
  audit: { reviewed: number; falsePositive: number; falseNegative: number };
  iteration: { retrainedModels: number; updatedVersions: number };
  suggestions: string[];
}

export default function AIDiagnosisPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/specialty/ai-diagnosis/report');
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
        <Title level={3} style={{ color: VI.deep }}>AI 影像诊断与 AI 病理诊断</Title>
        <Paragraph type="secondary">肺结节/骨折/脑出血/眼底/乳腺 AI · 癌细胞检测/TNM 分期 · AUC·敏感度 · 误例库·再训练</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="肺结节 AI" value={data.imaging.lungNodule} /></Card></Col>
              <Col span={6}><Card><Statistic title="癌细胞检测" value={data.pathology.cancerDetection} /></Card></Col>
              <Col span={6}><Card><Statistic title="AUC" value={data.performance.auc} /></Card></Col>
              <Col span={6}><Card><Statistic title="敏感度" value={`${(data.performance.sensitivity * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>AI 性能与审计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'sn', name: '敏感度', value: `${(data.performance.sensitivity * 100).toFixed(1)}%` },
                  { key: 'sp', name: '特异度', value: `${(data.performance.specificity * 100).toFixed(1)}%` },
                  { key: 'fp', name: '假阳性', value: data.audit.falsePositive },
                  { key: 'fn', name: '假阴性', value: data.audit.falseNegative },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '值', dataIndex: 'value', key: 'value' },
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
