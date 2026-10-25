/**
 * 健澜科技 jlmedaios - 病历版本对比（M615，P0）
 *
 * 三甲流程：病历号 → 左右版本 Select → 行级 diff 双栏 Table
 * （modified 橙、added 绿、removed 红、same 灰）。权限码 medicalRecord:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Descriptions, Row, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useMedicalRecordVersionCompareStore } from '@/store/medicalRecordVersionCompareStore';
import type { VersionDiffRow } from '@/services/api/medicalRecordVersionCompare';

const ROW_KIND_META: Record<VersionDiffRow['kind'], { label: string; color: string }> = {
  same: { label: '相同', color: 'default' },
  added: { label: '新增', color: 'green' },
  removed: { label: '删除', color: 'red' },
  modified: { label: '修改', color: 'orange' },
};

export default function MedicalRecordVersionCompareM615Page() {
  usePageTitle('病历版本对比');
  const { hasPermission } = usePermission();
  const canView = hasPermission('medicalRecord:view');

  const { recordId, versions, leftNo, rightNo, left, right, rows, loading, error, load, setLeft, setRight } =
    useMedicalRecordVersionCompareStore();

  useEffect(() => {
    void load(recordId);
  }, [load, recordId]);

  const columns: ColumnsType<VersionDiffRow> = [
    {
      title: '类型',
      dataIndex: 'kind',
      width: 90,
      render: (v: VersionDiffRow['kind']) => <Tag color={ROW_KIND_META[v].color}>{ROW_KIND_META[v].label}</Tag>,
    },
    {
      title: `左侧 v${leftNo ?? '—'}`,
      dataIndex: 'left',
      render: (v: string, r) => (
        <Typography.Paragraph
          style={{ margin: 0, background: r.kind === 'removed' ? '#fff1f0' : r.kind === 'modified' ? '#fffbe6' : 'transparent', padding: 4 }}
        >
          {v || '—'}
        </Typography.Paragraph>
      ),
    },
    {
      title: `右侧 v${rightNo ?? '—'}`,
      dataIndex: 'right',
      render: (v: string, r) => (
        <Typography.Paragraph
          style={{ margin: 0, background: r.kind === 'added' ? '#f6ffed' : r.kind === 'modified' ? '#fffbe6' : 'transparent', padding: 4 }}
        >
          {v || '—'}
        </Typography.Paragraph>
      ),
    },
  ];

  return (
    <PageContainer title="病历版本对比" description="左右版本选择 → 行级 diff 双栏视图">
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 medicalRecord:view 权限" />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>病历号：</span>
          <Typography.Text strong>{recordId}</Typography.Text>
          <Select
            style={{ width: 180 }}
            value={leftNo}
            onChange={(v) => void setLeft(v)}
            placeholder="选择左侧版本"
            options={versions.map((v) => ({ value: v.versionNo, label: `v${v.versionNo} · ${dayjs(v.editedAt).format('MM-DD HH:mm')}` }))}
          />
          <Select
            style={{ width: 180 }}
            value={rightNo}
            onChange={(v) => void setRight(v)}
            placeholder="选择右侧版本"
            options={versions.map((v) => ({ value: v.versionNo, label: `v${v.versionNo} · ${dayjs(v.editedAt).format('MM-DD HH:mm')}` }))}
          />
        </Space>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title={left ? `左侧 v${left.versionNo}（${left.editorName} · ${dayjs(left.editedAt).format('YYYY-MM-DD HH:mm')}）` : '左侧'}>
            {left && (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="变更说明">{left.changeReason}</Descriptions.Item>
                <Descriptions.Item label="状态">{left.status}</Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title={right ? `右侧 v${right.versionNo}（${right.editorName} · ${dayjs(right.editedAt).format('YYYY-MM-DD HH:mm')}）` : '右侧'}>
            {right && (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="变更说明">{right.changeReason}</Descriptions.Item>
                <Descriptions.Item label="状态">{right.status}</Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </Col>
      </Row>

      <Card size="small" title="行级 diff" style={{ marginTop: 16 }}>
        <Spin spinning={loading}>
          <Table rowKey="key" dataSource={rows} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>
    </PageContainer>
  );
}
