/**
 * 健澜科技 jlmedaios - 骨科管理（M796）
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
import { useOrthoPatientM796Store } from '@/store/orthoPatientM796Store';
import type { OrthoPatient } from '@/services/api/orthoPatientM796';

const buildColumns = (setDetail: (r: OrthoPatient) => void): ColumnsType<OrthoPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 220, ellipsis: true },
  { title: '骨折部位', dataIndex: 'fractureSite', width: 200, ellipsis: true },
  { title: '手术方式', dataIndex: 'opApproach', width: 240, ellipsis: true },
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

export default function OrthopedicsM796Page() {
  usePageTitle('骨科管理');
  const { items, loading, error, demo, load } = useOrthoPatientM796Store();
  const [detail, setDetail] = useState<OrthoPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="骨科管理"
      description="住院号 / 患者姓名 / 诊断 / 骨折部位 / 手术方式 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`骨科患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="骨科患者详情"
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
              <Descriptions.Item label="骨折部位">{detail.fractureSite}</Descriptions.Item>
              <Descriptions.Item label="手术方式">{detail.opApproach}</Descriptions.Item>
              <Descriptions.Item label="影像学检查" span={2}>{detail.imaging}</Descriptions.Item>
              <Descriptions.Item label="手术记录" span={2}>{detail.opRecord}</Descriptions.Item>
              <Descriptions.Item label="术后康复计划" span={2}>{detail.rehabPlan}</Descriptions.Item>
              <Descriptions.Item label="负重进度" span={2}>{detail.weightBearing}</Descriptions.Item>
              <Descriptions.Item label="并发症监测" span={2}>{detail.complications}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
