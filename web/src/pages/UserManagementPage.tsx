/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 用户管理：列表 / 搜索筛选 / 新增编辑 / 分配角色 / 批量操作 / 详情抽屉 / 导入导出
 */
import { useMemo, useState, type Key } from 'react';
import {
  App as AntdApp,
  Avatar,
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
// TODO(P2): 接入真实 API（/system/users、/system/roles）后移除本地 mock
import { manageUsers, roles } from '@/mock/authMock';
import type { DataScope, ManageUser, RoleCode, UserStatus } from '@/types/auth';

const STATUS_MAP: Record<UserStatus, { label: string; color: string }> = {
  active: { label: '在职', color: 'success' },
  leave: { label: '休假', color: 'warning' },
  off: { label: '离职', color: 'default' },
  disabled: { label: '禁用', color: 'error' },
};

export default function UserManagementPage() {
  const { message } = AntdApp.useApp();
  const [list, setList] = useState<ManageUser[]>(manageUsers);
  const [keyword, setKeyword] = useState('');
  const [dept, setDept] = useState<string>();
  const [status, setStatus] = useState<UserStatus>();
  const [selected, setSelected] = useState<Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ManageUser | null>(null);
  const [drawerUser, setDrawerUser] = useState<ManageUser | null>(null);
  const [form] = Form.useForm();

  const deptOptions = useMemo(() => {
    const map = new Map<string, string>();
    list.forEach((u) => map.set(u.deptCode, u.deptName));
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [list]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return list.filter((u) => {
      if (dept && u.deptCode !== dept) return false;
      if (status && u.status !== status) return false;
      if (!kw) return true;
      return (
        u.realName.toLowerCase().includes(kw) ||
        u.username.toLowerCase().includes(kw) ||
        u.employeeNo.toLowerCase().includes(kw) ||
        u.phone.includes(kw)
      );
    });
  }, [list, keyword, dept, status]);

  const openEdit = (record?: ManageUser) => {
    setEditing(record ?? null);
    form.setFieldsValue(
      record ?? {
        gender: 'male',
        status: 'active',
        dataScope: 'self',
      },
    );
    setModalOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      setList((ls) => ls.map((u) => (u.id === editing.id ? { ...u, ...values } : u)));
      message.success('用户信息已更新');
    } else {
      const nu: ManageUser = {
        id: `u_${Date.now()}`,
        username: values.username,
        realName: values.realName,
        employeeNo: values.employeeNo,
        gender: values.gender,
        deptCode: values.deptCode,
        deptName: deptOptions.find((d) => d.value === values.deptCode)?.label ?? values.deptCode,
        title: values.title,
        phone: values.phone,
        email: values.email,
        status: values.status,
        roleCodes: values.roleCodes,
        roleNames: values.roleCodes.map(
          (c: RoleCode) => roles.find((r) => r.code === c)?.name ?? c,
        ),
        dataScope: values.dataScope as DataScope,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      setList((ls) => [nu, ...ls]);
      message.success('用户已创建');
    }
    setModalOpen(false);
  };

  const batchDisable = (disable: boolean) => {
    setList((ls) =>
      ls.map((u) =>
        selected.includes(u.id) ? { ...u, status: disable ? 'disabled' : 'active' } : u,
      ),
    );
    message.success(`已批量${disable ? '禁用' : '启用'} ${selected.length} 个账号`);
    setSelected([]);
  };

  const columns: ColumnsType<ManageUser> = [
    {
      title: '用户',
      render: (_, u) => (
        <Space>
          <Avatar style={{ backgroundColor: '#0A4D8C' }}>{u.realName[0]}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{u.realName}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {u.username} · {u.employeeNo}
            </div>
          </div>
        </Space>
      ),
    },
    { title: '科室', dataIndex: 'deptName', width: 120 },
    { title: '职称', dataIndex: 'title', width: 110 },
    {
      title: '角色',
      dataIndex: 'roleNames',
      render: (names: string[]) => (
        <Space size={4} wrap>
          {names.map((n) => (
            <Tag key={n} color="blue">
              {n}
            </Tag>
          ))}
        </Space>
      ),
    },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: UserStatus) => <Tag color={STATUS_MAP[s].color}>{STATUS_MAP[s].label}</Tag>,
    },
    { title: '最后登录', dataIndex: 'lastLoginAt', width: 170 },
    {
      title: '操作',
      width: 220,
      render: (_, u) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => setDrawerUser(u)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(u)}>
            编辑
          </Button>
          <Popconfirm
            title="确认重置密码？"
            onConfirm={() => message.success(`已向 ${u.username} 发送重置邮件`)}
          >
            <Button type="link" size="small">
              重置密码
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="用户管理"
      description="维护院内医护人员账号、角色分配与在职状态"
      extra={
        <>
          <Button
            icon={<UploadOutlined />}
            onClick={() => message.info('下载 Excel 导入模板（演示）')}
          >
            导入
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => message.success('用户列表已导出')}>
            导出
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>
            新增用户
          </Button>
        </>
      }
    >
      <div className="jl-card" style={{ padding: 16, marginBottom: 16 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="姓名 / 用户名 / 工号 / 手机号"
            style={{ width: 260 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            allowClear
            placeholder="科室"
            style={{ width: 140 }}
            options={deptOptions}
            value={dept}
            onChange={setDept}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 120 }}
            options={Object.entries(STATUS_MAP).map(([value, v]) => ({ value, label: v.label }))}
            value={status}
            onChange={setStatus}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setKeyword('');
              setDept(undefined);
              setStatus(undefined);
            }}
          >
            重置
          </Button>
        </Space>
      </div>

      {selected.length > 0 && (
        <div
          className="jl-card"
          style={{
            padding: '8px 16px',
            marginBottom: 12,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span>已选 {selected.length} 项：</span>
          <Button size="small" onClick={() => batchDisable(true)}>
            批量禁用
          </Button>
          <Button size="small" onClick={() => batchDisable(false)}>
            批量启用
          </Button>
          <Button size="small" onClick={() => message.success('已弹出批量分配角色（演示）')}>
            批量分配角色
          </Button>
          <Button size="small" onClick={() => message.success('已批量重置密码')}>
            批量重置密码
          </Button>
          <Popconfirm
            title={`确认删除 ${selected.length} 个用户？`}
            onConfirm={() => {
              setList((ls) => ls.filter((u) => !selected.includes(u.id)));
              setSelected([]);
              message.success('已删除');
            }}
          >
            <Button size="small" danger icon={<UserDeleteOutlined />}>
              批量删除
            </Button>
          </Popconfirm>
        </div>
      )}

      <Table<ManageUser>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={filtered}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 人` }}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        open={modalOpen}
        title={editing ? '编辑用户' : '新增用户'}
        onCancel={() => setModalOpen(false)}
        onOk={onSave}
        width={640}
        okText="保存"
        cancelText="取消"
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
            <Form.Item
              name="employeeNo"
              label="工号"
              rules={[{ required: true, message: '请输入工号' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="gender" label="性别" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'male', label: '男' },
                  { value: 'female', label: '女' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="deptCode"
              label="科室"
              rules={[{ required: true, message: '请选择科室' }]}
            >
              <Select options={deptOptions} />
            </Form.Item>
            <Form.Item
              name="title"
              label="职称"
              rules={[{ required: true, message: '请输入职称' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="phone"
              label="手机号"
              rules={[{ required: true, message: '请输入手机号' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="email" label="邮箱">
              <Input />
            </Form.Item>
            <Form.Item
              name="roleCodes"
              label="角色分配"
              rules={[{ required: true, message: '请分配角色' }]}
            >
              <Select
                mode="multiple"
                options={roles.map((r) => ({ value: r.code, label: r.name }))}
              />
            </Form.Item>
            <Form.Item name="dataScope" label="数据范围" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'dept', label: '本科室' },
                  { value: 'group', label: '本组' },
                  { value: 'self', label: '本人' },
                ]}
              />
            </Form.Item>
            <Form.Item name="password" label={editing ? '初始密码（留空不修改）' : '初始密码'}>
              <Input.Password placeholder="8-20 位" />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select
                options={Object.entries(STATUS_MAP).map(([value, v]) => ({
                  value,
                  label: v.label,
                }))}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* 用户详情抽屉 */}
      <Drawer open={!!drawerUser} title="用户详情" width={520} onClose={() => setDrawerUser(null)}>
        {drawerUser && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <Avatar size={56} style={{ backgroundColor: '#0A4D8C' }}>
                {drawerUser.realName[0]}
              </Avatar>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{drawerUser.realName}</div>
                <div style={{ color: '#8c8c8c' }}>
                  {drawerUser.deptName} · {drawerUser.title}
                </div>
              </div>
            </div>
            <Form layout="vertical" disabled initialValues={drawerUser}>
              <Form.Item label="工号">
                <Input value={drawerUser.employeeNo} />
              </Form.Item>
              <Form.Item label="手机号">
                <Input value={drawerUser.phone} />
              </Form.Item>
              <Form.Item label="邮箱">
                <Input value={drawerUser.email} />
              </Form.Item>
              <Form.Item label="角色">
                {drawerUser.roleNames.map((n) => (
                  <Tag key={n}>{n}</Tag>
                ))}
              </Form.Item>
              <Form.Item label="数据范围">
                <Select
                  value={drawerUser.dataScope}
                  options={[
                    { value: 'all', label: '全部' },
                    { value: 'dept', label: '本科室' },
                    { value: 'group', label: '本组' },
                    { value: 'self', label: '本人' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="最近登录">{drawerUser.lastLoginAt}</Form.Item>
            </Form>
          </>
        )}
      </Drawer>
    </PageContainer>
  );
}
