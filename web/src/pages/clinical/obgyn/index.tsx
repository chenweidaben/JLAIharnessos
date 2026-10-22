/**
 * 健澜科技 jlmedaios - 妇产科管理（M781）
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
import { useObgynPatientM781Store } from '@/store/obgynPatientM781Store';
import type { ObgynPatient } from '@/services/api/obgynPatientM781';

const visitColumns: ColumnsType<{ date: string; ga: string; note: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '孕周', dataIndex: 'ga', width: 90 },
  { title: '记录', dataIndex: 'note' },
];

const buildColumns = (setDetail: (r: ObgynPatient) => void): ColumnsType<ObgynPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 240, ellipsis: true },
  { title: '孕周', dataIndex: 'gestationalWeek', width: 90 },
  { title: '胎次', dataIndex: 'parity', width: 90 },
  { title: '状态', dataIndex: 'status', width: 100 },
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

export default function ObgynM781Page() {
  usePageTitle('妇产科管理');
  const { items, loading, error, demo, load } = useObgynPatientM781Store();
  const [detail, setDetail] = useState<ObgynPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="妇产科管理"
      description="住院号 / 患者姓名 / 诊断 / 孕周 / 胎次 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`妇产科患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="妇产科患者详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="孕周">{detail.gestationalWeek}</Descriptions.Item>
              <Descriptions.Item label="胎次">{detail.parity}</Descriptions.Item>
              <Descriptions.Item label="胎心监护" span={2}>{detail.ctg}</Descriptions.Item>
              <Descriptions.Item label="分娩记录" span={2}>{detail.delivery}</Descriptions.Item>
              <Descriptions.Item label="产后随访" span={2}>{detail.postpartum}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="产检记录">
              <Table rowKey="date" dataSource={detail.prenatalVisits} columns={visitColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
