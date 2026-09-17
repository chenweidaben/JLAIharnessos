/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 权限管理：权限树表格 / 新增编辑 / 角色×权限矩阵
 */
import { useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { flatPermissions, permissionTree, roles } from '@/mock/authMock';
import type { PermissionNode, PermissionType } from '@/types/auth';

const TYPE_MAP: Record<PermissionType, { label: string; color: string }> = {
  menu: { label: '菜单', color: 'blue' },
  button: { label: '按钮', color: 'green' },
  data: { label: '数据', color: 'orange' },
  api: { label: 'API', color: 'purple' },
};

interface PermFormState {
  name: string;
  code: string;
  type: PermissionType;
  path?: string;
  component?: string;
  sort: number;
  visible: boolean;
  status: 'enabled' | 'disabled';
}

export default function PermissionManagementPage() {
  const { message } = AntdApp.useApp();
  const [tree] = useState<PermissionNode[]>(permissionTree);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PermissionNode | null>(null);
  const [form] = Form.useForm<PermFormState>();

  const treeTableData = useMemo(
    () =>
      tree.map((mod) => ({
        ...mod,
        children: (mod.children ?? []).map((c) => ({ ...c, parentId: mod.id })),
      })),
    [tree],
  );

  const openEdit = (p?: PermissionNode) => {
    setEditing(p ?? null);
    form.setFieldsValue(
      p
        ? {
            name: p.name,
            code: p.code,
            type: p.type,
            path: p.path,
            component: p.component,
            sort: p.sort,
            visible: p.visible,
            status: p.status,
          }
        : { type: 'button', sort: 100, visible: true, status: 'enabled' },
    );
    setModalOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    if (editing) {
      message.success(`权限「${v.name}」已更新`);
    } else {
      message.success(`权限「${v.name}」已创建`);
    }
    setModalOpen(false);
  };

  const columns: ColumnsType<PermissionNode> = [
    { title: '权限名称', dataIndex: 'name' },
    {
      title: '权限编码',
      dataIndex: 'code',
      render: (c: string) => <code style={{ fontSize: 12 }}>{c}</code>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (t: PermissionType) => <Tag color={TYPE_MAP[t].color}>{TYPE_MAP[t].label}</Tag>,
    },
    { title: '所属模块', dataIndex: 'module', width: 120 },
    {
      title: '路由/组件',
      render: (_: unknown, r) => r.path ?? r.component ?? '-',
      width: 180,
      ellipsis: true,
    },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => (
        <Tag color={s === 'enabled' ? 'success' : 'default'}>
          {s === 'enabled' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      width: 200,
      render: (_: unknown, r) => (
        <Space size={2}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          {r.type === 'menu' && (
            <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => openEdit()}>
              新增子权限
            </Button>
          )}
          <Popconfirm title="确认删除该权限？" onConfirm={() => message.success('已删除')}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const matrixData = useMemo(
    () => flatPermissions.map((p) => ({ key: p.code, name: p.name, code: p.code })),
    [],
  );
  const roleCols = useMemo(
    () =>
      roles.map((r) => ({
        title: r.name,
        dataIndex: r.code,
        key: r.code,
        width: 90,
        align: 'center' as const,
        render: (_: unknown, row: { code: string }) =>
          r.permissionCodes.includes('*') || r.permissionCodes.includes(row.code) ? (
            <Tag color="green">✓</Tag>
          ) : (
            <span style={{ color: '#d9d9d9' }}>—</span>
          ),
      })),
    [],
  );

  const treeTab = (
    <Table<PermissionNode>
      rowKey="id"
      size="middle"
      columns={columns}
      dataSource={treeTableData}
      pagination={false}
      defaultExpandAllRows
    />
  );

  const matrixTab = (
    <div className="jl-card" style={{ padding: 8, overflow: 'auto' }}>
      <Table
        rowKey="key"
        size="small"
        columns={[{ title: '权限', dataIndex: 'name', width: 200 }, ...roleCols]}
        dataSource={matrixData}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );

  return (
    <PageContainer
      title="权限管理"
      description={`共 ${flatPermissions.length} 个权限点，按菜单 / 按钮 / 数据 / API 分类`}
      extra={
        <>
          <Button onClick={() => message.info('权限导入（演示）')}>导入</Button>
          <Button onClick={() => message.success('权限导出成功')}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>
            新增权限
          </Button>
        </>
      }
    >
      <Tabs
        items={[
          { key: 'tree', label: '权限树', children: treeTab },
          { key: 'matrix', label: '角色-权限矩阵', children: matrixTab },
        ]}
      />

      <Modal
        open={modalOpen}
        title={editing ? `编辑权限 - ${editing.name}` : '新增权限'}
        onCancel={() => setModalOpen(false)}
        onOk={onSave}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="权限名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="code"
            label="权限编码"
            rules={[{ required: true, message: '如 patient:view' }]}
          >
            <Input placeholder="module:action" />
          </Form.Item>
          <Form.Item name="type" label="权限类型" rules={[{ required: true }]}>
            <Select
              options={Object.entries(TYPE_MAP).map(([value, v]) => ({ value, label: v.label }))}
            />
          </Form.Item>
          <Form.Item name="path" label="路由路径">
            <Input placeholder="/system/users" />
          </Form.Item>
          <Form.Item name="component" label="组件路径">
            <Input placeholder="pages/UserManagementPage" />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="visible" label="是否显示在菜单">
            <Select
              options={[
                { value: true, label: '显示' },
                { value: false, label: '隐藏' },
              ]}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 'enabled', label: '启用' },
                { value: 'disabled', label: '禁用' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
