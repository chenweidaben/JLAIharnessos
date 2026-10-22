/**
 * 健澜科技 jlmedaios - 体检预约管理（M722）
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
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePhysicalExamM722Store } from '@/store/physicalExamM722Store';
import {
  PHYSICAL_STATUS_META,
  type PhysicalExam,
} from '@/services/api/physicalExamM722';

const buildColumns = (setDetail: (r: PhysicalExam) => void): ColumnsType<PhysicalExam> => [
  { title: '预约号', dataIndex: 'apptNo', width: 140 },
  { title: '体检人', dataIndex: 'examinee', width: 120 },
  { title: '套餐', dataIndex: 'packageName', width: 180, ellipsis: true },
  {
    title: '预约日期',
    dataIndex: 'scheduledAt',
    width: 130,
    render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (v: PhysicalExam['status']) => <Tag color={PHYSICAL_STATUS_META[v].color}>{PHYSICAL_STATUS_META[v].label}</Tag>,
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

export default function PhysicalExamM722Page() {
  usePageTitle('体检预约管理');
  const { items, loading, error, demo, load } = usePhysicalExamM722Store();
  const [detail, setDetail] = useState<PhysicalExam | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="体检预约管理"
      description="预约号 / 体检人 / 套餐 / 预约日期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`体检预约（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="体检预约详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="预约号">{detail.apptNo}</Descriptions.Item>
            <Descriptions.Item label="体检人">{detail.examinee}</Descriptions.Item>
            <Descriptions.Item label="体检套餐">{detail.packageName}</Descriptions.Item>
            <Descriptions.Item label="预约日期">{dayjs(detail.scheduledAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="体检项目清单">
              {detail.items.map((i) => <div key={i}>· {i}</div>)}
            </Descriptions.Item>
            <Descriptions.Item label="注意事项">{detail.notes}</Descriptions.Item>
            <Descriptions.Item label="体检中心信息">{detail.centerInfo}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={PHYSICAL_STATUS_META[detail.status].color}>{PHYSICAL_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
