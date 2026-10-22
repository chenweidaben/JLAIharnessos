/**
 * 健澜科技 jlmedaios - 康复医学科管理（M773）
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
import { useRehabPatientM773Store } from '@/store/rehabPatientM773Store';
import {
  REHAB_STAGE_META,
  type RehabPatient,
} from '@/services/api/rehabPatientM773';

const buildColumns = (setDetail: (r: RehabPatient) => void): ColumnsType<RehabPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 220, ellipsis: true },
  {
    title: '康复阶段',
    dataIndex: 'stage',
    width: 130,
    render: (v: RehabPatient['stage']) => <Tag color={REHAB_STAGE_META[v].color}>{REHAB_STAGE_META[v].label}</Tag>,
  },
  { title: '康复师', dataIndex: 'therapist', width: 180, ellipsis: true },
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

export default function RehabilitationM773Page() {
  usePageTitle('康复医学科管理');
  const { items, loading, error, demo, load } = useRehabPatientM773Store();
  const [detail, setDetail] = useState<RehabPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="康复医学科管理"
      description="住院号 / 患者姓名 / 诊断 / 康复阶段 / 康复师 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`康复患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="康复患者详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="康复阶段">
                <Tag color={REHAB_STAGE_META[detail.stage].color}>{REHAB_STAGE_META[detail.stage].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="康复师">{detail.therapist}</Descriptions.Item>
              <Descriptions.Item label="康复评定" span={2}>{detail.assessment}</Descriptions.Item>
              <Descriptions.Item label="治疗方案" span={2}>{detail.plan}</Descriptions.Item>
              <Descriptions.Item label="康复进度" span={2}>{detail.progress}</Descriptions.Item>
              <Descriptions.Item label="出院计划" span={2}>{detail.dischargePlan}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
