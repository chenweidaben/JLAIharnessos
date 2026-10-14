/**
 * 健澜科技 jlmedaios - 电子病历模板管理页面
 *
 * 模板列表（按分类筛选）+ 新建/编辑弹窗 +「快速插入」（复制模板正文到剪贴板）。
 * 真实 BFF，不使用假数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Empty,
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
  Typography,
  message,
} from 'antd';
import {
  CopyOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useEmrTemplateStore } from '@/store/emrTemplateStore';
import type { EmrTemplate } from '@/services/api/emrTemplate';

const { Header, Content } = Layout;
const { TextArea } = Input;
const { Title, Paragraph } = Typography;

interface FormValues {
  name: string;
  category: string;
  content: string;
}

export default function EmrTemplatePage() {
  const {
    templates,
    categories,
    activeCategory,
    loading,
    submitting,
    error,
    success,
    setCategory,
    loadTemplates,
    createTemplate,
    updateTemplate,
    removeTemplate,
    clearMessages,
  } = useEmrTemplateStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmrTemplate | null>(null);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (success) {
      message.success(success);
      clearMessages();
    }
    if (error) {
      message.error(error);
      clearMessages();
    }
  }, [success, error, clearMessages]);

  /** 前端按分类筛选（空串=全部）。 */
  const filtered = useMemo(() => {
    if (!activeCategory) return templates;
    return templates.filter((t) => (t.category || '未分类') === activeCategory);
  }, [templates, activeCategory]);

  /** 「快速插入」：复制模板正文到剪贴板。 */
  const quickInsert = async (record: EmrTemplate) => {
    try {
      await navigator.clipboard.writeText(record.content ?? '');
      message.success(`已复制模板「${record.name}」到剪贴板，可直接粘贴到病历`);
    } catch {
      // 兼容非安全上下文：降级用临时 textarea + execCommand。
      const ta = document.createElement('textarea');
      ta.value = record.content ?? '';
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        message.success(`已复制模板「${record.name}」到剪贴板`);
      } catch {
        message.error('复制失败，请手动选择正文复制');
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ name: '', category: '', content: '' });
    setModalOpen(true);
  };

  const openEdit = (record: EmrTemplate) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      category: record.category || '未分类',
      content: record.content ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const ok = editing
      ? await updateTemplate(editing.id, values)
      : await createTemplate(values);
    if (ok) setModalOpen(false);
  };

  const columnCategoryOptions = categories.map((c) => ({ label: c, value: c }));

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (category: string) => <Tag color="blue">{category || '未分类'}</Tag>,
    },
    {
      title: '正文预览',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Paragraph type="secondary" style={{ marginBottom: 0 }} ellipsis>
          {content || '（空）'}
        </Paragraph>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: (_: unknown, record: EmrTemplate) => (
        <Space>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<CopyOutlined />}
            onClick={() => void quickInsert(record)}
          >
            快速插入
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="删除模板"
            description={`确定删除「${record.name}」？`}
            onConfirm={() => void removeTemplate(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100%' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          电子病历模板
        </Title>
        <Space>
          <Select
            style={{ minWidth: 180 }}
            placeholder="按分类筛选"
            allowClear
            value={activeCategory || undefined}
            onChange={(v) => setCategory(v ?? '')}
            options={[
              { label: '全部分类', value: '' },
              ...columnCategoryOptions,
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => void loadTemplates()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建模板
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Spin spinning={loading}>
            {filtered.length === 0 && !loading ? (
              <Empty description="暂无模板，点击右上角「新建模板」创建" />
            ) : (
              <Table
                rowKey="id"
                columns={columns}
                dataSource={filtered}
                pagination={{ pageSize: 10, showSizeChanger: false }}
              />
            )}
          </Spin>
        </Card>
      </Content>

      <Modal
        title={editing ? '编辑模板' : '新建模板'}
        open={modalOpen}
        onOk={() => void handleSubmit()}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="如：入院记录（通用）" maxLength={100} />
          </Form.Item>
          <Form.Item label="分类" name="category">
            <AutoComplete
              placeholder="选择已有分类或输入新分类"
              options={columnCategoryOptions}
            />
          </Form.Item>
          <Form.Item label="正文内容" name="content">
            <TextArea rows={10} placeholder="粘贴病历模板正文，支持占位符" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
