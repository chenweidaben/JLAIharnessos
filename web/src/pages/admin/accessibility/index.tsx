/**
 * 健澜科技 jlmedaios - 无障碍页（M199-B）
 *
 * WCAG/屏幕阅读器/键盘/对比度/字幕/表单/alt/认证。深海蓝 VI。
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
  timeRange: string;
  wcag: { perceivable: boolean; operable: boolean; understandable: boolean; robust: boolean };
  screenReader: { nvda: boolean; jaws: boolean; voiceOver: boolean };
  keyboard: { fullNav: boolean; focusVisible: boolean };
  contrast: { passAA: number; total: number };
  captions: { videoCaptions: number; audioDescriptions: number };
  forms: { labeled: number; errorDescribed: number };
  altText: { covered: number; missing: number };
  certification: { wcag21AA: boolean };
  suggestions: string[];
}

export default function AccessibilityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/accessibility/report');
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
        <Title level={3} style={{ color: VI.deep }}>无障碍访问</Title>
        <Paragraph type="secondary">WCAG 2.1 AA / 屏幕阅读器 / 键盘导航 / 色彩对比度 / 字幕 / 表单 / alt 文本</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="对比度达标率">
                  <Progress type="circle" percent={data.contrast.passAA} size={60} />
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="alt 文本覆盖" value={data.altText.covered} /></Card></Col>
              <Col span={6}><Card><Statistic title="缺失 alt" value={data.altText.missing} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
              <Col span={6}>
                <Card title="WCAG 2.1 AA 认证">
                  <Tag color="green">已认证</Tag>
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>WCAG 四原则</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'p', name: '可感知 (Perceivable)', pass: data.wcag.perceivable },
                  { key: 'o', name: '可操作 (Operable)', pass: data.wcag.operable },
                  { key: 'u', name: '可理解 (Understandable)', pass: data.wcag.understandable },
                  { key: 'r', name: '健壮 (Robust)', pass: data.wcag.robust },
                ]}
                columns={[
                  { title: '原则', dataIndex: 'name', key: 'name' },
                  { title: '达标', dataIndex: 'pass', key: 'pass', render: (p: boolean) => <Tag color={p ? 'green' : 'red'}>{p ? '是' : '否'}</Tag> },
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
