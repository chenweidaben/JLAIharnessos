/**
 * 健澜科技 jlmedaios - 病历版本历史（M542，P0）
 *
 * 三甲流程：病历号输入 → 版本列表 Table（版本号/提交人/时间/变更说明/状态 Tag）
 * → 行点击开 Drawer 调详情，Descriptions + 全文 Typography.Paragraph。
 * 权限码 medicalRecord:view。BFF 不可由 service 层降级 DEMO 镜像并打标。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useMedicalRecordVersionsStore } from '@/store/medicalRecordVersionsStore';
import { VERSION_STATUS_META, type RecordVersion } from '@/services/api/medicalRecordVersions';

export default function MedicalRecordVersionsPage() {
  usePageTitle('病历版本历史');
  const { hasPermission } = usePermission();
  const canView = hasPermission('medicalRecord:view');

  const {
    recordId,
    currentVersionNo,
    versions,
    selected,
    loading,
    detailLoading,
    error,
    demo,
    load,
    openVersion,
    closeVersion,
  } = useMedicalRecordVersionsStore();

  const [input, setInput] = useState(recordId);

  useEffect(() => {
    void load(recordId);
  }, [load, recordId]);

  const columns = useMemo(
    () => [
      {
        title: '版本号',
        dataIndex: 'versionNo',
        width: 90,
        render: (v: number) => (
          <Tag color={v === currentVersionNo ? 'green' : 'default'}>v{v}</Tag>
        ),
      },
      { title: '提交人', dataIndex: 'editorName', width: 120 },
      {
        title: '提交时间',
        dataIndex: 'editedAt',
        width: 180,
        render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—'),
      },
      { title: '变更说明', dataIndex: 'changeReason', ellipsis: true },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        render: (v: RecordVersion['status']) => {
          const meta = VERSION_STATUS_META[v];
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
      {
        title: '操作',
        width: 90,
        render: (_: unknown, r: RecordVersion) => (
          <Button size="small" type="link" loading={detailLoading} onClick={() => void openVersion(r.versionNo)}>
            查看
          </Button>
        ),
      },
    ],
    [currentVersionNo, detailLoading, openVersion],
  );

  return (
    <PageContainer
      title="病历版本历史"
      description="版本列表倒序 · 点击行查看版本全文（draft/submitted/locked 状态机）"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 medicalRecord:view 权限" />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          enterButton="加载版本"
          style={{ maxWidth: 360 }}
          placeholder="病历号，如 MR-001"
          defaultValue={recordId}
          onSearch={(v) => {
            const id = v.trim();
            if (id) void load(id);
          }}
          onChange={(e) => setInput(e.target.value)}
        />
        <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
          当前病历：{recordId} · 最新版本 v{currentVersionNo}
          {input && <span style={{ color: '#bbb' }}>（回车按新病历号重新加载）</span>}
        </Typography.Text>
      </Card>

      <Card size="small" title={`版本列表（${versions.length}）`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.versionNo}
            dataSource={versions}
            columns={columns}
            size="small"
            pagination={false}
            onRow={(r) => ({ onClick: () => void openVersion(r.versionNo) })}
          />
        </Spin>
      </Card>

      <Drawer
        open={selected != null}
        title={selected ? `版本 v${selected.versionNo} 全文` : '版本详情'}
        width={640}
        onClose={closeVersion}
        loading={detailLoading}
      >
        {selected && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="版本号">v{selected.versionNo}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={VERSION_STATUS_META[selected.status].color}>
                  {VERSION_STATUS_META[selected.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="提交人">
                {selected.editorName}（{selected.editorId}）
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {dayjs(selected.editedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="变更说明" span={2}>{selected.changeReason}</Descriptions.Item>
            </Descriptions>
            <Typography.Paragraph
              style={{ marginTop: 16, background: '#fafafa', padding: 12, borderRadius: 4 }}
              ellipsis={{ rows: 12, expandable: true, symbol: '展开全文' }}
            >
              {selected.content}
            </Typography.Paragraph>
          </>
        )}
      </Drawer>
    </PageContainer>
  );
}
