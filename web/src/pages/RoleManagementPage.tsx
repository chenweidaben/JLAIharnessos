/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 角色管理：12 种预设角色 + 权限树分配 + 用户分配
 */
import { useMemo, useState, type Key } from 'react';
import {
  App as AntdApp,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tree,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, PlusOutlined, SafetyOutlined, TeamOutlined } from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
// TODO(P2): 接入真实 API（/system/roles、/system/permissions）后移除本地 mock
import { manageUsers, permissionTree, roles as roleMock } from '@/mock/authMock';
import type { Role, RoleLevel, DataScope } from '@/types/auth';

const LEVEL_MAP: Record<RoleLevel, { label: string; color: string }> = {
  system: { label: '系统级', color: 'red' },
  dept: { label: '科室级', color: 'blue' },
  personal: { label: '个人级', color: 'default' },
};

const SCOPE_MAP: Record<DataScope, string> = {
  all: '全部数据',
  dept: '本科室',
  group: '本组',
  self: '仅本人',
};

interface RoleFormState {
  name: string;
  code: string;
  description: string;
  level: RoleLevel;
  dataScope: DataScope;
  status: 'enabled' | 'disabled';
}

export default function RoleManagementPage() {
  const { message } = AntdApp.useApp();
  const [list, setList] = useState<Role[]>(roleMock);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form] = Form.useForm<RoleFormState>();

  const [permOpen, setPermOpen] = useState(false);
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Key[]>([]);

  const [userOpen, setUserOpen] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  /* 权限树 data */
  const treeData = useMemo(
    () =>
      permissionTree.map((mod) => ({
        key: mod.code,
        title: `${mod.name}（${mod.children?.length ?? 0}）`,
        children: (mod.children ?? []).map((c) => ({ key: c.code, title: c.name })),
      })),
    [],
  );

  const openEdit = (r?: Role) => {
    setEditing(r ?? null);
    form.setFieldsValue(
      r
        ? {
            name: r.name,
            code: r.code,
            description: r.description,
            level: r.level,
            dataScope: r.dataScope,
            status: r.status,
          }
        : { level: 'dept', dataScope: 'self', status: 'enabled' },
    );
    setEditOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    if (editing) {
      setList((ls) => ls.map((r) => (r.id === editing.id ? { ...r, ...v, code: r.code } : r)));
      message.success('角色已更新');
    } else {
      setList((ls) => [
        ...ls,
        {
          id: `role_${Date.now()}`,
          code: v.code as Role['code'],
          name: v.name,
          description: v.description,
          level: v.level,
          dataScope: v.dataScope,
          status: v.status,
          userCount: 0,
          permissionCount: 0,
          permissionCodes: [],
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          createdBy: 'admin',
        },
      ]);
      message.success('角色已创建');
    }
    setEditOpen(false);
  };

  const openPerm = (r: Role) => {
    setPermRole(r);
    setCheckedKeys(r.permissionCodes.filter((c) => c !== '*'));
    setPermOpen(true);
  };

  const savePerm = () => {
    if (!permRole) return;
    setList((ls) =>
      ls.map((r) =>
        r.id === permRole.id
          ? {
              ...r,
              permissionCodes: [...checkedKeys.map(String)],
              permissionCount: checkedKeys.length,
            }
          : r,
      ),
    );
    message.success(`已为「${permRole.name}」分配 ${checkedKeys.length} 项权限`);
    setPermOpen(false);
  };

  const openUser = (r: Role) => {
    setUserRole(r);
    setSelectedUsers(manageUsers.filter((u) => u.roleCodes.includes(r.code)).map((u) => u.id));
    setUserOpen(true);
  };

  const columns: ColumnsType<Role> = [
    {
      title: '角色',
      dataIndex: 'name',
      width: 176,
      render: (_, r) => (
        <div style={{ minWidth: 0 }}>
          <div
            style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            title={r.name}
          >
            {r.name}
          </div>
          <div
            style={{ fontSize: 12, color: '#8c8c8c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            title={r.code}
          >
            {r.code}
          </div>
        </div>
      ),
    },
    { title: '描述', dataIndex: 'description', width: 220, ellipsis: true },
    {
      title: '等级',
      dataIndex: 'level',
      width: 100,
      render: (l: RoleLevel) => <Tag color={LEVEL_MAP[l].color}>{LEVEL_MAP[l].label}</Tag>,
    },
    {
      title: '数据范围',
      dataIndex: 'dataScope',
      width: 110,
      render: (s: DataScope) => SCOPE_MAP[s],
    },
    { title: '关联用户', dataIndex: 'userCount', width: 90 },
    { title: '权限数', dataIndex: 'permissionCount', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: 'enabled' | 'disabled') => (
        <Tag color={s === 'enabled' ? 'success' : 'default'}>
          {s === 'enabled' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 160 },
    {
      title: '操作',
      width: 260,
      render: (_, r) => (
        <Space size={2}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<SafetyOutlined />} onClick={() => openPerm(r)}>
            分配权限
          </Button>
          <Button type="link" size="small" icon={<TeamOutlined />} onClick={() => openUser(r)}>
            分配用户
          </Button>
          <Popconfirm
            title="删除角色将解除其下所有用户授权，确认？"
            onConfirm={() => {
              setList((ls) => ls.filter((x) => x.id !== r.id));
              message.success('已删除');
            }}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="角色管理"
      description={`共 ${list.length} 种预设角色，支持权限树分配与用户授权`}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>
          新增角色
        </Button>
      }
    >
      <Table<Role>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={list}
        pagination={false}
        scroll={{ x: 1280 }}
      />

      {/* 新增/编辑角色 */}
      <Modal
        open={editOpen}
        title={editing ? '编辑角色' : '新增角色'}
        onCancel={() => setEditOpen(false)}
        onOk={onSave}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="code"
            label="角色编码"
            rules={[{ required: true, message: '请输入角色编码' }]}
          >
            <Input placeholder="如 chief_physician" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="description" label="角色描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="level" label="角色等级" rules={[{ required: true }]}>
            <Select
              options={Object.entries(LEVEL_MAP).map(([value, v]) => ({ value, label: v.label }))}
            />
          </Form.Item>
          <Form.Item name="dataScope" label="数据范围" rules={[{ required: true }]}>
            <Select
              options={Object.entries(SCOPE_MAP).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配权限 */}
      <Modal
        open={permOpen}
        title={`分配权限 - ${permRole?.name ?? ''}（已选 ${checkedKeys.length} 项）`}
        onCancel={() => setPermOpen(false)}
        onOk={savePerm}
        width={640}
      >
        <Tree
          checkable
          defaultExpandAll
          treeData={treeData}
          checkedKeys={checkedKeys}
          onCheck={(keys) => setCheckedKeys(Array.isArray(keys) ? keys : keys.checked)}
        />
      </Modal>

      {/* 分配用户 */}
      <Modal
        open={userOpen}
        title={`分配用户 - ${userRole?.name ?? ''}`}
        onCancel={() => setUserOpen(false)}
        onOk={() => {
          message.success(`已为「${userRole?.name}」分配 ${selectedUsers.length} 个用户`);
          setUserOpen(false);
        }}
        width={640}
      >
        <Table
          rowKey="id"
          size="small"
          dataSource={manageUsers}
          rowSelection={{
            selectedRowKeys: selectedUsers,
            onChange: (k) => setSelectedUsers(k as string[]),
          }}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '姓名', dataIndex: 'realName' },
            { title: '科室', dataIndex: 'deptName' },
            { title: '工号', dataIndex: 'employeeNo' },
          ]}
        />
      </Modal>
    </PageContainer>
  );
}
