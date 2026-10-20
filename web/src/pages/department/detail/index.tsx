/** 健澜科技 jlmedaios - 科室详情（M301 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { id: string; name: string; director: string; beds: number; description: string }
export default function DepartmentDetailPage() {
  usePageTitle('科室详情');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/department/detail').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="科室详情">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card title={data.name}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
              <Descriptions.Item label="主任"><Tag color="gold">{data.director}</Tag></Descriptions.Item>
              <Descriptions.Item label="床位数">{data.beds}</Descriptions.Item>
              <Descriptions.Item label="简介" span={2}>{data.description}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无科室" /></Card>}
      </Spin>
    </PageContainer>
  );
}