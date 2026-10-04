/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 用户管理：列表 / 搜索筛选 / 新增编辑 / 分配角色与数据范围 /
 * 启禁用休假 / 重置密码 / 详情抽屉。真实 BFF + PostgreSQL，无 mock。
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  App as AntdApp,
  Avatar,
  Button,
  Drawer,
  Form,
  Input,
  Layout,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Watermark,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';

import DemoModeBanner from '@/components/common/DemoModeBanner';
import {
  ADMIN_ROLE_OPTIONS,
  useUserAdminStore,
} from '@/store/userAdminStore';
import type {
  AdminDataScope,
  AdminRoleCode,
  AdminUser,
  AdminUserStatus,
} from '@/types/adminUser';

const { Header, Content } = Layout;

const STATUS_MAP: Record<AdminUserStatus, { label: string; color: string }> = {
  active: { label: '在职', color: 'success' },
  leave: { label: '休假', color: 'warning' },
  locked: { label: '锁定', color: 'default' },
  disabled: { label: '禁用', color: 'error' },
};

const SCOPE_OPTIONS: { value: AdminDataScope; label: string }[] = [
  { value: 'all', label: '全部数据' },
  { value: 'hospital', label: '全院' },
  { value: 'department', label: '本科室' },
  { value: 'self', label: '仅本人' },
];

const DEPT_OPTIONS = [
  '内科', '外科', '急诊科', '呼吸与危重症医学科', '心血管内科', '消化内科',
  '神经内科', '骨科', '普外科', '妇产科', '儿科', '药剂科', '检验科',
  '放射科', '超声科', '麻醉科', '重症医学科', '康复科', '眼科', '耳鼻喉科',
  '门诊部', '信息科', '医务科', '护理部', '病案室',
];

interface UserFormValues {
  username: string;
  password?: string;
  realName: string;
  employeeNo?: string;
  gender: 'male' | 'female' | 'unknown';
  deptCode?: string;
  title?: string;
  position?: string;
  phone?: string;
  email?: string;
  status: AdminUserStatus;
  roleCodes: AdminRoleCode[];
  dataScope: AdminDataScope;
}

export default function UserManagementPage() {
  const { message } = AntdApp.useApp();
  const {
    dbUp, healthChecking, users, total, loading, acting,
    page, pageSize,
    checkHealth, loadUsers, setFilter, setPage,
    createUser, updateUser, changeStatus, resetPassword,
  } = useUserAdminStore();

  const [ready, setReady] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [dept, setDept] = useState<string>();
  const [status, setStatus] = useState<AdminUserStatus>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [drawerUser, setDrawerUser] = useState<AdminUser | null>(null);
  const [form] = Form.useForm<UserFormValues>();

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadUsers();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deptOptions = (() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      if (u.deptCode) map.set(u.deptCode, u.deptCode);
    });
    DEPT_OPTIONS.forEach((d) => map.set(d, d));
    return [...map.keys()].map((value) => ({ value, label: value }));
  })();

  const doSearch = () => {
    setFilter({
      keyword: keyword.trim() || undefined,
      deptCode: dept,
      status,
    });
  };

  const doReset = () => {
    setKeyword('');
    setDept(undefined);
    setStatus(undefined);
    setFilter({ keyword: undefined, deptCode: undefined, status: undefined });
  };

  const openEdit = (record?: AdminUser) => {
    setEditing(record ?? null);
    if (record) {
      const firstScope = record.roleCodes[0]
        ? record.roleScopes[record.roleCodes[0]]
        : 'department';
      form.setFieldsValue({
        username: record.username,
        realName: record.realName,
        employeeNo: record.employeeNo ?? undefined,
        gender: record.gender,
        deptCode: record.deptCode ?? undefined,
        title: record.title ?? undefined,
        position: record.position ?? undefined,
        phone: record.phone ?? undefined,
        email: record.email ?? undefined,
        status: record.status,
        roleCodes: [...record.roleCodes],
        dataScope: firstScope ?? 'department',
      });
    } else {
      form.setFieldsValue({
        gender: 'male',
        status: 'active',
        roleCodes: ['doctor'],
        dataScope: 'department',
      });
    }
    setModalOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    const roles = values.roleCodes.map((code) => ({
      roleCode: code,
      dataScope: values.dataScope,
    }));
    let okAction = false;
    if (editing) {
      okAction = await updateUser(editing.id, {
        realName: values.realName,
        employeeNo: values.employeeNo ?? null,
        gender: values.gender,
        deptCode: values.deptCode ?? null,
        title: values.title ?? null,
        position: values.position ?? null,
        phone: values.phone ?? null,
        email: values.email ?? null,
        status: values.status,
        roles,
      });
      if (okAction) message.success('用户信息已更新');
    } else {
      if (!values.password) {
        message.error('请设置初始密码');
        return;
      }
      okAction = await createUser({
        username: values.username,
        password: values.password,
        realName: values.realName,
        employeeNo: values.employeeNo ?? null,
        gender: values.gender,
        deptCode: values.deptCode ?? null,
        title: values.title ?? null,
        position: values.position ?? null,
        phone: values.phone ?? null,
        email: values.email ?? null,
        status: values.status,
        roles,
      });
      if (okAction) message.success('用户已创建');
    }
    if (okAction) setModalOpen(false);
  };

  const onResetPassword = (u: AdminUser) => {
    resetPassword(u.id, 'Admin@123456').then((okAction) => {
      if (okAction) message.success(`已重置 ${u.username} 的密码为初始密码并强制下线`);
    });
  };

  const columns: ColumnsType<AdminUser> = [
    {
      title: '用户',
      render: (_, u) => (
        <Space>
          <Avatar style={{ backgroundColor: '#0A4D8C' }}>{u.realName[0]}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{u.realName}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {u.username}
              {u.employeeNo ? ` · ${u.employeeNo}` : ''}
            </div>
          </div>
        </Space>
      ),
    },
    { title: '科室', dataIndex: 'deptCode', width: 130, render: (v: string | null) => v ?? '—' },
    { title: '职称', dataIndex: 'title', width: 110, render: (v: string | null) => v ?? '—' },
    {
      title: '角色',
      dataIndex: 'roleCodes',
      render: (codes: string[]) => (
        <Space size={4} wrap>
          {codes.map((c) => (
            <Tag key={c} color="blue">
              {ADMIN_ROLE_OPTIONS.find((r) => r.code === c)?.name ?? c}
            </Tag>
          ))}
        </Space>
      ),
    },
    { title: '手机号', dataIndex: 'phone', width: 130, render: (v: string | null) => v ?? '—' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: AdminUserStatus) => <Tag color={STATUS_MAP[s].color}>{STATUS_MAP[s].label}</Tag>,
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      width: 170,
      render: (v: string | null) => (v ? new Date(v).toLocaleString('zh-CN') : '—'),
    },
    {
      title: '操作',
      width: 260,
      fixed: 'right',
      render: (_, u) => (
        <Space size={2} wrap>
          <Button type="link" size="small" onClick={() => setDrawerUser(u)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(u)}>
            编辑
          </Button>
          <Popconfirm
            title="重置密码"
            description="重置为初始密码并强制下线，确认？"
            okText="重置"
            cancelText="取消"
            onConfirm={() => onResetPassword(u)}
          >
            <Button type="link" size="small" icon={<KeyOutlined />}>
              重置密码
            </Button>
          </Popconfirm>
          {u.status === 'active' ? (
            <Button
              type="link"
              size="small"
              danger
              onClick={() =>
                changeStatus(u.id, 'disabled').then((okAction) => {
                  if (okAction) message.success(`已禁用 ${u.username} 并强制下线`);
                })
              }
            >
              禁用
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              onClick={() =>
                changeStatus(u.id, 'active').then((okAction) => {
                  if (okAction) message.success(`已启用 ${u.username}`);
                })
              }
            >
              启用
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Watermark content={['健澜科技', '用户管理', 'jlmedaios']}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <TeamOutlined className="text-2xl text-white" />
            <span className="text-lg font-semibold text-white">
              用户管理 · 账号、角色与数据范围
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="user-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="user-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，用户管理不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充用户数据。"
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() =>
                    void checkHealth().then((up) => {
                      if (up) void loadUsers();
                    })
                  }
                  >
                    刷 新
                  </button>
                }
              />
            ) : (
              <div data-testid="user-content">
                <div className="jl-card mb-4 p-4">
                  <Space wrap>
                    <Input
                      allowClear
                      prefix={<SearchOutlined />}
                      placeholder="姓名 / 用户名 / 工号 / 手机号"
                      style={{ width: 260 }}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onPressEnter={doSearch}
                    />
                    <Select
                      allowClear
                      showSearch
                      placeholder="科室"
                      style={{ width: 160 }}
                      options={deptOptions}
                      value={dept}
                      onChange={setDept}
                    />
                    <Select
                      allowClear
                      placeholder="状态"
                      style={{ width: 120 }}
                      options={Object.entries(STATUS_MAP).map(([value, v]) => ({
                        value,
                        label: v.label,
                      }))}
                      value={status}
                      onChange={setStatus}
                    />
                    <Button type="primary" onClick={doSearch}>
                      查询
                    </Button>
                    <Button
                      data-testid="user-search-reset"
                      icon={<ReloadOutlined />}
                      onClick={doReset}
                    >
                      重置
                    </Button>
                  </Space>
                </div>

                <div className="jl-card mb-3 flex items-center justify-between p-3">
                  <span className="text-sm text-gray-600">共 {total} 个账户</span>
                  <Space>
                    <Button icon={<ReloadOutlined />} loading={loading} onClick={() => loadUsers()}>
                      刷新
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>
                      新增用户
                    </Button>
                  </Space>
                </div>

                <Table<AdminUser>
                  rowKey="id"
                  size="middle"
                  columns={columns}
                  dataSource={users}
                  loading={loading || acting}
                  scroll={{ x: 1280 }}
                  pagination={{
                    current: page,
                    pageSize,
                    total,
                    showTotal: (t) => `共 ${t} 人`,
                    onChange: setPage,
                  }}
                />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>

      {/* 新增/编辑弹窗 */}
      <Modal
        open={modalOpen}
        title={editing ? '编辑用户' : '新增用户'}
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSave()}
        width={680}
        okText="保存"
        cancelText="取消"
        confirmLoading={acting}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="realName"
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input disabled={!!editing} />
            </Form.Item>
            <Form.Item name="employeeNo" label="工号">
              <Input />
            </Form.Item>
            <Form.Item name="gender" label="性别" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'male', label: '男' },
                  { value: 'female', label: '女' },
                  { value: 'unknown', label: '未知' },
                ]}
              />
            </Form.Item>
            <Form.Item name="deptCode" label="科室">
              <Select showSearch options={deptOptions} />
            </Form.Item>
            <Form.Item name="title" label="职称">
              <Input placeholder="如 主治医师" />
            </Form.Item>
            <Form.Item name="position" label="职务">
              <Input placeholder="如 科主任（选填）" />
            </Form.Item>
            <Form.Item name="phone" label="手机号">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="邮箱" rules={[{ type: 'email' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select
                options={Object.entries(STATUS_MAP).map(([value, v]) => ({
                  value,
                  label: v.label,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="roleCodes"
              label="角色分配"
              rules={[{ required: true, message: '请分配角色' }]}
            >
              <Select
                mode="multiple"
                options={ADMIN_ROLE_OPTIONS.map((r) => ({ value: r.code, label: r.name }))}
              />
            </Form.Item>
            <Form.Item name="dataScope" label="数据范围" rules={[{ required: true }]}>
              <Select options={SCOPE_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="password"
              label={editing ? '重置密码（留空不修改）' : '初始密码'}
              rules={editing ? [] : [{ required: true, message: '请设置初始密码' }]}
            >
              <Input.Password placeholder="至少 8 位" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* 用户详情抽屉 */}
      <Drawer
        open={!!drawerUser}
        title="用户详情"
        width={520}
        onClose={() => setDrawerUser(null)}
      >
        {drawerUser && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <Avatar size={56} style={{ backgroundColor: '#0A4D8C' }}>
                {drawerUser.realName[0]}
              </Avatar>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{drawerUser.realName}</div>
                <div style={{ color: '#8c8c8c' }}>
                  {drawerUser.deptCode ?? '—'} · {drawerUser.title ?? '—'}
                </div>
              </div>
            </div>
            <Descriptions user={drawerUser} />
          </>
        )}
      </Drawer>
    </Watermark>
  );
}

function Descriptions({ user }: { user: AdminUser }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: '用户名', value: user.username },
    { label: '工号', value: user.employeeNo ?? '—' },
    { label: '手机号', value: user.phone ?? '—' },
    { label: '邮箱', value: user.email ?? '—' },
    {
      label: '角色',
      value: user.roleCodes.map((c) => (
        <Tag key={c}>{ADMIN_ROLE_OPTIONS.find((r) => r.code === c)?.name ?? c}</Tag>
      )),
    },
    {
      label: '数据范围',
      value: (
        <Space wrap>
          {user.roleCodes.map((c) => (
            <Tag key={c} color="blue">
              {ADMIN_ROLE_OPTIONS.find((r) => r.code === c)?.name ?? c}：
              {SCOPE_OPTIONS.find((s) => s.value === user.roleScopes[c])?.label ??
                user.roleScopes[c]}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      label: 'MFA',
      value: user.mfaEnabled ? '已启用' : '未启用',
    },
    {
      label: '最近登录',
      value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '—',
    },
  ];
  return (
    <div>
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: 'flex',
            padding: '8px 0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ width: 90, color: '#8c8c8c' }}>{row.label}</div>
          <div style={{ flex: 1 }}>{row.value}</div>
        </div>
      ))}
    </div>
  );
}
