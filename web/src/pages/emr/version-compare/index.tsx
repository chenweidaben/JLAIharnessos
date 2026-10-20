/** 健澜科技 jlmedaios - 病历版本对比（M273 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { documentId: string; documentName: string; versionA: { id: string; time: string; author: string }; versionB: { id: string; time: string; author: string } }
export default function EmrVersionComparePage() {
  usePageTitle('病历版本对比');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/version-compare').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="病历版本对比">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="文档"><Tag color="purple">{data.documentName}</Tag></Descriptions.Item>
              <Descriptions.Item label="版本 A">{data.versionA.id} / {data.versionA.time} / {data.versionA.author}</Descriptions.Item>
              <Descriptions.Item label="版本 B">{data.versionB.id} / {data.versionB.time} / {data.versionB.author}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无对比" /></Card>}
      </Spin>
    </PageContainer>
  );
}
