/**
 * 健澜科技 jlmedaios - 病案借阅管理（M699）
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
import { useMedicalRecordBorrowM699Store } from '@/store/medicalRecordBorrowM699Store';
import {
  BORROW_STATUS_META,
  type MedicalRecordBorrow,
} from '@/services/api/medicalRecordBorrowM699';

const buildColumns = (setDetail: (r: MedicalRecordBorrow) => void): ColumnsType<MedicalRecordBorrow> => [
  { title: '病历号', dataIndex: 'recordNo', width: 120 },
  { title: '借阅人', dataIndex: 'borrower', width: 110 },
  { title: '借阅科室', dataIndex: 'borrowerDept', width: 120 },
  { title: '借阅日期', dataIndex: 'borrowedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD') },
  { title: '应还日期', dataIndex: 'dueAt', width: 120 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: MedicalRecordBorrow['status']) => <Tag color={BORROW_STATUS_META[v].color}>{BORROW_STATUS_META[v].label}</Tag>,
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

export default function MedicalRecordBorrowM699Page() {
  usePageTitle('病案借阅管理');
  const { items, loading, error, demo, load } = useMedicalRecordBorrowM699Store();
  const [detail, setDetail] = useState<MedicalRecordBorrow | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病案借阅管理"
      description="病历号 / 借阅人 / 科室 / 借阅日期 / 应还日期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`借阅记录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="病案借阅详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="病历号">{detail.recordNo}</Descriptions.Item>
            <Descriptions.Item label="借阅人">{detail.borrower}（{detail.borrowerDept}）</Descriptions.Item>
            <Descriptions.Item label="借阅事由">{detail.reason}</Descriptions.Item>
            <Descriptions.Item label="借阅日期">{dayjs(detail.borrowedAt).format('YYYY-MM-DD')}</Descriptions.Item>
            <Descriptions.Item label="应还日期">{detail.dueAt}</Descriptions.Item>
            <Descriptions.Item label="实际归还日期">
              {detail.returnedAt ? dayjs(detail.returnedAt).format('YYYY-MM-DD') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="审批人">{detail.approver}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={BORROW_STATUS_META[detail.status].color}>{BORROW_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
