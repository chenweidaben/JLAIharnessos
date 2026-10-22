/**
 * 健澜科技 jlmedaios - 病历归档管理（M698，升级自 M337 简易页）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useMedicalRecordArchiveM698Store } from '@/store/medicalRecordArchiveM698Store';
import {
  ARCHIVE_STATUS_META,
  type MedicalRecordArchive,
} from '@/services/api/medicalRecordArchiveM698';

const buildColumns = (setDetail: (r: MedicalRecordArchive) => void): ColumnsType<MedicalRecordArchive> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 120 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '出院日期', dataIndex: 'dischargeDate', width: 120 },
  {
    title: '归档状态',
    dataIndex: 'status',
    width: 110,
    render: (v: MedicalRecordArchive['status']) => <Tag color={ARCHIVE_STATUS_META[v].color}>{ARCHIVE_STATUS_META[v].label}</Tag>,
  },
  {
    title: '归档时间',
    dataIndex: 'archivedAt',
    width: 150,
    render: (v: string | null) => (v ? dayjs(v).format('MM-DD HH:mm') : '—'),
  },
  {
    title: '缺项',
    dataIndex: 'missingItems',
    width: 160,
    render: (arr: string[]) =>
      arr.length ? <Tag color="red">{arr.length} 项缺失</Tag> : <Tag color="green">完整</Tag>,
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

export default function MedicalRecordsArchivePage() {
  usePageTitle('病历归档管理');
  const { items, loading, error, demo, load } = useMedicalRecordArchiveM698Store();
  const [detail, setDetail] = useState<MedicalRecordArchive | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病历归档管理"
      description="住院号 / 患者 / 出院日期 / 归档状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`归档病历（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="病历归档详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
              <Descriptions.Item label="出院日期">{detail.dischargeDate}</Descriptions.Item>
              <Descriptions.Item label="归档状态">
                <Tag color={ARCHIVE_STATUS_META[detail.status].color}>{ARCHIVE_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="病历完整性检查清单" style={{ marginBottom: 16 }}>
              {detail.completenessChecklist.map((c) => (
                <Checkbox key={c.item} checked={c.present} style={{ display: 'block', marginBottom: 4 }}>
                  {c.item}
                </Checkbox>
              ))}
            </Card>
            <Card size="small" title="缺项列表">
              {detail.missingItems.length ? (
                detail.missingItems.map((m) => <Tag key={m} color="red" style={{ marginBottom: 4 }}>{m}</Tag>)
              ) : (
                <span style={{ color: '#3f8600' }}>无缺项，病历完整。</span>
              )}
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
