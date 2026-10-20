/** 健澜科技 jlmedaios - 数据匿名化（M265 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { dataType: string; method: string; quality: string; usability: string }
export default function SecurityAnonymizationPage() {
  usePageTitle('数据匿名化');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/anonymization').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.results ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '数据集', dataIndex: 'dataType', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '方法', dataIndex: 'method' },
    { title: '信息损失率', dataIndex: 'quality' },
    { title: '可用性', dataIndex: 'usability' },
  ];
  return (
    <PageContainer title="数据匿名化（k-匿名/l-多样性）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="dataType" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无结果" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
