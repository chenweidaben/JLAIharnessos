/**
 * 健澜科技 jlmedaios - 检验检查 V3 页（M204-D）
 *
 * 检验前中后/影像/质控/特检/危急值/区域互认。深海蓝 VI。
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
  preAnalytic: { orders: number; collectionErrors: number };
  analytic: { tests: number; qcPassRate: number; eqaPassRate: number };
  postAnalytic: { reports: number; recalls: number; turnaroundMin: number };
  imaging: { ct: number; mr: number; dr: number; ultrasound: number; endoscopy: number };
  imagingQuality: { gradeARate: number; rejectRate: number };
  special: { pathology: number; ecg: number; pulmonary: number };
  criticalValue: { total: number; notified: number; closedLoopRate: number };
  mutualRecognition: { recognized: number };
  suggestions: string[];
}

export default function LabImagingV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/lab-imaging/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>检验检查 V2 深化</Title>
        <Paragraph type="secondary">检验前中后全流程 / 影像 CT·MR·DR·超声 / 甲级片率 / 危急值闭环 / 区域检查互认</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="检验项目" value={data.analytic.tests} /></Card></Col>
              <Col span={6}><Card><Statistic title="影像检查" value={data.imaging.ct + data.imaging.mr + data.imaging.dr} /></Card></Col>
              <Col span={6}><Card><Statistic title="危急值" value={data.criticalValue.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="区域互认" value={data.mutualRecognition.recognized} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>影像检查统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ct', name: 'CT', value: data.imaging.ct },
                  { key: 'mr', name: 'MR', value: data.imaging.mr },
                  { key: 'dr', name: 'DR', value: data.imaging.dr },
                  { key: 'us', name: '超声', value: data.imaging.ultrasound },
                  { key: 'endo', name: '内镜', value: data.imaging.endoscopy },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
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
