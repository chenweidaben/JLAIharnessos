/**
 * 健澜科技 jlmedaios - 国际化页（M199-D）
 *
 * 多语言/i18n组件/本地化/术语/涉外/跨境/内容/质量。深海蓝 VI。
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
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  languages: { zh: boolean; en: boolean; ja: boolean; ko: boolean; ar: boolean; total: number };
  i18n: { components: number };
  localization: { date: boolean; time: boolean; currency: boolean; number: boolean };
  terminology: { translated: number; pending: number };
  foreignClinic: { visits: number; doctors: number };
  crossBorder: { partnerships: number };
  content: { pages: number };
  quality: { accuracy: number };
  suggestions: string[];
}

export default function InternationalizationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/internationalization/report');
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
        <Title level={3} style={{ color: VI.deep }}>国际化与多语言</Title>
        <Paragraph type="secondary">多语言包 / i18n 组件 / 本地化适配 / 医疗术语 / 涉外医疗 / 跨境医疗</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="支持语言数" value={data.languages.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="已翻译术语" value={data.terminology.translated} /></Card></Col>
              <Col span={6}><Card><Statistic title="涉外就诊" value={data.foreignClinic.visits} /></Card></Col>
              <Col span={6}><Card><Statistic title="翻译准确率" value={`${(data.quality.accuracy * 100).toFixed(1)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>语言覆盖</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'zh', name: '中文', on: data.languages.zh },
                  { key: 'en', name: '英文', on: data.languages.en },
                  { key: 'ja', name: '日文', on: data.languages.ja },
                  { key: 'ko', name: '韩文', on: data.languages.ko },
                  { key: 'ar', name: '阿拉伯文', on: data.languages.ar },
                ]}
                columns={[
                  { title: '语言', dataIndex: 'name', key: 'name' },
                  { title: '已支持', dataIndex: 'on', key: 'on', render: (on: boolean) => <Tag color={on ? 'green' : 'red'}>{on ? '是' : '否'}</Tag> },
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
