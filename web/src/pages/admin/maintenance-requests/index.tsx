/**
 * 健澜科技 jlmedaios - 后勤报修管理（M752）
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
import { useMaintenanceRequestM752Store } from '@/store/maintenanceRequestM752Store';
import {
  MAINT_STATUS_META,
  type MaintenanceRequest,
} from '@/services/api/maintenanceRequestM752';

const logColumns: ColumnsType<{ time: string; note: string; by: string }> = [
  { title: '时间', dataIndex: 'time', width: 160 },
  { title: '维修记录', dataIndex: 'note' },
  { title: '操作人', dataIndex: 'by', width: 130 },
];

const buildColumns = (setDetail: (r: MaintenanceRequest) => void): ColumnsType<MaintenanceRequest> => [
  { title: '报修单号', dataIndex: 'requestNo', width: 130 },
  { title: '报修人', dataIndex: 'reporter', width: 180, ellipsis: true },
  { title: '报修位置', dataIndex: 'location', width: 220, ellipsis: true },
  { title: '报修内容', dataIndex: 'content', ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: MaintenanceRequest['status']) => <Tag color={MAINT_STATUS_META[v].color}>{MAINT_STATUS_META[v].label}</Tag>,
  },
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

export default function MaintenanceRequestsM752Page() {
  usePageTitle('后勤报修管理');
  const { items, loading, error, demo, load } = useMaintenanceRequestM752Store();
  const [detail, setDetail] = useState<MaintenanceRequest | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="后勤报修管理"
      description="报修单号 / 报修人 / 报修位置 / 报修内容 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`报修列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="报修详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="报修单号">{detail.requestNo}</Descriptions.Item>
              <Descriptions.Item label="报修人">{detail.reporter}</Descriptions.Item>
              <Descriptions.Item label="报修位置" span={2}>{detail.location}</Descriptions.Item>
              <Descriptions.Item label="报修内容" span={2}>{detail.content}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={MAINT_STATUS_META[detail.status].color}>{MAINT_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="验收结果" span={2}>{detail.acceptance}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="维修记录">
              <Table rowKey="time" dataSource={detail.repairLogs} columns={logColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
