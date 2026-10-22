/**
 * 健澜科技 jlmedaios - 神经外科管理（M795）
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
import { useNeuroSurgPatientM795Store } from '@/store/neuroSurgPatientM795Store';
import type { NeuroSurgPatient } from '@/services/api/neuroSurgPatientM795';

const gcsColor = (v: number) => (v <= 8 ? 'red' : v <= 12 ? 'orange' : 'green');

const buildColumns = (setDetail: (r: NeuroSurgPatient) => void): ColumnsType<NeuroSurgPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 220, ellipsis: true },
  {
    title: 'GCS',
    dataIndex: 'gcs',
    width: 90,
    align: 'right',
    render: (v: number) => <Tag color={gcsColor(v)}>{v}</Tag>,
  },
  { title: '手术方式', dataIndex: 'opApproach', width: 280, ellipsis: true },
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

export default function NeurosurgeryM795Page() {
  usePageTitle('神经外科管理');
  const { items, loading, error, demo, load } = useNeuroSurgPatientM795Store();
  const [detail, setDetail] = useState<NeuroSurgPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="神经外科管理"
      description="住院号 / 患者姓名 / 诊断 / GCS 评分 / 手术方式 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`神外患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="神外患者详情"
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
              <Descriptions.Item label="GCS">
                <Tag color={gcsColor(detail.gcs)}>{detail.gcs}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="手术方式" span={2}>{detail.opApproach}</Descriptions.Item>
              <Descriptions.Item label="术前头颅 CT / MRI" span={2}>{detail.preImaging}</Descriptions.Item>
              <Descriptions.Item label="手术记录" span={2}>{detail.opRecord}</Descriptions.Item>
              <Descriptions.Item label="术后 GCS 变化" span={2}>{detail.postGcs}</Descriptions.Item>
              <Descriptions.Item label="颅内压监测" span={2}>{detail.icp}</Descriptions.Item>
              <Descriptions.Item label="康复评估" span={2}>{detail.rehab}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
