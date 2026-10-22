/**
 * 健澜科技 jlmedaios - 整形外科管理（M799）
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
import { usePlasticPatientM799Store } from '@/store/plasticPatientM799Store';
import type { PlasticPatient } from '@/services/api/plasticPatientM799';

const buildColumns = (setDetail: (r: PlasticPatient) => void): ColumnsType<PlasticPatient> => [
  { title: '病历号', dataIndex: 'caseNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '手术类型', dataIndex: 'surgeryType', width: 140 },
  { title: '术式', dataIndex: 'procedure', width: 280, ellipsis: true },
  { title: '麻醉方式', dataIndex: 'anesthesia', width: 130 },
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

export default function PlasticSurgeryM799Page() {
  usePageTitle('整形外科管理');
  const { items, loading, error, demo, load } = usePlasticPatientM799Store();
  const [detail, setDetail] = useState<PlasticPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="整形外科管理"
      description="病历号 / 患者姓名 / 手术类型 / 术式 / 麻醉方式 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`整形患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="整形患者详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="病历号">{detail.caseNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="手术类型">{detail.surgeryType}</Descriptions.Item>
              <Descriptions.Item label="麻醉方式">{detail.anesthesia}</Descriptions.Item>
              <Descriptions.Item label="术式" span={2}>{detail.procedure}</Descriptions.Item>
              <Descriptions.Item label="术前设计" span={2}>{detail.preDesign}</Descriptions.Item>
              <Descriptions.Item label="手术记录" span={2}>{detail.opRecord}</Descriptions.Item>
              <Descriptions.Item label="术后换药" span={2}>{detail.dressing}</Descriptions.Item>
              <Descriptions.Item label="瘢痕管理" span={2}>{detail.scar}</Descriptions.Item>
              <Descriptions.Item label="随访计划" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
