/** 健澜科技 jlmedaios - 薪资统计（M244 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; dept: string; totalPayable: number; totalPaid: number; tax: number; socialInsurance: number; housingFund: number; avgSalary: number }
export default function HrSalaryPage() {
  usePageTitle('薪资统计');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/hr/salary').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.salary ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '应发(万)', dataIndex: 'totalPayable' },
    { title: '实发(万)', dataIndex: 'totalPaid', render: (v: number) => <Tag color="green">{v}</Tag> },
    { title: '个税(万)', dataIndex: 'tax' },
    { title: '社保(万)', dataIndex: 'socialInsurance' },
    { title: '公积金(万)', dataIndex: 'housingFund' },
    { title: '人均(万)', dataIndex: 'avgSalary' },
  ];
  return (
    <PageContainer title="薪资统计（万元）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
