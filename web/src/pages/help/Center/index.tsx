/**
 * 健澜科技 jlmedaios - 系统帮助中心页面（M147-D，生产就绪）
 *
 * 「知识图谱与患者教育」自助入口：顶部深海蓝横幅 + 角色切换 + 关键字检索；
 * 主体按四大板块组织：
 *  - 功能介绍（卡片）、三步操作（编号步骤卡）、常见问题 FAQ（折叠面板）、快捷键（键位表）。
 * 三态完备：loading（Spin）/ error（Alert + 重试）/ empty（Empty）。
 * 数据来源：GET /api/v1/help?role=xxx&q=xxx（真实 BFF，信封已由 @/api 解包）。
 *
 * 深海蓝 VI：主色 #0A4D8C，横幅深底白字。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  Layout,
  Select,
  Spin,
  Steps,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  BookOutlined,
  ConsoleSqlOutlined,
  FieldTimeOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { get } from '@/api';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 主色 */
const DEEP_SEA = '#0A4D8C';

/** 与后端 helpCenterAggregator 对齐的类型 */
interface HelpItem {
  id: string;
  category: 'features' | 'steps' | 'faq' | 'shortcuts';
  title: string;
  body: string;
  tags: string[];
  audience: string[];
  steps?: string[];
  shortcut?: string;
}
interface HelpContent {
  role: string;
  page: string;
  generatedAt: string;
  features: HelpItem[];
  steps: HelpItem[];
  faq: HelpItem[];
  shortcuts: HelpItem[];
  total: number;
}
interface HelpResponse {
  content: HelpContent;
  results: HelpItem[];
}

/** 角色选项 */
const ROLES = [
  { value: 'doctor', label: '医生' },
  { value: 'nurse', label: '护士' },
  { value: 'admin', label: '管理员' },
];

export default function HelpCenterPage() {
  const [role, setRole] = useState<string>('doctor');
  const [content, setContent] = useState<HelpContent | null>(null);
  const [results, setResults] = useState<HelpItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');

  const load = async (r: string, q: string) => {
    setLoading(true);
    setError('');
    try {
      const resp = await get<HelpResponse>('/api/v1/help', { role: r, q });
      setContent(resp.content);
      setResults(resp.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '帮助中心加载失败');
      setContent(null);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(role, keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const searching = keyword.trim().length > 0;

  /** FAQ 折叠面板项 */
  const faqItems = useMemo(
    () =>
      (content?.faq ?? []).map((f) => ({
        key: f.id,
        label: f.title,
        children: (
          <div>
            <Paragraph style={{ marginBottom: 8 }}>{f.body}</Paragraph>
            <div>
              {f.tags.map((t) => (
                <Tag key={t} color="blue">
                  {t}
                </Tag>
              ))}
            </div>
          </div>
        ),
      })),
    [content],
  );

  /** 快捷键表列 */
  const shortcutColumns = [
    {
      title: '功能',
      dataIndex: 'title',
      key: 'title',
      render: (t: string, row: HelpItem) => (
        <div>
          <div>{t}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.body}
          </Text>
        </div>
      ),
    },
    {
      title: '快捷键',
      dataIndex: 'shortcut',
      key: 'shortcut',
      width: 180,
      render: (s: string) => (
        <Tag
          color={DEEP_SEA}
          style={{ fontFamily: 'monospace', fontWeight: 600 }}
        >
          {s}
        </Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* 深海蓝横幅 */}
      <div style={{ background: DEEP_SEA, padding: '24px 32px', color: '#fff' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          <BookOutlined /> 帮助中心
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
          「知识图谱与患者教育」自助入口 · 功能介绍 / 三步操作 / 常见问题 / 快捷键
        </Text>
      </div>

      <Content style={{ padding: 24 }}>
        {/* 工具条：角色切换 + 检索 */}
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Select
            value={role}
            onChange={(v) => setRole(v)}
            options={ROLES}
            style={{ width: 140 }}
          />
          <Input.Search
            placeholder="搜索帮助：处方 / 交班 / 登录 / 快捷键…"
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={(q) => void load(role, q)}
            style={{ maxWidth: 420 }}
          />
          {content && (
            <Text type="secondary">当前角色可见 {content.total} 条帮助</Text>
          )}
        </div>

        {/* loading 态 */}
        {loading && (
          <Card>
            <Spin tip="加载帮助内容…">
              <div style={{ height: 200 }} />
            </Spin>
          </Card>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message="帮助中心加载失败"
            description={error}
            action={
              <Button size="small" onClick={() => void load(role, keyword)}>
                重试
              </Button>
            }
          />
        )}

        {/* empty 态 */}
        {!loading && !error && searching && results.length === 0 && (
          <Card>
            <Empty description={`没有找到与「${keyword}」相关的帮助`} />
          </Card>
        )}
        {!loading && !error && !searching && !content && (
          <Card>
            <Empty description="暂无帮助内容" />
          </Card>
        )}

        {/* 搜索结果（q 非空时只展示结果） */}
        {!loading && !error && searching && results.length > 0 && (
          <Card title={`搜索结果（${results.length}）`}>
            {results.map((r) => (
              <div key={r.id} style={{ marginBottom: 16 }}>
                <Tag color={DEEP_SEA}>{categoryLabel(r.category)}</Tag>
                <Text strong>{r.title}</Text>
                <Paragraph style={{ marginTop: 4, color: 'rgba(0,0,0,0.65)' }}>
                  {r.body}
                </Paragraph>
              </div>
            ))}
          </Card>
        )}

        {/* 全量内容 */}
        {!loading && !error && !searching && content && (
          <>
            {/* 一、功能介绍 */}
            <Card
              title={
                <span>
                  <RocketOutlined /> 功能介绍
                </span>
              }
              style={{ marginBottom: 16 }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 16,
                }}
              >
                {content.features.map((f) => (
                  <Card key={f.id} type="inner" size="small" title={f.title}>
                    <Paragraph style={{ color: 'rgba(0,0,0,0.65)' }}>{f.body}</Paragraph>
                    {f.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </Card>
                ))}
              </div>
            </Card>

            {/* 二、三步操作 */}
            {content.steps.length > 0 && (
              <Card
                title={
                  <span>
                    <FieldTimeOutlined /> 操作步骤 · 三步完成
                  </span>
                }
                style={{ marginBottom: 16 }}
              >
                {content.steps.map((s) => (
                  <div key={s.id} style={{ marginBottom: 24 }}>
                    <Text strong>{s.title}</Text>
                    <Paragraph type="secondary" style={{ marginTop: 4 }}>
                      {s.body}
                    </Paragraph>
                    <Steps
                      direction="vertical"
                      size="small"
                      items={(s.steps ?? []).map((st, i) => ({
                        title: `第 ${i + 1} 步`,
                        description: st,
                      }))}
                    />
                  </div>
                ))}
              </Card>
            )}

            {/* 三、常见问题 FAQ */}
            <Card
              title={
                <span>
                  <QuestionCircleOutlined /> 常见问题 FAQ（{content.faq.length}）
                </span>
              }
              style={{ marginBottom: 16 }}
            >
              <Collapse items={faqItems} />
            </Card>

            {/* 四、快捷键 */}
            <Card
              title={
                <span>
                  <ConsoleSqlOutlined /> 快捷键
                </span>
              }
            >
              <Table
                rowKey="id"
                columns={shortcutColumns}
                dataSource={content.shortcuts}
                pagination={false}
                size="middle"
              />
            </Card>
          </>
        )}

        <div
          style={{
            marginTop: 24,
            textAlign: 'center',
            color: 'rgba(0,0,0,0.4)',
            fontSize: 12,
          }}
        >
          © 2026 杭州健澜科技有限公司 · 系统帮助中心 · 「知识图谱与患者教育」
        </div>
      </Content>
    </Layout>
  );
}

/** 类别中文名 */
function categoryLabel(cat: HelpItem['category']): string {
  switch (cat) {
    case 'features':
      return '功能介绍';
    case 'steps':
      return '三步操作';
    case 'faq':
      return '常见问题';
    case 'shortcuts':
      return '快捷键';
    default:
      return cat;
  }
}
