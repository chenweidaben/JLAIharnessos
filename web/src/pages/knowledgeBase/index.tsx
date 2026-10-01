/**
 * 健澜科技 jlmedaios - 知识库管理页面（M4-A，真实 BFF）
 *
 * 知识库 CRUD、文档摄入（解析、分块、嵌入、索引）、RAG 混合检索（带来源）。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Layout,
  List,
  Modal,
  Radio,
  Row,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { BookOutlined, ReloadOutlined } from '@ant-design/icons';
import { useKnowledgeBaseStore } from '@/store/knowledgeBaseStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import type { KnowledgeBase, RetrievalResult } from '@/types/knowledgeBase';

const { Header, Content } = Layout;
const { TextArea } = Input;

const watermarkText = ['健澜科技', '知识库', 'jlmedaios'];

export default function KnowledgeBasePage() {
  const {
    dbUp,
    healthChecking,
    checkHealth,
    kbs,
    documents,
    selectedKbId,
    results,
    loading,
    submitting,
    error,
    success,
    loadKbs,
    selectKb,
    createKb,
    deleteKb,
    ingestDocument,
    retrieve,
    clearMessages,
  } = useKnowledgeBaseStore();

  const [ready, setReady] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [ingestForm] = Form.useForm();
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadKbs();
      setReady(true);
    })();
  }, [checkHealth, loadKbs]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await loadKbs();
  };

  const onCreate = async () => {
    const values = await createForm.validateFields();
    const ok = await createKb(values);
    if (ok) {
      setCreateOpen(false);
      createForm.resetFields();
    }
  };

  const onIngest = async () => {
    const values = await ingestForm.validateFields();
    const ok = await ingestDocument(values);
    if (ok) ingestForm.resetFields();
  };

  const onRetrieve = async () => {
    if (queryText.trim()) await retrieve(queryText, undefined, 5);
  };

  const onDelete = (kb: KnowledgeBase) => {
    Modal.confirm({
      title: `删除知识库 ${kb.name}？`,
      content: '将同时删除该库下的全部文档与分块，操作不可恢复。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteKb(kb.id),
    });
  };

  const documentColumns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'ready' ? 'green' : s === 'failed' ? 'red' : 'orange'}>{s}</Tag>
      ),
    },
    { title: '作者', dataIndex: 'author', key: 'author', render: (v: string) => v ?? '-' },
    { title: '版本', dataIndex: 'version', key: 'version', render: (v: string) => v ?? '-' },
  ];

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <BookOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              知识库管理 · RAG 知识中台
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              文档摄入 · 分块嵌入 · 向量+关键词混合检索 · 来源可追溯
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="small"
              ghost
              icon={<ReloadOutlined />}
              onClick={() => void onRefresh()}
            >
              刷新
            </Button>
            <Tag color={dbUp ? 'green' : 'red'} data-testid="kb-health-tag">
              {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
            </Tag>
          </div>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {error && (
              <Alert
                className="mb-3"
                type="error"
                showIcon
                message={error}
                closable
                onClose={clearMessages}
              />
            )}
            {success && (
              <Alert
                className="mb-3"
                type="success"
                showIcon
                message={success}
                closable
                onClose={clearMessages}
              />
            )}
            {!dbUp ? (
              <Alert
                data-testid="kb-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，知识库工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充检索结果。"
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() => void onRefresh()}
                  >
                    刷 新
                  </button>
                }
              />
            ) : (
              <div data-testid="kb-content">
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Card
                      title="知识库"
                      size="small"
                      extra={
                        <Button type="link" size="small" onClick={() => setCreateOpen(true)}>
                          新建
                        </Button>
                      }
                    >
                      <List
                        dataSource={kbs}
                        locale={{ emptyText: <Empty description="暂无知识库" /> }}
                        renderItem={(kb) => (
                          <List.Item
                            className={selectedKbId === kb.id ? 'bg-jl-primary/10' : ''}
                            actions={[
                              <Button
                                key="del"
                                type="link"
                                danger
                                size="small"
                                onClick={() => onDelete(kb)}
                              >
                                删除
                              </Button>,
                            ]}
                          >
                            <Space direction="vertical" size={0}>
                              <Button
                                type="link"
                                size="small"
                                style={{ padding: 0, textAlign: 'left' }}
                                onClick={() => void selectKb(kb.id)}
                              >
                                {kb.name}
                              </Button>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {kb.id}
                              </Typography.Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} md={16}>
                    <Tabs
                      defaultActiveKey="docs"
                      items={[
                        {
                          key: 'docs',
                          label: '文档管理',
                          children: (
                            <Space direction="vertical" className="w-full" size="middle">
                              {!selectedKbId ? (
                                <Empty description="请先在左侧选择一个知识库" />
                              ) : (
                                <>
                                  <Card title="摄入文档" size="small">
                                    <Form layout="vertical" form={ingestForm} onFinish={onIngest}>
                                      <Row gutter={12}>
                                        <Col span={12}>
                                          <Form.Item
                                            name="title"
                                            label="标题"
                                            rules={[{ required: true, message: '请输入标题' }]}
                                          >
                                            <Input placeholder="文档标题" />
                                          </Form.Item>
                                        </Col>
                                        <Col span={6}>
                                          <Form.Item name="format" label="格式" initialValue="txt">
                                            <Radio.Group>
                                              <Radio value="txt">文本</Radio>
                                              <Radio value="md">Markdown</Radio>
                                              <Radio value="html">HTML</Radio>
                                              <Radio value="json">JSON</Radio>
                                            </Radio.Group>
                                          </Form.Item>
                                        </Col>
                                        <Col span={6}>
                                          <Form.Item name="author" label="作者">
                                            <Input placeholder="作者（可选）" />
                                          </Form.Item>
                                        </Col>
                                      </Row>
                                      <Form.Item
                                        name="content"
                                        label="正文"
                                        rules={[{ required: true, message: '请输入正文' }]}
                                      >
                                        <TextArea rows={5} placeholder="粘贴文档全文或 Markdown" />
                                      </Form.Item>
                                      <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={submitting}
                                      >
                                        解析并摄入
                                      </Button>
                                    </Form>
                                  </Card>
                                  <Table
                                    size="small"
                                    rowKey="id"
                                    columns={documentColumns}
                                    dataSource={documents}
                                    loading={loading}
                                    pagination={{ pageSize: 5 }}
                                  />
                                </>
                              )}
                            </Space>
                          ),
                        },
                        {
                          key: 'retrieve',
                          label: '检索测试',
                          children: (
                            <Space direction="vertical" className="w-full" size="middle">
                              <Card size="small">
                                <Space.Compact className="w-full">
                                  <Input
                                    placeholder="输入问题，如：二甲双胍的禁忌证是什么？"
                                    value={queryText}
                                    onChange={(e) => setQueryText(e.target.value)}
                                    onPressEnter={() => void onRetrieve()}
                                  />
                                  <Button
                                    type="primary"
                                    loading={loading}
                                    onClick={() => void onRetrieve()}
                                  >
                                    检索
                                  </Button>
                                </Space.Compact>
                              </Card>
                              {results.length === 0 ? (
                                <Empty description="输入问题后检索，结果带来源与相关度" />
                              ) : (
                                <RetrievalResultList results={results} />
                              )}
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </Col>
                </Row>
              </div>
            )}
          </Spin>
        </Content>
      </Layout>

      <Modal
        title="新建知识库"
        open={createOpen}
        onOk={onCreate}
        confirmLoading={submitting}
        onCancel={() => setCreateOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form layout="vertical" form={createForm}>
          <Form.Item
            name="id"
            label="标识"
            rules={[
              { required: true, message: '请输入标识' },
              {
                pattern: /^[a-z0-9][a-z0-9-]{0,63}$/,
                message: '仅允许小写字母、数字、连字符',
              },
            ]}
          >
            <Input placeholder="如 cardiology-notes" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如 心内科笔记库" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="用途说明（可选）" />
          </Form.Item>
          <Form.Item name="authorityLevel" label="权威级别" initialValue="general">
            <Radio.Group>
              <Radio value="general">通用</Radio>
              <Radio value="guideline">指南</Radio>
              <Radio value="textbook">教材</Radio>
              <Radio value="standard">标准</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </Watermark>
  );
}

/** 检索结果列表（卡片式，展示来源与相关度）。 */
function RetrievalResultList({ results }: { results: RetrievalResult[] }) {
  return (
    <Space direction="vertical" className="w-full" data-testid="kb-results">
      {results.map((r) => (
        <Card key={r.chunkId} size="small">
          <Space direction="vertical" size={4} className="w-full">
            <Space wrap>
              <Tag color="blue">{r.documentTitle}</Tag>
              {r.sectionPath && <Tag>{r.sectionPath}</Tag>}
              <Tag color="green">综合 {r.score}</Tag>
              <Tag color="geekblue">向量 {r.vectorScore}</Tag>
              <Tag color="purple">关键词 {r.keywordScore}</Tag>
            </Space>
            <Typography.Paragraph
              style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
              ellipsis={{ rows: 4, expandable: true, symbol: '展开' }}
            >
              {r.content}
            </Typography.Paragraph>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              来源：{r.kbId}
              {r.publisher ? ` · ${r.publisher}` : ''}
              {r.author ? ` · ${r.author}` : ''}
            </Typography.Text>
          </Space>
        </Card>
      ))}
    </Space>
  );
}
