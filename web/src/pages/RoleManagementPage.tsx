/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 角色管理：角色列表 / 新增编辑 / 权限树分配 / 角色详情（权限+关联用户）/
 * 删除自定义角色。真实 BFF + PostgreSQL，无 mock。
 */
import { useEffect, useMemo, useState, type Key } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  Drawer,
  Form,
  Input,
  Layout,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Tree,
  Watermark,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

import DemoModeBanner from '@/components/common/DemoModeBanner';
import { useRoleAdminStore } from '@/store/roleAdminStore';
import type { AdminRole } from '@/types/adminRole';

const { Header, Content } = Layout;

interface RoleFormValues {
  code: string;
  name: string;
  description?: string;
}

export default function RoleManagementPage() {
  const { message } = AntdApp.useApp();
  const {
    dbUp, healthChecking, roles, permissionGroups, selected, loading, acting,
    checkHealth, loadRoles, loadPermissions, openRole, clearSelected,
    createRole, updateRole, assignPermissions, deleteRole,
  } = useRoleAdminStore();

  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRole | null>(null);
  const [form] = Form.useForm<RoleFormValues>();

  const [permOpen, setPermOpen] = useState(false);
  const [permRole, setPermRole] = useState<AdminRole | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Key[]>([]);

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

  /** 权限树数据（按模块分组） */
  const treeData = useMemo(
    () =>
      permissionGroups.map((g) => ({
        key: `__module_${g.module}`,
        title: `${g.module}（${g.count}）`,
        children: g.permissions.map((p) => ({ key: p.code, title: `${p.name}（${p.code}）` })),
      })),
    [permissionGroups],
  );

  const openEdit = (record?: AdminRole) => {
    setEditing(record ?? null);
    if (record) {
      form.setFieldsValue({
        code: record.code,
        name: record.name,
        description: record.description ?? undefined,
      });
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    let okAction = false;
    if (editing) {
      okAction = await updateRole(editing.code, {
        name: values.name,
        description: values.description ?? null,
      });
      if (okAction) message.success('角色已更新');
    } else {
      okAction = await createRole({
        code: values.code,
        name: values.name,
        description: values.description ?? null,
      });
      if (okAction) message.success('角色已创建');
    }
    if (okAction) setModalOpen(false);
  };

  const openPerm = (record: AdminRole) => {
    setPermRole(record);
    setCheckedKeys(record.permissionCodes);
    setPermOpen(true);
  };

  const savePerm = async () => {
    if (!permRole) return;
    const codes = checkedKeys.map(String);
    const okAction = await assignPermissions(permRole.code, codes);
    if (okAction) {
      message.success(`已为「${permRole.name}」分配 ${codes.length} 项权限`);
      setPermOpen(false);
    }
  };

  const columns: ColumnsType<AdminRole> = [
    {
      title: '角色',
      render: (_, r) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{r.code}</div>
        </div>
      ),
    },
    { title: '描述', dataIndex: 'description', width: 240, ellipsis: true, render: (v: string | null) => v ?? '—' },
    {
      title: '类型',
      dataIndex: 'isSystem',
      width: 100,
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'red' : 'blue'}>{isSystem ? '系统内置' : '自定义'}</Tag>
      ),
    },
    { title: '权限数', dataIndex: 'permissionCodes', width: 90, render: (c: string[]) => c.length },
    { title: '关联用户', dataIndex: 'userCount', width: 90 },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      width: 260,
      fixed: 'right',
      render: (_, r) => (
        <Space size={2} wrap>
          <Button type="link" size="small" onClick={() => void openRole(r.code)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<SafetyOutlined />} onClick={() => openPerm(r)}>
            分配权限
          </Button>
          {!r.isSystem && (
            <Popconfirm
              title="删除角色"
              description="将解除该角色的权限与用户关联，确认？"
              okText="删除"
              cancelText="取消"
              onConfirm={() =>
                deleteRole(r.code).then((okAction) => {
                  if (okAction) message.success('角色已删除');
                })
              }
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Watermark content={['健澜科技', '角色管理', 'jlmedaios']}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SafetyOutlined className="text-2xl text-white" />
            <span className="text-lg font-semibold text-white">
              角色管理 · 角色、权限与关联用户
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="role-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="role-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，角色管理不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充角色数据。"
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
              <div data-testid="role-content">
                <div className="jl-card mb-3 flex items-center justify-between p-3">
                  <span className="text-sm text-gray-600">共 {roles.length} 个角色</span>
                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      loading={loading}
                      onClick={() => void Promise.all([loadRoles(), loadPermissions()])}
                    >
                      刷新
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>
                      新增角色
                    </Button>
                  </Space>
                </div>

                <Table<AdminRole>
                  rowKey="code"
                  size="middle"
                  columns={columns}
                  dataSource={roles}
                  loading={loading || acting}
                  scroll={{ x: 1200 }}
                  pagination={false}
                />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>

      {/* 新增/编辑角色 */}
      <Modal
        open={modalOpen}
        title={editing ? '编辑角色' : '新增角色'}
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSave()}
        width={560}
        okText="保存"
        cancelText="取消"
        confirmLoading={acting}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="角色编码"
            rules={[
              { required: true, message: '请输入角色编码' },
              {
                pattern: /^[a-z][a-z0-9_]{1,49}$/,
                message: '需为小写字母/数字/下划线，2-50 位，字母开头',
              },
            ]}
          >
            <Input placeholder="如 ward_nurse" disabled={!!editing} />
          </Form.Item>
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="角色描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配权限 */}
      <Modal
        open={permOpen}
        title={`分配权限 - ${permRole?.name ?? ''}（已选 ${checkedKeys.length} 项）`}
        onCancel={() => setPermOpen(false)}
        onOk={() => void savePerm()}
        width={680}
        okText="保存"
        cancelText="取消"
        confirmLoading={acting}
      >
        <Tree
          checkable
          defaultExpandAll
          treeData={treeData}
          checkedKeys={checkedKeys}
          onCheck={(keys) => setCheckedKeys(Array.isArray(keys) ? keys : keys.checked)}
        />
      </Modal>

      {/* 角色详情抽屉 */}
      <Drawer
        open={!!selected}
        title="角色详情"
        width={640}
        onClose={() => clearSelected()}
      >
        {selected && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{selected.role.name}</span>
                <Tag color={selected.role.isSystem ? 'red' : 'blue'}>
                  {selected.role.isSystem ? '系统内置' : '自定义'}
                </Tag>
              </Space>
              <div style={{ color: '#8c8c8c', marginTop: 4 }}>{selected.role.code}</div>
              {selected.role.description && (
                <div style={{ marginTop: 8 }}>{selected.role.description}</div>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                已分配权限（{selected.role.permissionCodes.length}）
              </div>
              <Space size={4} wrap>
                {selected.role.permissionCodes.map((c) => (
                  <Tag key={c} color="blue">
                    {c}
                  </Tag>
                ))}
                {selected.role.permissionCodes.length === 0 && (
                  <span style={{ color: '#8c8c8c' }}>暂无权限</span>
                )}
              </Space>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                关联用户（{selected.users.length}）
              </div>
              <Table
                rowKey="id"
                size="small"
                dataSource={selected.users}
                pagination={{ pageSize: 8 }}
                columns={[
                  { title: '姓名', dataIndex: 'realName' },
                  { title: '用户名', dataIndex: 'username' },
                  { title: '科室', dataIndex: 'department', render: (v: string | null) => v ?? '—' },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    render: (s: string) => (
                      <Tag color={s === 'active' ? 'success' : 'default'}>{s}</Tag>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Drawer>
    </Watermark>
  );
}
