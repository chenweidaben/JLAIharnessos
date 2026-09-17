/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 字典管理：左侧分类树 + 右侧字典项表格 + 新增/编辑/导入导出
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tree,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { DictItem } from '@/types/system';
import { useSystemStore } from '@/store/systemStore';

export default function DictManagement() {
  const { dictCategories, dictItems, fetchDict, addDictItem, deleteDictItem } = useSystemStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('dept');
  const [keyword, setKeyword] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<DictItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    void fetchDict();
  }, [fetchDict]);

  const treeData: DataNode[] = useMemo(
    () =>
      dictCategories.map((c) => ({
        key: c.code,
        title: (
          <Space>
            <span>{c.name}</span>
            <Tag color="blue" className="!mr-0">
              {dictItems[c.code]?.length ?? 0}
            </Tag>
          </Space>
        ),
      })),
    [dictCategories, dictItems],
  );

  const items = useMemo(() => {
    const list = dictItems[selectedCategory] ?? [];
    if (!keyword) return list;
    return list.filter(
      (i) =>
        i.dictName.includes(keyword) ||
        i.dictCode.includes(keyword) ||
        i.dictValue.includes(keyword),
    );
  }, [dictItems, selectedCategory, keyword]);

  const openEdit = (item?: DictItem) => {
    setEditing(item ?? null);
    form.setFieldsValue(
      item ?? { dictCode: '', dictName: '', dictValue: '', sort: 1, status: 'enabled', remark: '' },
    );
    setEditOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      message.success('字典项已更新');
    } else {
      await addDictItem(selectedCategory, { id: `new_${Date.now()}`, ...values });
      message.success('字典项已添加');
    }
    setEditOpen(false);
  };

  const columns: ColumnsType<DictItem> = [
    { title: '字典编码', dataIndex: 'dictCode', width: 120 },
    { title: '字典名称', dataIndex: 'dictName', width: 180 },
    { title: '字典值', dataIndex: 'dictValue', width: 100 },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => (
        <Tag color={s === 'enabled' ? 'green' : 'default'}>{s === 'enabled' ? '启用' : '禁用'}</Tag>
      ),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, r) => (
        <Space size={2}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm
            title="确认删除？"
            onConfirm={() => void deleteDictItem(selectedCategory, r.id)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const currentCategory = dictCategories.find((c) => c.code === selectedCategory);

  return (
    <div className="flex gap-3" style={{ minHeight: 600 }}>
      <Card size="small" className="w-64 shrink-0 shadow-card">
        <div className="mb-2 text-sm font-semibold text-ink-primary">字典分类</div>
        <Tree
          treeData={treeData}
          selectedKeys={[selectedCategory]}
          onSelect={(keys) => keys[0] && setSelectedCategory(keys[0] as string)}
        />
      </Card>

      <Card
        className="flex-1 shadow-card"
        title={currentCategory?.name ?? '字典项'}
        extra={
          <Space>
            <Input
              placeholder="搜索字典项"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
            <Button icon={<DownloadOutlined />} onClick={() => message.success('字典已导出')}>
              导出
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => message.success('请选择Excel文件导入')}
            >
              导入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>
              新增字典项
            </Button>
          </Space>
        }
      >
        <Table<DictItem>
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={items}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 15, showSizeChanger: true }}
        />
      </Card>

      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        width={480}
        title={editing ? '编辑字典项' : '新增字典项'}
        extra={
          <Space>
            <Button onClick={() => setEditOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="dictCode" label="字典编码" rules={[{ required: true }]}>
            <Input placeholder="如 DEPT001" />
          </Form.Item>
          <Form.Item name="dictName" label="字典名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dictValue" label="字典值" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
