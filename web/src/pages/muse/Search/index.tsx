/**
 * 健澜科技 jlmedaios - 全院知识检索（Hospital Muse 搜索，M115-D，依据宪法第七章）
 *
 * 搜索框 + 来源角色筛选 + 科室筛选；结果列表展示来源角色、成功/失败标签、
 * 内容摘要；教训类红色高亮。三态：loading / error / empty。
 * 深海蓝 VI：顶栏 #0A2540，主色 #4A90D9，教训红 #cf1322。
 *
 * 后端权限码：medmuse:view（GET /api/v1/muse/search）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Card, Empty, Input, Layout, Select, Space, Spin, Tag, Typography,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';
const LESSON_RED = '#cf1322';

/** 来源角色白名单（与后端 KnowledgeRole 对齐） */
const ROLE_OPTIONS = [
  { value: '', label: '全部角色' },
  { value: 'doctor', label: '医生' },
  { value: 'nurse', label: '护士' },
  { value: 'pharma', label: '药师' },
  { value: 'admin', label: '行政质控' },
];

/** 科室选项（演示态；生产可由字典接口下发） */
const DEPT_OPTIONS = [
  { value: '', label: '全部科室' },
  { value: 'cardio', label: '心内科 cardio' },
  { value: 'nursing', label: '护理部 nursing' },
  { value: 'pharma', label: '药剂科 pharma' },
  { value: 'admin', label: '行政质控 admin' },
];

/** 来源角色中文映射 */
const ROLE_LABEL: Record<string, string> = {
  doctor: '医生',
  nurse: '护士',
  pharma: '药师',
  admin: '行政质控',
};

/** 单条检索结果（与后端 HospitalSearchResult 对齐） */
interface MuseSearchResult {
  id: string;
  deptCode: string;
  title: string;
  content: string;
  sourceRole: string;
  isLesson: boolean;
  successRate: number;
  usageCount: number;
  score: number;
}

/** 检索响应信封 */
interface MuseSearchResponse {
  query: string;
  total: number;
  results: MuseSearchResult[];
}

/** 内容摘要截断 */
function summarize(text: string, max = 120): string {
  const t = (text ?? '').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export default function MuseSearchPage() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string>('');
  const [dept, setDept] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MuseSearchResponse | null>(null);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (q.trim()) params.q = q.trim();
      if (role) params.role = role;
      if (dept) params.dept = dept;
      const resp = await get<MuseSearchResponse>('/muse/search', params);
      setData(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : '全院知识检索失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [q, role, dept]);

  // 首次进入即加载（浏览态：空关键词返回全院知识）
  useEffect(() => {
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, dept]);

  const results = data?.results ?? [];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>
          全院知识检索 · Hospital Muse
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        <Card style={{ marginBottom: 16 }}>
          <Space wrap size={[12, 12]}>
            <Input.Search
              placeholder="输入关键词，如：双人核对 / 皮试 / 跌倒"
              enterButton="检索"
              size="large"
              style={{ width: 360 }}
              allowClear
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onSearch={() => void runSearch()}
              prefix={<SearchOutlined style={{ color: ACCENT }} />}
            />
            <Select
              value={role}
              onChange={(v) => setRole(v)}
              options={ROLE_OPTIONS}
              style={{ width: 140 }}
              placeholder="来源角色"
            />
            <Select
              value={dept}
              onChange={(v) => setDept(v)}
              options={DEPT_OPTIONS}
              style={{ width: 200 }}
              placeholder="科室"
            />
          </Space>
        </Card>

        {error && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />
        )}

        <Card
          title={
            <span style={{ color: DEEP_BG }}>
              检索结果
              {data && (
                <Text type="secondary" style={{ marginLeft: 12, fontSize: 13 }}>
                  共 {data.total} 条
                </Text>
              )}
            </span>
          }
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Spin size="large" />
              <div style={{ marginTop: 12, color: '#8c8c8c' }}>正在检索全院知识库…</div>
            </div>
          ) : results.length === 0 ? (
            <Empty description="未检索到相关知识，试试其他关键词或放宽筛选条件" />
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {results.map((r) => (
                <Card
                  key={r.id}
                  size="small"
                  style={{
                    borderLeft: `4px solid ${r.isLesson ? LESSON_RED : ACCENT}`,
                    background: r.isLesson ? '#fff1f0' : '#fff',
                  }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space wrap size={8}>
                      <Text strong style={{ color: r.isLesson ? LESSON_RED : DEEP_BG }}>
                        {r.title}
                      </Text>
                      <Tag color={r.isLesson ? 'red' : 'blue'}>
                        {r.isLesson ? '失败经验 · 教训' : '成功经验'}
                      </Tag>
                      <Tag>{ROLE_LABEL[r.sourceRole] ?? r.sourceRole}</Tag>
                      <Tag color="default">{r.deptCode}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        采纳成功率 {(r.successRate * 100).toFixed(0)}% · 使用 {r.usageCount} 次
                      </Text>
                    </Space>
                    <Paragraph style={{ marginBottom: 0, color: '#333' }}>
                      {summarize(r.content)}
                    </Paragraph>
                  </Space>
                </Card>
              ))}
            </Space>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
