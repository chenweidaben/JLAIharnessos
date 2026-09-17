/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 机构管理：医院信息 + 科室管理 + 病区床位管理
 */
import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApartmentOutlined } from '@ant-design/icons';
import type { Organization, Department, Bed } from '@/types/system';
import { useSystemStore } from '@/store/systemStore';

export default function OrganizationManagement() {
  const {
    organization,
    departments,
    wards,
    fetchOrganization,
    fetchDepartments,
    fetchWards,
    updateOrganization,
    updateDepartment,
    deleteDepartment,
  } = useSystemStore();

  const [tab, setTab] = useState('info');
  const [orgForm] = Form.useForm();
  const [deptForm] = Form.useForm();
  const [deptEditOpen, setDeptEditOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  useEffect(() => {
    void fetchOrganization();
    void fetchDepartments();
    void fetchWards();
  }, [fetchOrganization, fetchDepartments, fetchWards]);

  useEffect(() => {
    if (organization) orgForm.setFieldsValue(organization);
  }, [organization, orgForm]);

  const handleOrgSave = async () => {
    const values = await orgForm.validateFields();
    await updateOrganization(values as Partial<Organization>);
    message.success('机构信息已保存');
  };

  const openDeptEdit = (dept?: Department) => {
    setEditingDept(dept ?? null);
    deptForm.setFieldsValue(
      dept ?? {
        name: '',
        code: '',
        type: '临床',
        director: '',
        bedCount: 0,
        location: '',
        status: 'enabled',
        sort: departments.length + 1,
      },
    );
    setDeptEditOpen(true);
  };

  const handleDeptSave = async () => {
    const values = await deptForm.validateFields();
    await updateDepartment({ id: editingDept?.id ?? `d_${Date.now()}`, ...values } as Department);
    message.success('科室信息已保存');
    setDeptEditOpen(false);
  };

  const deptColumns: ColumnsType<Department> = [
    { title: '科室名称', dataIndex: 'name', width: 140 },
    { title: '编码', dataIndex: 'code', width: 90 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (t: string) => (
        <Tag
          color={
            t === '临床' ? 'blue' : t === '医技' ? 'cyan' : t === '行政' ? 'purple' : 'default'
          }
        >
          {t}
        </Tag>
      ),
    },
    { title: '主任', dataIndex: 'director', width: 100 },
    { title: '护士长', dataIndex: 'nurseHead', width: 100 },
    { title: '床位数', dataIndex: 'bedCount', width: 80 },
    { title: '位置', dataIndex: 'location', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) => (
        <Tag color={s === 'enabled' ? 'green' : 'red'}>{s === 'enabled' ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, r) => (
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openDeptEdit(r)}
          />
          <Popconfirm title="确认删除该科室？" onConfirm={() => void deleteDepartment(r.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const bedColumns: ColumnsType<Bed> = [
    { title: '床号', dataIndex: 'bedNo', width: 80 },
    { title: '病房', dataIndex: 'roomNo', width: 80 },
    { title: '类型', dataIndex: 'bedType', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => (
        <Tag
          color={
            s === '空闲' ? 'green' : s === '占用' ? 'red' : s === '消毒中' ? 'orange' : 'default'
          }
        >
          {s}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="m-0 text-lg font-semibold text-ink-primary">机构管理</h2>
        <p className="mt-1 mb-0 text-sm text-ink-secondary">医院基本信息、科室架构、病区床位管理</p>
      </div>

      <Card className="shadow-card">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'info',
              label: (
                <span>
                  <ApartmentOutlined /> 医院信息
                </span>
              ),
              children: (
                <Form form={orgForm} layout="vertical">
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item name="name" label="医院名称" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                      <Form.Item name="level" label="医院等级">
                        <Select
                          options={['三级甲等', '三级乙等', '二级甲等', '二级乙等'].map((v) => ({
                            label: v,
                            value: v,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item name="type" label="医院类型">
                        <Input />
                      </Form.Item>
                      <Form.Item name="address" label="医院地址">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="phone" label="联系电话">
                        <Input />
                      </Form.Item>
                      <Form.Item name="email" label="邮箱">
                        <Input />
                      </Form.Item>
                      <Form.Item name="president" label="院长">
                        <Input />
                      </Form.Item>
                      <Form.Item name="partySecretary" label="党委书记">
                        <Input />
                      </Form.Item>
                      <Form.Item name="bedCount" label="床位数">
                        <InputNumber className="w-full" />
                      </Form.Item>
                      <Form.Item name="staffCount" label="职工数">
                        <InputNumber className="w-full" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="description" label="医院简介">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Button type="primary" onClick={handleOrgSave}>
                    保存机构信息
                  </Button>
                </Form>
              ),
            },
            {
              key: 'dept',
              label: (
                <span>
                  <ApartmentOutlined /> 科室管理
                </span>
              ),
              children: (
                <div>
                  <div className="mb-3 flex justify-end">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openDeptEdit()}>
                      新增科室
                    </Button>
                  </div>
                  <Table<Department>
                    rowKey="id"
                    size="middle"
                    columns={deptColumns}
                    dataSource={departments}
                    scroll={{ x: 900 }}
                    pagination={{ pageSize: 12 }}
                  />
                </div>
              ),
            },
            {
              key: 'ward',
              label: (
                <span>
                  <ApartmentOutlined /> 病区管理
                </span>
              ),
              children: (
                <Tabs
                  type="card"
                  items={wards.slice(0, 8).map((w) => ({
                    key: w.id,
                    label: `${w.name} (${w.bedCount}床)`,
                    children: (
                      <div>
                        <div className="mb-2 text-sm text-ink-secondary">
                          {w.building} {w.floor} · 护士长：{w.nurseHead}
                        </div>
                        <Table<Bed>
                          rowKey="bedNo"
                          size="small"
                          columns={bedColumns}
                          dataSource={w.beds}
                          pagination={{ pageSize: 20, showSizeChanger: true }}
                        />
                      </div>
                    ),
                  }))}
                />
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        open={deptEditOpen}
        onClose={() => setDeptEditOpen(false)}
        width={480}
        title={editingDept ? '编辑科室' : '新增科室'}
        extra={
          <Space>
            <Button onClick={() => setDeptEditOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleDeptSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={deptForm} layout="vertical">
          <Form.Item name="name" label="科室名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="科室编码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="科室类型">
            <Select
              options={['临床', '医技', '行政', '后勤'].map((v) => ({ label: v, value: v }))}
            />
          </Form.Item>
          <Form.Item name="director" label="主任">
            <Input />
          </Form.Item>
          <Form.Item name="nurseHead" label="护士长">
            <Input />
          </Form.Item>
          <Form.Item name="bedCount" label="床位数">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="location" label="位置">
            <Input />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
