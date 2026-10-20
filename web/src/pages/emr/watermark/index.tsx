/** 健澜科技 jlmedaios - 病历水印配置（M265 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { content: string; position: string; opacity: number; applicableRoles: string[] }
export default function EmrWatermarkPage() {
  usePageTitle('病历水印配置');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/watermark').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="病历水印配置">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="水印内容"><Tag color="purple">{data.content}</Tag></Descriptions.Item>
              <Descriptions.Item label="位置">{data.position}</Descriptions.Item>
              <Descriptions.Item label="不透明度">{data.opacity}</Descriptions.Item>
              <Descriptions.Item label="适用角色">{data.applicableRoles.map((r) => <Tag key={r} color="blue" style={{ marginLeft: 4 }}>{r}</Tag>)}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无配置" /></Card>}
      </Spin>
    </PageContainer>
  );
}
