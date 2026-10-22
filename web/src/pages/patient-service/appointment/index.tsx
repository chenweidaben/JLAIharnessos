/**
 * 健澜科技 jlmedaios - 预约挂号管理（M899）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useAppointmentWorkloadM899Store } from '@/store/appointmentWorkloadM899Store';
import type { AppointmentWorkload } from '@/services/api/appointmentWorkloadM899';

const channelColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '预约渠道', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: AppointmentWorkload) => void): ColumnsType<AppointmentWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '预约总数', dataIndex: 'total', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '专家号数', dataIndex: 'expert', width: 110, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '普通号数', dataIndex: 'general', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '当日号数', dataIndex: 'sameDay', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  {
    title: '爽约数',
    dataIndex: 'noShow',
    width: 100,
    align: 'right',
    render: (v: number, r) => <Tag color={v / r.total > 0.05 ? 'red' : 'orange'}>{v}</Tag>,
  },
  { title: '状态', dataIndex: 'status', width: 110 },
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

export default function AppointmentManagementM899Page() {
  usePageTitle('预约挂号管理');
  const { items, loading, error, demo, load } = useAppointmentWorkloadM899Store();
  const [detail, setDetail] = useState<AppointmentWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="预约挂号管理"
      description="日期 / 预约总数 / 专家号 / 普通号 / 当日号 / 爽约 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`预约挂号工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="预约挂号工作详情"
        width={880}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="预约总数">{detail.total}</Descriptions.Item>
              <Descriptions.Item label="专家号数">{detail.expert}</Descriptions.Item>
              <Descriptions.Item label="普通号数">{detail.general}</Descriptions.Item>
              <Descriptions.Item label="当日号数">{detail.sameDay}</Descriptions.Item>
              <Descriptions.Item label="爽约数">{detail.noShow}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="号源管理" span={2}>{detail.slotManagement}</Descriptions.Item>
              <Descriptions.Item label="爽约分析" span={2}>{detail.noShowAnalysis}</Descriptions.Item>
              <Descriptions.Item label="退号记录" span={2}>{detail.refundRecords}</Descriptions.Item>
              <Descriptions.Item label="专家出诊安排" span={2}>{detail.expertSchedule}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="预约渠道（微信/APP/网站/电话/窗口）">
              <Table rowKey="name" dataSource={detail.channelBreakdown} columns={channelColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
