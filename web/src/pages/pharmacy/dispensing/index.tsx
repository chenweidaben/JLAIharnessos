/**
 * 健澜科技 jlmedaios - 药房发药管理（M676）
 *
 * 三甲流程：待发药处方 Table（处方号/患者/科室/药品数/金额/状态）+ 发药确认 Modal。
 * 升级自 M355 简易页，service/store 走 M676 三件套。
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
import { usePharmacyDispensingM676Store } from '@/store/pharmacyDispensingM676Store';
import {
  RX_STATUS_META,
  type Prescription,
} from '@/services/api/pharmacyDispensingM676';

const yuan = (v: number) => `¥${v.toFixed(2)}`;

const buildColumns = (setRow: (r: Prescription) => void): ColumnsType<Prescription> => [
  { title: '处方号', dataIndex: 'rxNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 110 },
  { title: '开方医师', dataIndex: 'doctor', width: 110 },
  { title: '药品数', dataIndex: 'itemCount', width: 90, align: 'right' },
  { title: '金额', dataIndex: 'totalAmount', width: 110, align: 'right', render: (v: number) => yuan(v) },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Prescription['status']) => <Tag color={RX_STATUS_META[v].color}>{RX_STATUS_META[v].label}</Tag>,
  },
  { title: '开方时间', dataIndex: 'createdAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  {
    title: '操作',
    width: 110,
    render: (_v, row) =>
      row.status === 'pending' ? (
        <Button type="link" size="small" onClick={() => setRow(row)}>
          发药
        </Button>
      ) : (
        <span style={{ color: '#ccc' }}>—</span>
      ),
  },
];

export default function PharmacyDispensingPage() {
  usePageTitle('药房发药');

  const { items, loading, error, demo, load } = usePharmacyDispensingM676Store();
  const [row, setRow] = useState<Prescription | null>(null);
  const columns = buildColumns(setRow);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="药房发药管理"
      description="待发药处方 / 发药确认"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`处方列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!row}
        title="发药确认"
        okText="确认发药"
        cancelText="取消"
        onOk={() => setRow(null)}
        onCancel={() => setRow(null)}
      >
        {row && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="处方号">{row.rxNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{row.patientId}</Descriptions.Item>
            <Descriptions.Item label="科室">{row.dept}</Descriptions.Item>
            <Descriptions.Item label="开方医师">{row.doctor}</Descriptions.Item>
            <Descriptions.Item label="药品项数">{row.itemCount}</Descriptions.Item>
            <Descriptions.Item label="总金额">{yuan(row.totalAmount)}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
