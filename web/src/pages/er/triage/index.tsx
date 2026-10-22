/**
 * 健澜科技 jlmedaios - 急诊分诊台（M686）
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
import { useErTriageM686Store } from '@/store/erTriageM686Store';
import {
  TRIAGE_LEVEL_META,
  type ErTriage,
} from '@/services/api/erTriageM686';

const buildColumns = (setDetail: (r: ErTriage) => void): ColumnsType<ErTriage> => [
  { title: '候诊号', dataIndex: 'queueNo', width: 100 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '主诉', dataIndex: 'chiefComplaint', ellipsis: true },
  {
    title: '分诊级别',
    dataIndex: 'level',
    width: 140,
    sorter: (a, b) => a.level - b.level,
    render: (v: ErTriage['level']) => <Tag color={TRIAGE_LEVEL_META[v].color}>{TRIAGE_LEVEL_META[v].label}</Tag>,
  },
  {
    title: '候诊时间',
    dataIndex: 'waitedMinutes',
    width: 110,
    align: 'right',
    render: (v: number, row) => (
      <span style={{ color: v > TRIAGE_LEVEL_META[row.level].maxWaitMin ? '#cf1322' : 'inherit' }}>
        {v} 分钟{v > TRIAGE_LEVEL_META[row.level].maxWaitMin ? '（超时）' : ''}
      </span>
    ),
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

export default function ErTriageM686Page() {
  usePageTitle('急诊分诊台');
  const { items, loading, error, demo, load } = useErTriageM686Store();
  const [detail, setDetail] = useState<ErTriage | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="急诊分诊台"
      description="候诊号 / 主诉 / 分诊级别 / 候诊时间"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`候诊列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="急诊分诊详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="候诊号">{detail.queueNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="主诉">{detail.chiefComplaint}</Descriptions.Item>
            <Descriptions.Item label="分诊级别">
              <Tag color={TRIAGE_LEVEL_META[detail.level].color}>{TRIAGE_LEVEL_META[detail.level].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="生命体征">
              HR {detail.heartRate} bpm；BP {detail.sbp}/{detail.dbp} mmHg；SpO₂ {detail.spo2}%
            </Descriptions.Item>
            <Descriptions.Item label="候诊时间">{detail.waitedMinutes} 分钟</Descriptions.Item>
            <Descriptions.Item label="分诊依据">{detail.triageReason}</Descriptions.Item>
            <Descriptions.Item label="处置建议">{detail.disposition}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
