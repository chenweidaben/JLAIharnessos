/**
 * 健澜科技 jlmedaios - 放疗科管理（M809）
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
import { useRadiationOncologyWorkloadM809Store } from '@/store/radiationOncologyWorkloadM809Store';
import type { RadiationOncologyPatient } from '@/services/api/radiationOncologyWorkloadM809';

const buildColumns = (setDetail: (r: RadiationOncologyPatient) => void): ColumnsType<RadiationOncologyPatient> => [
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 260, ellipsis: true },
  { title: '放疗方式', dataIndex: 'modality', width: 180 },
  { title: '剂量 (Gy)', dataIndex: 'doseGy', width: 100, align: 'right' },
  { title: '次数', dataIndex: 'fractions', width: 80, align: 'right' },
  { title: '状态', dataIndex: 'status', width: 140 },
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

export default function RadiationOncologyManagementM809Page() {
  usePageTitle('放疗科管理');
  const { items, loading, error, demo, load } = useRadiationOncologyWorkloadM809Store();
  const [detail, setDetail] = useState<RadiationOncologyPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="放疗科管理"
      description="患者姓名 / 诊断 / 放疗方式 / 剂量 / 次数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`放疗患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="放疗患者详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="放疗方式">{detail.modality}</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="总剂量">{detail.doseGy} Gy</Descriptions.Item>
              <Descriptions.Item label="分割次数">{detail.fractions} 次</Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>{detail.status}</Descriptions.Item>
              <Descriptions.Item label="放疗计划" span={2}>{detail.plan}</Descriptions.Item>
              <Descriptions.Item label="靶区勾画" span={2}>{detail.targetVolume}</Descriptions.Item>
              <Descriptions.Item label="剂量分布" span={2}>{detail.doseDistribution}</Descriptions.Item>
              <Descriptions.Item label="放疗记录" span={2}>{detail.record}</Descriptions.Item>
              <Descriptions.Item label="不良反应记录" span={2}>{detail.adverseEvents}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
