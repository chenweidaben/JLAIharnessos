/**
 * 健澜科技 jlmedaios - 角色权限管理（M744，升级自 M223 简易页）
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
import { useSystemRoleM744Store } from '@/store/systemRoleM744Store';
import {
  ROLE_STATUS_META,
  type SystemRole,
} from '@/services/api/systemRoleM744';

const buildColumns = (setDetail: (r: SystemRole) => void): ColumnsType<SystemRole> => [
  { title: '角色名称', dataIndex: 'name', width: 160 },
  { title: '角色编码', dataIndex: 'code', width: 160 },
  { title: '用户数', dataIndex: 'userCount', width: 100, align: 'right' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: SystemRole['status']) => <Tag color={ROLE_STATUS_META[v].color}>{ROLE_STATUS_META[v].label}</Tag>,
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

export default function SystemRolesPage() {
  usePageTitle('角色权限管理');
  const { items, loading, error, demo, load } = useSystemRoleM744Store();
  const [detail, setDetail] = useState<SystemRole | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="角色权限管理"
      description="角色名称 / 角色编码 / 用户数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`角色列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="角色详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="角色名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="角色编码">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="用户数">{detail.userCount}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={ROLE_STATUS_META[detail.status].color}>{ROLE_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="数据权限" span={2}>{detail.dataScope}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="菜单权限">
              {detail.menuPermissions.map((m) => <Tag key={m} color="blue" style={{ marginBottom: 4 }}>{m}</Tag>)}
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
