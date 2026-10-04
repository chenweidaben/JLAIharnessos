/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 权限管理：权限目录（按模块分组，只读）/ 角色-权限矩阵（只读查看）。
 * 权限点由迁移/代码统一定义，不在运行时凭空新增。真实 BFF + PostgreSQL，无 mock。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Layout,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tree,
  Watermark,
} from 'antd';
import { ReloadOutlined, SafetyOutlined } from '@ant-design/icons';

import DemoModeBanner from '@/components/common/DemoModeBanner';
import { useRoleAdminStore } from '@/store/roleAdminStore';

const { Header, Content } = Layout;

export default function PermissionManagementPage() {
  const {
    dbUp, healthChecking, roles, permissionGroups, loading,
    checkHealth, loadRoles, loadPermissions,
  } = useRoleAdminStore();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) {
        await Promise.all([loadRoles(), loadPermissions()]);
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 权限目录树（只读，按模块分组） */
  const treeData = useMemo(
    () =>
      permissionGroups.map((g) => ({
        key: `__module_${g.module}`,
        title: `${g.module}（${g.count}）`,
        children: g.permissions.map((p) => ({
          key: p.code,
          title: (
            <Space size={8}>
              <span>{p.name}</span>
              <code style={{ fontSize: 12, color: '#8c8c8c' }}>{p.code}</code>
            </Space>
          ),
        })),
      })),
    [permissionGroups],
  );

  /** 角色-权限矩阵数据（权限点为行） */
  const matrixData = useMemo(
    () =>
      permissionGroups.flatMap((g) =>
        g.permissions.map((p) => ({
          key: p.code,
          module: g.module,
          name: p.name,
          code: p.code,
        })),
      ),
    [permissionGroups],
  );

  /** 角色权限码集合（用于矩阵勾选） */
  const rolePermSet = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of roles) map.set(r.code, new Set(r.permissionCodes));
    return map;
  }, [roles]);

  /** 数据加载后用 key 变化重新挂载 Tree，确保 defaultExpandAll 展开模块节点 */
  const catalogTab = (
    <div className="jl-card" style={{ padding: 16 }}>
      <Tree
        key={`catalog-${permissionGroups.length}`}
        treeData={treeData}
        defaultExpandAll
        selectable={false}
      />
    </div>
  );

  const matrixTab = (
    <div className="jl-card" style={{ padding: 8 }}>
      <Table
        rowKey="key"
        size="small"
        dataSource={matrixData}
        loading={loading}
        data-testid="perm-matrix-table"
        scroll={{ x: 'max-content', y: 560 }}
        pagination={false}
        columns={[
          { title: '模块', dataIndex: 'module', width: 160, fixed: 'left', render: (m: string) => <Tag>{m}</Tag> },
          { title: '权限', dataIndex: 'name', width: 180, fixed: 'left' },
          {
            title: '编码',
            dataIndex: 'code',
            width: 220,
            fixed: 'left',
            render: (c: string) => <code style={{ fontSize: 12 }}>{c}</code>,
          },
          ...roles.map((r) => ({
            title: r.name,
            key: r.code,
            width: 90,
            align: 'center' as const,
            render: (_: unknown, row: { key: string }) =>
              rolePermSet.get(r.code)?.has(row.key) ? (
                <Tag color="green">✓</Tag>
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          })),
        ]}
      />
    </div>
  );

  return (
    <Watermark content={['健澜科技', '权限管理', 'jlmedaios']}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SafetyOutlined className="text-2xl text-white" />
            <span className="text-lg font-semibold text-white">
              权限管理 · 权限目录与角色-权限矩阵
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="perm-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="perm-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，权限管理不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充权限数据。"
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() =>
                      void checkHealth().then((up) => {
                        if (up) void Promise.all([loadRoles(), loadPermissions()]);
                      })
                    }
                  >
                    刷 新
                  </button>
                }
              />
            ) : (
              <div data-testid="perm-content">
                <div className="jl-card mb-3 flex items-center justify-between p-3">
                  <span className="text-sm text-gray-600">
                    {permissionGroups.length} 个模块 · {matrixData.length} 个权限点 · {roles.length} 个角色
                  </span>
                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      loading={loading}
                      onClick={() => void Promise.all([loadRoles(), loadPermissions()])}
                    >
                      刷新
                    </Button>
                  </Space>
                </div>

                <Tabs
                  items={[
                    { key: 'catalog', label: '权限目录', children: catalogTab },
                    { key: 'matrix', label: '角色-权限矩阵', children: matrixTab },
                  ]}
                />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
