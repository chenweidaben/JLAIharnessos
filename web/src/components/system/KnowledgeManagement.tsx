/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 知识库管理：文档列表/上传/编辑/向量化 + 分类管理 + 检索测试 + 版本管理 + 统计
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tree,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import {
  UploadOutlined,
  SearchOutlined,
  EyeOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import type { KnowledgeDocument, SearchResult, KnowledgeVersion } from '@/types/system';
import { useSystemStore } from '@/store/systemStore';
import { clickableProps } from '@/utils/a11y';

const VECTOR_COLOR: Record<string, string> = {
  pending: 'default',
  processing: 'processing',
  done: 'green',
  failed: 'red',
};
const VECTOR_LABEL: Record<string, string> = {
  pending: '未向量化',
  processing: '向量化中',
  done: '已向量化',
  failed: '失败',
};
const STATUS_COLOR: Record<string, string> = {
  published: 'green',
  draft: 'orange',
  archived: 'default',
};
const STATUS_LABEL: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  archived: '已归档',
};

export default function KnowledgeManagement() {
  const {
    knowledgeCategories,
    knowledgeDocuments,
    knowledgeVersions,
    searchResults,
    fetchKnowledge,
    uploadKnowledge,
    publishKnowledge,
    archiveKnowledge,
    revectorize,
    searchKnowledge,
  } = useSystemStore();

  const [tab, setTab] = useState('list');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [detailDoc, setDetailDoc] = useState<KnowledgeDocument | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.7);
  const [rerank, setRerank] = useState(true);
  const [uploadForm] = Form.useForm();

  useEffect(() => {
    void fetchKnowledge();
  }, [fetchKnowledge]);

  const treeData: DataNode[] = useMemo(() => {
    const nodes: DataNode[] = [{ key: 'all', title: `全部 (${knowledgeDocuments.length})` }];
    knowledgeCategories.forEach((c) => {
      const count = knowledgeDocuments.filter((d) => d.categoryId === c.id).length;
      nodes.push({ key: c.id, title: `${c.name} (${count})` });
    });
    return nodes;
  }, [knowledgeCategories, knowledgeDocuments]);

  const filteredDocs = useMemo(() => {
    return knowledgeDocuments.filter((d) => {
      if (selectedCat !== 'all' && d.categoryId !== selectedCat) return false;
      if (keyword && !d.title.includes(keyword)) return false;
      return true;
    });
  }, [knowledgeDocuments, selectedCat, keyword]);

  const openDetail = (doc: KnowledgeDocument) => {
    setDetailDoc(doc);
    setDetailOpen(true);
  };

  const handleUpload = async () => {
    const values = await uploadForm.validateFields();
    await uploadKnowledge({ ...values, format: 'PDF' });
    message.success('文档上传成功，正在解析...');
    setUploadOpen(false);
    uploadForm.resetFields();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      message.warning('请输入检索内容');
      return;
    }
    setSearching(true);
    await searchKnowledge(searchQuery, topK, threshold);
    setSearching(false);
  };

  const docColumns: ColumnsType<KnowledgeDocument> = [
    {
      title: '文档标题',
      dataIndex: 'title',
      width: 260,
      render: (t: string, r) => (
        <span
          {...clickableProps(() => openDetail(r))}
          style={{ color: '#1677ff', cursor: 'pointer' }}
        >
          {t}
        </span>
      ),
    },
    { title: '来源', dataIndex: 'source', width: 80, render: (s: string) => <Tag>{s}</Tag> },
    { title: '格式', dataIndex: 'format', width: 70 },
    { title: '字数', dataIndex: 'wordCount', width: 90, render: (v: number) => v.toLocaleString() },
    { title: 'Chunk数', dataIndex: 'chunkCount', width: 80 },
    {
      title: '向量化',
      dataIndex: 'vectorStatus',
      width: 110,
      render: (s: string) => <Tag color={VECTOR_COLOR[s]}>{VECTOR_LABEL[s]}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    { title: '版本', dataIndex: 'version', width: 80 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 110 },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, r) => (
        <Space size={2}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} />
          {r.status === 'draft' && (
            <Button type="link" size="small" onClick={() => void publishKnowledge(r.id)}>
              发布
            </Button>
          )}
          {r.status === 'published' && (
            <Button type="link" size="small" danger onClick={() => void archiveKnowledge(r.id)}>
              归档
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<CloudUploadOutlined />}
            onClick={() => void revectorize(r.id)}
            title="重新向量化"
          />
        </Space>
      ),
    },
  ];

  const versionColumns: ColumnsType<KnowledgeVersion> = [
    {
      title: '版本号',
      dataIndex: 'version',
      width: 100,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: '发布时间', dataIndex: 'publishedAt', width: 140 },
    { title: '发布人', dataIndex: 'publishedBy', width: 100 },
    { title: '变更说明', dataIndex: 'changeLog' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, r) => (
        <Button type="link" size="small" onClick={() => message.success(`已回滚到 ${r.version}`)}>
          回滚
        </Button>
      ),
    },
  ];

  const publishedCount = knowledgeDocuments.filter((d) => d.status === 'published').length;
  const totalWords = knowledgeDocuments.reduce((s, d) => s + d.wordCount, 0);
  const totalChunks = knowledgeDocuments.reduce((s, d) => s + d.chunkCount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="m-0 text-lg font-semibold text-ink-primary">知识库管理</h2>
          <p className="mt-1 mb-0 text-sm text-ink-secondary">
            临床指南、药品说明书、医院制度等知识文档的全生命周期管理
          </p>
        </div>
        <Space>
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
            上传文档
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16}>
        {[
          { title: '文档总数', value: knowledgeDocuments.length, suffix: '篇' },
          { title: '已发布', value: publishedCount, suffix: '篇' },
          { title: '总字数', value: (totalWords / 10000).toFixed(1), suffix: '万字' },
          { title: '总Chunk数', value: totalChunks, suffix: '块' },
        ].map((s) => (
          <Col span={6} key={s.title}>
            <Card size="small">
              <div className="text-sm text-ink-secondary">{s.title}</div>
              <div className="mt-1 text-2xl font-semibold">
                {s.value}
                <span className="ml-1 text-sm font-normal text-ink-secondary">{s.suffix}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="shadow-card">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'list',
              label: '文档管理',
              children: (
                <div className="flex gap-3">
                  <Card size="small" className="w-56 shrink-0">
                    <div className="mb-2 text-sm font-semibold">知识分类</div>
                    <Tree
                      treeData={treeData}
                      selectedKeys={[selectedCat]}
                      onSelect={(k) => k[0] && setSelectedCat(k[0] as string)}
                    />
                  </Card>
                  <div className="flex-1">
                    <div className="mb-3 flex items-center justify-between">
                      <Input.Search
                        allowClear
                        placeholder="搜索文档标题"
                        style={{ width: 240 }}
                        onChange={(e) => setKeyword(e.target.value)}
                      />
                    </div>
                    <Table<KnowledgeDocument>
                      rowKey="id"
                      size="middle"
                      columns={docColumns}
                      dataSource={filteredDocs}
                      scroll={{ x: 1000 }}
                      pagination={{ pageSize: 10 }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'search',
              label: '检索测试',
              children: (
                <div>
                  <Card size="small" className="mb-3">
                    <Space direction="vertical" className="w-full">
                      <Input.TextArea
                        rows={3}
                        placeholder="输入检索内容，如：阿司匹林和华法林能否同时使用？"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="flex items-center gap-4 flex-wrap">
                        <span>
                          TopK：
                          <InputNumber
                            size="small"
                            min={1}
                            max={20}
                            value={topK}
                            onChange={(v) => setTopK(v ?? 5)}
                          />
                        </span>
                        <span>
                          相似度阈值：
                          <InputNumber
                            size="small"
                            min={0}
                            max={1}
                            step={0.05}
                            value={threshold}
                            onChange={(v) => setThreshold(v ?? 0.7)}
                          />
                        </span>
                        <Select
                          size="small"
                          value={rerank ? 'on' : 'off'}
                          style={{ width: 100 }}
                          onChange={(v) => setRerank(v === 'on')}
                          options={[
                            { label: '重排序开', value: 'on' },
                            { label: '重排序关', value: 'off' },
                          ]}
                        />
                        <Button
                          type="primary"
                          icon={<SearchOutlined />}
                          loading={searching}
                          onClick={handleSearch}
                        >
                          检索
                        </Button>
                      </div>
                    </Space>
                  </Card>
                  {searchResults.length > 0 && (
                    <Card size="small" title={`检索结果（${searchResults.length}条）`}>
                      {searchResults.map((r: SearchResult, i: number) => (
                        <div
                          key={r.chunkId}
                          className="mb-3 pb-3 border-b border-ink-border last:border-0"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Tag color="blue">#{i + 1}</Tag>
                            <span className="font-medium">{r.docTitle}</span>
                            <Tag color="green">相关度 {(r.score * 100).toFixed(1)}%</Tag>
                            <span className="text-xs text-ink-secondary">{r.source}</span>
                          </div>
                          <p className="m-0 text-sm text-ink-primary">{r.content}</p>
                        </div>
                      ))}
                    </Card>
                  )}
                </div>
              ),
            },
            {
              key: 'version',
              label: '版本管理',
              children: (
                <Table<KnowledgeVersion>
                  rowKey="version"
                  size="middle"
                  columns={versionColumns}
                  dataSource={knowledgeVersions}
                  pagination={false}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 文档详情 */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={640}
        title={detailDoc?.title}
        extra={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
      >
        {detailDoc && (
          <div>
            <Row gutter={16} className="mb-4">
              <Col span={8}>
                <div className="text-xs text-ink-secondary">文档来源</div>
                <div>{detailDoc.source}</div>
              </Col>
              <Col span={8}>
                <div className="text-xs text-ink-secondary">格式</div>
                <div>{detailDoc.format}</div>
              </Col>
              <Col span={8}>
                <div className="text-xs text-ink-secondary">版本</div>
                <div>{detailDoc.version}</div>
              </Col>
              <Col span={8} className="mt-3">
                <div className="text-xs text-ink-secondary">字数</div>
                <div>{detailDoc.wordCount.toLocaleString()}</div>
              </Col>
              <Col span={8} className="mt-3">
                <div className="text-xs text-ink-secondary">Chunk数</div>
                <div>{detailDoc.chunkCount}</div>
              </Col>
              <Col span={8} className="mt-3">
                <div className="text-xs text-ink-secondary">更新时间</div>
                <div>{detailDoc.updatedAt}</div>
              </Col>
            </Row>
            <Card size="small" title="文档分块预览" className="mb-3">
              {(detailDoc.chunks ?? []).map((ch) => (
                <div key={ch.id} className="mb-2 p-2 bg-ink-bg rounded">
                  <div className="text-xs text-ink-secondary mb-1">
                    Chunk #{ch.index} ({ch.tokenCount} tokens)
                  </div>
                  <p className="m-0 text-sm">{ch.content}</p>
                </div>
              ))}
            </Card>
          </div>
        )}
      </Drawer>

      {/* 上传文档 */}
      <Modal
        open={uploadOpen}
        title="上传知识文档"
        onCancel={() => setUploadOpen(false)}
        onOk={handleUpload}
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item name="title" label="文档标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="categoryId" label="所属分类" rules={[{ required: true }]}>
            <Select options={knowledgeCategories.map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="source" label="知识来源">
            <Select
              options={['指南', '药品', '院制', '路径', '文献', '其他'].map((v) => ({
                label: v,
                value: v,
              }))}
            />
          </Form.Item>
          <Form.Item label="文件上传">
            <Button icon={<UploadOutlined />}>选择文件（PDF/Word/Markdown/TXT）</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
