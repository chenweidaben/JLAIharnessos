/**
 * 健澜科技 jlmedaios - 医嘱执行单（M694）
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
import { useMedicationAdministrationM694Store } from '@/store/medicationAdministrationM694Store';
import {
  MED_STATUS_META,
  type MedAdministration,
} from '@/services/api/medAdministrationM694';

const buildColumns = (setDetail: (r: MedAdministration) => void): ColumnsType<MedAdministration> => [
  { title: '医嘱号', dataIndex: 'orderNo', width: 110 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '药品', dataIndex: 'drugName', ellipsis: true },
  { title: '剂量', dataIndex: 'dose', width: 100 },
  { title: '途径', dataIndex: 'route', width: 120 },
  {
    title: '计划时间',
    dataIndex: 'scheduledAt',
    width: 150,
    render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: MedAdministration['status']) => <Tag color={MED_STATUS_META[v].color}>{MED_STATUS_META[v].label}</Tag>,
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

export default function MedicationAdministrationM694Page() {
  usePageTitle('医嘱执行单');
  const { items, loading, error, demo, load } = useMedicationAdministrationM694Store();
  const [detail, setDetail] = useState<MedAdministration | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医嘱执行单"
      description="患者 / 药品 / 剂量 / 途径 / 执行时间 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`医嘱执行（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="医嘱执行详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="医嘱号">{detail.orderNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="药品">{detail.drugName}</Descriptions.Item>
            <Descriptions.Item label="剂量">{detail.dose}</Descriptions.Item>
            <Descriptions.Item label="给药途径">{detail.route}</Descriptions.Item>
            <Descriptions.Item label="计划执行时间">
              {dayjs(detail.scheduledAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="实际执行时间">
              {detail.executedAt ? dayjs(detail.executedAt).format('YYYY-MM-DD HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="执行护士">{detail.executedBy || '—'}</Descriptions.Item>
            <Descriptions.Item label="皮试结果">{detail.skinTestResult}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={MED_STATUS_META[detail.status].color}>{MED_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
