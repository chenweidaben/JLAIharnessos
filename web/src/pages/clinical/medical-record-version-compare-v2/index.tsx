/**
 * 健澜科技 jlmedaios - 病历版本对比 v2（M628，P0 合规）
 *
 * 三甲流程：输入病历号 → 下拉选两个版本（versionNo）→ 结构化字段对比 Table。
 * 权限码 medicalRecord:compare。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useMedicalRecordVersionCompareV2M628Store } from '@/store/medicalRecordVersionCompareV2M628Store';
import type { VersionCompareRow } from '@/services/api/medicalRecordVersionCompareV2M628';

export default function MedicalRecordVersionCompareV2M628Page() {
  usePageTitle('病历版本对比');
  const { hasPermission } = usePermission();
  const canCompare = hasPermission('medicalRecord:compare');

  const { recordId, versions, leftNo, rightNo, loading, error, demo, load, selectLeft, selectRight, rows } =
    useMedicalRecordVersionCompareV2M628Store();

  useEffect(() => {
    void load(recordId);
  }, [load, recordId]);

  const versionOptions = useMemo(
    () =>
      versions.map((v) => ({
        value: v.versionNo,
        label: `v${v.versionNo} · ${v.editorName} · ${dayjs(v.editedAt).format('MM-DD HH:mm')}`,
      })),
    [versions],
  );

  const columns: ColumnsType<VersionCompareRow> = [
    { title: '字段', dataIndex: 'field', width: 160 },
    { title: '版本 A', dataIndex: 'left' },
    { title: '版本 B', dataIndex: 'right' },
    {
      title: '一致性',
      dataIndex: 'same',
      width: 120,
      render: (same: boolean) =>
        same ? <Badge status="success" text="一致" /> : <Badge status="warning" text="不一致" />,
    },
  ];

  return (
    <PageContainer
      title="病历版本对比（v2）"
      description="选择两个版本进行结构化字段对比"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canCompare && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 medicalRecord:compare 权限" />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            style={{ width: 220 }}
            addonBefore="病历号"
            defaultValue={recordId}
            onPressEnter={(e) => void load((e.target as HTMLInputElement).value)}
          />
          <Select
            style={{ width: 320 }}
            placeholder="版本 A"
            value={leftNo ?? undefined}
            options={versionOptions}
            onChange={selectLeft}
          />
          <Select
            style={{ width: 320 }}
            placeholder="版本 B"
            value={rightNo ?? undefined}
            options={versionOptions}
            onChange={selectRight}
          />
          <Button onClick={() => void load(recordId)}>刷新</Button>
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Card size="small" title="结构化字段对比">
          <Table rowKey="field" dataSource={rows()} columns={columns} size="small" pagination={false} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
