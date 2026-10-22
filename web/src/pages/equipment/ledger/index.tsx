/**
 * 健澜科技 jlmedaios - 医疗设备台账管理（M728）
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
import { useEquipmentLedgerM728Store } from '@/store/equipmentLedgerM728Store';
import {
  EQUIP_STATUS_META,
  type EquipmentLedger,
} from '@/services/api/equipmentLedgerM728';

const usageColumns: ColumnsType<{ date: string; content: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '使用/事件', dataIndex: 'content' },
];

const buildColumns = (setDetail: (r: EquipmentLedger) => void): ColumnsType<EquipmentLedger> => [
  { title: '设备编号', dataIndex: 'assetNo', width: 140 },
  { title: '设备名称', dataIndex: 'name', ellipsis: true },
  { title: '型号', dataIndex: 'model', width: 200, ellipsis: true },
  { title: '科室', dataIndex: 'dept', width: 110 },
  { title: '购置日期', dataIndex: 'purchasedAt', width: 110 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: EquipmentLedger['status']) => <Tag color={EQUIP_STATUS_META[v].color}>{EQUIP_STATUS_META[v].label}</Tag>,
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

export default function EquipmentLedgerM728Page() {
  usePageTitle('医疗设备台账管理');
  const { items, loading, error, demo, load } = useEquipmentLedgerM728Store();
  const [detail, setDetail] = useState<EquipmentLedger | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医疗设备台账管理"
      description="设备编号 / 设备名称 / 型号 / 科室 / 购置日期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`设备台账（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="设备台账详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="设备编号">{detail.assetNo}</Descriptions.Item>
              <Descriptions.Item label="设备名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="型号">{detail.model}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="购置日期">{detail.purchasedAt}</Descriptions.Item>
              <Descriptions.Item label="保修至">{detail.warrantyUntil}</Descriptions.Item>
              <Descriptions.Item label="设备参数" span={2}>{detail.specs}</Descriptions.Item>
              <Descriptions.Item label="供应商" span={2}>{detail.supplier}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="使用记录">
              <Table rowKey="date" dataSource={detail.usageRecords} columns={usageColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
