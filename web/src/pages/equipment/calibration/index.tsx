/**
 * 健澜科技 jlmedaios - 设备计量检定管理（M730）
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
import { useCalibrationM730Store } from '@/store/calibrationM730Store';
import {
  CALIB_STATUS_META,
  type CalibrationRecord,
} from '@/services/api/calibrationM730';

const buildColumns = (setDetail: (r: CalibrationRecord) => void): ColumnsType<CalibrationRecord> => [
  { title: '设备名称', dataIndex: 'equipName', ellipsis: true },
  { title: '检定日期', dataIndex: 'calibratedAt', width: 110 },
  { title: '检定机构', dataIndex: 'agency', width: 200, ellipsis: true },
  { title: '有效期至', dataIndex: 'validUntil', width: 110 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: CalibrationRecord['status']) => <Tag color={CALIB_STATUS_META[v].color}>{CALIB_STATUS_META[v].label}</Tag>,
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

export default function EquipmentCalibrationM730Page() {
  usePageTitle('设备计量检定管理');
  const { items, loading, error, demo, load } = useCalibrationM730Store();
  const [detail, setDetail] = useState<CalibrationRecord | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="设备计量检定管理"
      description="设备名称 / 检定日期 / 检定机构 / 有效期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`计量检定（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="计量检定详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="设备名称">{detail.equipName}</Descriptions.Item>
            <Descriptions.Item label="检定日期">{detail.calibratedAt}</Descriptions.Item>
            <Descriptions.Item label="检定机构">{detail.agency}</Descriptions.Item>
            <Descriptions.Item label="证书编号">{detail.certificateNo}</Descriptions.Item>
            <Descriptions.Item label="有效期至">{detail.validUntil}</Descriptions.Item>
            <Descriptions.Item label="检定结果">{detail.result}</Descriptions.Item>
            <Descriptions.Item label="不合格处理">{detail.handling}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={CALIB_STATUS_META[detail.status].color}>{CALIB_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
