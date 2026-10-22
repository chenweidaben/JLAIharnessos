/**
 * 健澜科技 jlmedaios - 血管外科管理（M800）
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
import { useVascularPatientM800Store } from '@/store/vascularPatientM800Store';
import type { VascularPatient } from '@/services/api/vascularPatientM800';

const buildColumns = (setDetail: (r: VascularPatient) => void): ColumnsType<VascularPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 260, ellipsis: true },
  { title: '病变部位', dataIndex: 'lesion', width: 240, ellipsis: true },
  { title: '手术方式', dataIndex: 'opApproach', width: 260, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 120 },
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

export default function VascularSurgeryM800Page() {
  usePageTitle('血管外科管理');
  const { items, loading, error, demo, load } = useVascularPatientM800Store();
  const [detail, setDetail] = useState<VascularPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="血管外科管理"
      description="住院号 / 患者姓名 / 诊断 / 病变部位 / 手术方式 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`血管患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="血管患者详情"
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
              <Descriptions.Item label="病变部位" span={2}>{detail.lesion}</Descriptions.Item>
              <Descriptions.Item label="手术方式" span={2}>{detail.opApproach}</Descriptions.Item>
              <Descriptions.Item label="血管超声 / CTA" span={2}>{detail.imaging}</Descriptions.Item>
              <Descriptions.Item label="手术记录" span={2}>{detail.opRecord}</Descriptions.Item>
              <Descriptions.Item label="抗凝管理" span={2}>{detail.anticoagulation}</Descriptions.Item>
              <Descriptions.Item label="血运评估" span={2}>{detail.perfusion}</Descriptions.Item>
              <Descriptions.Item label="随访" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
