/** 健澜科技 jlmedaios - 区域检验协同（M246 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; item: string; result: string; reportTime: string; mutualRecognition: string }
export default function RegionalLabPage() {
  usePageTitle('区域检验协同');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/regional/lab').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.labTests ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '项目', dataIndex: 'item', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v === '正常' ? 'green' : 'red'}>{v}</Tag> },
    { title: '报告时间', dataIndex: 'reportTime' },
    { title: '互认状态', dataIndex: 'mutualRecognition', render: (v: string) => <Tag color={v === '已互认' ? 'green' : 'default'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="区域检验协同（结果互认）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
