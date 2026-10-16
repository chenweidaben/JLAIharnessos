/**
 * 健澜科技 jlmedaios - 区域协同分级诊疗页 V2（M186-C）
 *
 * 医联体资源总览 + 双向转诊 + 知识共享。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Layout,
  List,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Institution {
  name: string;
  level: string;
  beds: number;
  doctors: number;
  equipment: string[];
}

interface Referral {
  direction: string;
  from: string;
  to: string;
  reason: string;
}

interface Result {
  region: string;
  date: string;
  institutions: Institution[];
  referrals: Referral[];
  sharedCases: Array<{ caseId: string; hospital: string; diagnosis: string; resolution: string }>;
}

function levelColor(l: string): string {
  if (l === 'tertiary') return 'red';
  if (l === 'secondary') return 'orange';
  return 'blue';
}

export default function RegionalCollaborationV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/regional/collaboration');
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
        <Title level={3} style={{ color: VI.deep }}>区域协同 · 分级诊疗</Title>
        <Paragraph type="secondary">医联体资源总览 · 双向转诊 · 跨院知识共享</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Card title={<Text strong style={{ color: VI.deep }}>医联体机构资源</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="name"
                size="small"
                pagination={false}
                dataSource={data.institutions}
                columns={[
                  { title: '机构', dataIndex: 'name', key: 'name' },
                  {
                    title: '层级',
                    dataIndex: 'level',
                    key: 'level',
                    render: (l: string) => <Tag color={levelColor(l)}>{l}</Tag>,
                  },
                  { title: '床位', dataIndex: 'beds', key: 'beds' },
                  { title: '医生', dataIndex: 'doctors', key: 'doctors' },
                  {
                    title: '设备',
                    dataIndex: 'equipment',
                    key: 'equipment',
                    render: (e: string[]) => e.join('、'),
                  },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>双向转诊建议</Text>} style={{ marginBottom: 16 }}>
              <List
                size="small"
                dataSource={data.referrals}
                renderItem={(r) => (
                  <List.Item>
                    <Tag color={r.direction === 'up' ? 'red' : 'green'}>{r.direction === 'up' ? '上转' : '下转'}</Tag>
                    <Text style={{ marginLeft: 8 }}>{r.from} → {r.to}：{r.reason}</Text>
                  </List.Item>
                )}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>跨院共享病例</Text>}>
              <List
                size="small"
                dataSource={data.sharedCases}
                renderItem={(c) => (
                  <List.Item>
                    <Text strong>{c.hospital}：{c.diagnosis}</Text>
                    <Text type="secondary">{c.resolution}</Text>
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
