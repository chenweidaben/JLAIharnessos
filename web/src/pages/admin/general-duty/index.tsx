/**
 * 健澜科技 jlmedaios - 医院总值班管理（M766）
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
import { useGeneralDutyM766Store } from '@/store/generalDutyM766Store';
import {
  DUTY_STATUS_META,
  type GeneralDuty,
} from '@/services/api/generalDutyM766';

const buildColumns = (setDetail: (r: GeneralDuty) => void): ColumnsType<GeneralDuty> => [
  { title: '值班日期', dataIndex: 'dutyDate', width: 120 },
  { title: '值班领导', dataIndex: 'leader', width: 130 },
  { title: '值班医生', dataIndex: 'doctor', width: 180, ellipsis: true },
  { title: '值班护士', dataIndex: 'nurse', width: 180, ellipsis: true },
  { title: '联系方式', dataIndex: 'contact', width: 200, ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: GeneralDuty['status']) => <Tag color={DUTY_STATUS_META[v].color}>{DUTY_STATUS_META[v].label}</Tag>,
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

export default function GeneralDutyM766Page() {
  usePageTitle('医院总值班管理');
  const { items, loading, error, demo, load } = useGeneralDutyM766Store();
  const [detail, setDetail] = useState<GeneralDuty | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医院总值班管理"
      description="值班日期 / 值班领导 / 值班医生 / 值班护士 / 联系方式 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`总值班（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="总值班详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="值班日期">{detail.dutyDate}</Descriptions.Item>
              <Descriptions.Item label="值班领导">{detail.leader}</Descriptions.Item>
              <Descriptions.Item label="值班医生">{detail.doctor}</Descriptions.Item>
              <Descriptions.Item label="值班护士">{detail.nurse}</Descriptions.Item>
              <Descriptions.Item label="联系方式" span={2}>{detail.contact}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={DUTY_STATUS_META[detail.status].color}>{DUTY_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="值班记录" style={{ marginBottom: 16 }}>{detail.records}</Card>
            <Card size="small" title="突发事件处置" style={{ marginBottom: 16 }}>{detail.incidents}</Card>
            <Card size="small" title="交接班记录">{detail.handover}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
