/**
 * 健澜科技 jlmedaios - 影像中心 V2 页（M223-B）
 *
 * DR/CT/MRI/CTA三维重建/介入放射TACE·消融/超声/PET-CT·SPECT/PACS·AI辅助·结构化报告。深海蓝 VI。
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
  xray: { dr: number };
  ct: { ct: number; cta: number };
  mri: { mri: number };
  intervention: { tace: number; ablation: number };
  ultrasound: { us: number };
  nuclear: { pet: number; spect: number };
  reporting: { pacs: boolean; ai: boolean; structured: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function ImagingV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/imaging/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>影像中心 V2</Title>
        <Paragraph type="secondary">DR·CT·MRI·CTA / 介入放射 TACE·消融 / 超声 / PET-CT·SPECT / PACS·AI 辅助</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="DR 拍片" value={data.xray.dr} /></Card></Col>
              <Col span={6}><Card><Statistic title="CT 检查" value={data.ct.ct} /></Card></Col>
              <Col span={6}><Card><Statistic title="MRI 检查" value={data.mri.mri} /></Card></Col>
              <Col span={6}><Card><Statistic title="超声检查" value={data.ultrasound.us} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>专项能力</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'cta', name: 'CTA 三维重建', value: data.ct.cta },
                  { key: 'tace', name: 'TACE 介入', value: data.intervention.tace },
                  { key: 'pet', name: 'PET-CT', value: data.nuclear.pet },
                  { key: 'ai', name: 'AI 辅助诊断', value: data.reporting.ai ? '已启用' : '未启用' },
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
