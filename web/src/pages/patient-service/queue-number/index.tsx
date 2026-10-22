/**
 * 健澜科技 jlmedaios - 门诊排队叫号（M719）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useQueueNumberM719Store } from '@/store/queueNumberM719Store';
import type { QueueCounter } from '@/services/api/queueNumberM719';

const waitingColumns: ColumnsType<{ queueNo: string; patientId: string; status: 'waiting' | 'called' }> = [
  { title: '候诊号', dataIndex: 'queueNo', width: 120 },
  { title: '患者', dataIndex: 'patientId', width: 140 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: 'waiting' | 'called') =>
      v === 'called' ? <Tag color="processing">已叫号</Tag> : <Tag color="default">候诊中</Tag>,
  },
];

const historyColumns: ColumnsType<{ time: string; queueNo: string; doctor: string }> = [
  { title: '时间', dataIndex: 'time', width: 100 },
  { title: '叫号', dataIndex: 'queueNo', width: 120 },
  { title: '接诊医生', dataIndex: 'doctor' },
];

const buildColumns = (setDetail: (r: QueueCounter) => void): ColumnsType<QueueCounter> => [
  { title: '科室', dataIndex: 'dept', width: 140 },
  { title: '当前叫号', dataIndex: 'currentCallNo', width: 120, render: (v: string) => <Tag color="processing">{v}</Tag> },
  { title: '等待人数', dataIndex: 'waitingCount', width: 100, align: 'right' },
  { title: '平均等待', dataIndex: 'avgWaitMinutes', width: 120, align: 'right', render: (v: number) => `${v} 分钟` },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function QueueNumberM719Page() {
  usePageTitle('门诊排队叫号');
  const { items, loading, error, demo, load } = useQueueNumberM719Store();
  const [detail, setDetail] = useState<QueueCounter | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="门诊排队叫号"
      description="科室 / 当前叫号 / 等待人数 / 平均等待时间"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`叫号队列（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="叫号队列详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Card size="small" title={`候诊患者（${detail.waitingPatients.length}）`} style={{ marginBottom: 16 }}>
              <Table rowKey="queueNo" dataSource={detail.waitingPatients} columns={waitingColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="叫号记录">
              <Table rowKey={(r) => `${r.time}-${r.queueNo}`} dataSource={detail.callHistory} columns={historyColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
