/**
 * 健澜科技 jlmedaios - 系统帮助中心页面（M125-D，演示就绪）
 *
 * 左侧目录（按分节分组）+ 右侧正文；顶部角色切换 + 关键字检索。
 * 三态完备：loading（Spin）/ error（Alert + 重试）/ empty（Empty）。
 * 数据来源：GET /api/v1/help?role=xxx（真实 BFF，信封已由 @/api 解包）。
 *
 * 深海蓝 VI：主色 #0A4D8C，侧栏深底白字。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Layout,
  Select,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  BookOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { get } from '@/api';

const { Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 主色 */
const DEEP_SEA = '#0A4D8C';

/** 与后端 helpCenterAggregator 对齐的类型 */
interface HelpArticle {
  id: string;
  title: string;
  body: string;
  tags: string[];
}
interface HelpSection {
  id: string;
  title: string;
  icon: string;
  audience: string[];
  summary: string;
  articles: HelpArticle[];
}
interface HelpContent {
  role: string;
  generatedAt: string;
  sections: HelpSection[];
  totalArticles: number;
  articles: HelpArticle[];
}
interface HelpResponse {
  content: HelpContent;
  results: unknown[];
}

/** 角色选项 */
const ROLES = [
  { value: 'doctor', label: '医生' },
  { value: 'nurse', label: '护士' },
  { value: 'admin', label: '管理员' },
  { value: 'newbie', label: '新员工' },
];

/** 分节图标名 -> antd 图标组件映射（演示就绪） */
const ICON_MAP: Record<string, React.ReactNode> = {
  rocket: <RocketOutlined />,
  stethoscope: <MedicineBoxOutlined />,
  heart: <HeartOutlined />,
  setting: <SettingOutlined />,
  question: <QuestionCircleOutlined />,
};

export default function HelpCenterPage() {
  const [role, setRole] = useState<string>('doctor');
  const [content, setContent] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [activeArticleId, setActiveArticleId] = useState<string>('');

  const load = async (r: string) => {
    setLoading(true);
    setError('');
    try {
      const resp = await get<HelpResponse>('/api/v1/help', { role: r });
      setContent(resp.content);
      // 默认选中第一节第一篇
      const first = resp.content.sections[0]?.articles[0]?.id ?? '';
      setActiveArticleId((prev) => prev || first);
    } catch (e) {
      setError(e instanceof Error ? e.message : '帮助中心加载失败');
      setContent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  /** 关键字在前端二次过滤（标题/标签/正文）；空关键字返回全部 */
  const filteredSections = useMemo(() => {
    if (!content) return [];
    const q = keyword.trim().toLowerCase();
    if (!q) return content.sections;
    return content.sections
      .map((s) => ({
        ...s,
        articles: s.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.tags.some((t) => t.toLowerCase().includes(q)) ||
            a.body.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.articles.length > 0);
  }, [content, keyword]);

  const activeArticle = useMemo(() => {
    for (const s of filteredSections) {
      const hit = s.articles.find((a) => a.id === activeArticleId);
      if (hit) return { article: hit, section: s };
    }
    return filteredSections[0]?.articles[0]
      ? { article: filteredSections[0].articles[0], section: filteredSections[0] }
      : null;
  }, [filteredSections, activeArticleId]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Sider
        width={280}
        style={{ background: DEEP_SEA, padding: '16px 0', overflow: 'auto' }}
        theme="dark"
      >
        <div style={{ padding: '0 16px 16px', color: '#fff' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            <BookOutlined /> 帮助中心
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
            健澜数智医院 · 演示就绪
          </Text>
        </div>

        <div style={{ padding: '0 16px 12px' }}>
          <Select
            value={role}
            onChange={setRole}
            options={ROLES}
            style={{ width: '100%' }}
            placeholder="选择角色"
          />
        </div>

        {/* 左侧目录 */}
        {filteredSections.map((s) => (
          <div key={s.id} style={{ marginBottom: 8 }}>
            <div
              style={{
                padding: '6px 16px',
                color: 'rgba(255,255,255,0.65)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {ICON_MAP[s.icon] ?? <BookOutlined />} {s.title}
            </div>
            {s.articles.map((a) => (
              <div
                key={a.id}
                onClick={() => setActiveArticleId(a.id)}
                style={{
                  padding: '6px 16px 6px 32px',
                  cursor: 'pointer',
                  color: '#fff',
                  background:
                    activeArticle?.article.id === a.id
                      ? 'rgba(255,255,255,0.18)'
                      : 'transparent',
                }}
              >
                {a.title}
              </div>
            ))}
          </div>
        ))}
      </Sider>

      <Layout>
        <Content style={{ padding: 24 }}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
            <Input.Search
              placeholder="搜索帮助：处方 / 交班 / 登录 / 权限…"
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ maxWidth: 420 }}
            />
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
                <Button size="small" onClick={() => void load(role)}>
                  重试
                </Button>
              }
            />
          )}

          {/* empty 态 */}
          {!loading && !error && (!content || filteredSections.length === 0) && (
            <Card>
              <Empty description={content ? '没有找到相关帮助内容' : '暂无帮助内容'} />
            </Card>
          )}

          {/* 正文 */}
          {!loading && !error && activeArticle && (
            <Card>
              <Tag color={DEEP_SEA}>{activeArticle.section.title}</Tag>
              <Title level={3} style={{ marginTop: 12 }}>
                {activeArticle.article.title}
              </Title>
              <Paragraph style={{ color: 'rgba(0,0,0,0.65)' }}>
                {activeArticle.section.summary}
              </Paragraph>
              <Paragraph style={{ lineHeight: 1.9 }}>{activeArticle.article.body}</Paragraph>
              <div style={{ marginTop: 16 }}>
                {activeArticle.article.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </Card>
          )}

          <div
            style={{
              marginTop: 24,
              textAlign: 'center',
              color: 'rgba(0,0,0,0.4)',
              fontSize: 12,
            }}
          >
            © 2026 杭州健澜科技有限公司 · 系统帮助中心（演示就绪）
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
