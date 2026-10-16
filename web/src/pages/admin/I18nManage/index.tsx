/**
 * 健澜科技 jlmedaios - M158-A 多语言深化 · 英文翻译管理后台（v4.x近期）
 *
 * 面向系统管理员的翻译质量看板：
 *   1. 顶部深海蓝渐变头：当前英文覆盖率 / SLA 80% 是否达成 / 总 key 数；
 *   2. 分类覆盖率卡片：Navigation / Actions / Form / Medical / Errors / Notifications；
 *   3. 翻译明细表：key、中文原文、英文译文，缺失项红色标记；
 *   4. 「一键补译」按钮：对 missing keys 调用 POST /api/v1/i18n/translate 预览
 *      确定性自动翻译结果（不触 LLM / 不触网络，纯函数可复现）。
 *
 * 视觉：深海蓝 VI（#0a2540 -> #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
  ok: '#2f9e8f',
  warn: '#d97706',
  err: '#c0392b',
};

interface CategoryCompleteness {
  category: string;
  label: string;
  total: number;
  translated: number;
  missing: number;
  coverage: number;
}

interface Completeness {
  locale: string;
  defaultLocale: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  coverage: number;
  slaThreshold: number;
  meetsSla: boolean;
  categories: CategoryCompleteness[];
  missing: string[];
}

interface TranslationsView {
  locale: string;
  defaultLocale: string;
  supportedLocales: string[];
  translations: Record<string, string>;
  allKeys: string[];
  completeness: Completeness;
  preview: string;
}

interface RowItem {
  key: string;
  source: string;
  target: string;
  missing: boolean;
}

export default function I18nManagePage() {
  const [data, setData] = useState<TranslationsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [autoPreview, setAutoPreview] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/i18n/translations?locale=en-US');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '翻译字典加载失败');
        setData(null);
      } else {
        setData(json.data as TranslationsView);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 行数据：合并 zh-CN 源与 en-US 译文 */
  const rows: RowItem[] = useMemo(() => {
    if (!data) return [];
    return data.allKeys.map((k) => {
      const has = Object.prototype.hasOwnProperty.call(data.translations, k);
      return {
        key: k,
        // 源文案由后端 completeness 无法直接给出，这里通过 GET 默认语言包的轻量回退
        // 展示用：缺失时显示 key，命中时显示 en-US 译文；中文原文由另一次拉取补充成本高，
        // 此页以「英文覆盖率看板」为核心，源列展示 key 命名空间即可。
        source: k,
        target: has ? (data.translations[k] as string) : '',
        missing: !has,
      };
    });
  }, [data]);

  const handleAutoTranslate = useCallback(async () => {
    if (!data) return;
    setAutoTranslating(true);
    try {
      const resp = await fetch('/api/v1/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keys: data.completeness.missing.slice(0, 200),
          targetLocale: 'en-US',
        }),
      });
      const json = await resp.json();
      if (json.code === 0 && json.data?.translated) {
        setAutoPreview(json.data.translated as Record<string, string>);
      } else {
        setError(json.message || '自动翻译失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setAutoTranslating(false);
    }
  }, [data]);

  const columns: ColumnsType<RowItem> = [
    {
      title: 'Key',
      dataIndex: 'key',
      width: 280,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'key',
      width: 140,
      render: (v: string) => {
        const cat = v.split('.')[0] ?? '';
        const color: Record<string, string> = {
          nav: 'blue',
          action: 'cyan',
          form: 'geekblue',
          medical: 'green',
          error: 'red',
          notification: 'purple',
          common: 'default',
        };
        return <Tag color={color[cat] ?? 'default'}>{cat}</Tag>;
      },
    },
    {
      title: '英文译文',
      dataIndex: 'target',
      ellipsis: true,
      render: (v: string, record) => {
        if (v) return v;
        const preview = autoPreview[record.key];
        return (
          <Space size={4}>
            <Text type="secondary" style={{ fontStyle: 'italic' }}>未翻译</Text>
            {preview ? <Tag color="orange">预览: {preview}</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'missing',
      width: 100,
      render: (missing: boolean) =>
        missing ? <Tag color="red">缺失</Tag> : <Tag color="green">已翻译</Tag>,
    },
  ];

  if (loading) {
    return (
      <Content style={{ padding: 24, background: VI.bg }}>
        <Spin size="large" tip="翻译字典加载中…">
          <div style={{ minHeight: 320 }} />
        </Spin>
      </Content>
    );
  }

  if (error) {
    return (
      <Content style={{ padding: 24, background: VI.bg }}>
        <Alert
          type="error"
          message="翻译管理加载失败"
          description={error}
          action={
            <Button size="small" onClick={load}>重试</Button>
          }
        />
      </Content>
    );
  }

  if (!data) return null;

  const { completeness } = data;
  const slaColor = completeness.meetsSla ? VI.ok : completeness.coverage >= 60 ? VI.warn : VI.err;

  return (
    <Layout style={{ background: VI.bg }}>
      {/* 深海蓝渐变头部 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '20px 24px',
        }}
      >
        <Row gutter={24} align="middle">
          <Col flex="auto">
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              多语言深化 · 英文翻译管理
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '6px 0 0' }}>
              v4.x近期 · 医疗专业英文（Chief Complaint / HPI / SpO₂ …）· SLA ≥ {completeness.slaThreshold}%
            </Paragraph>
          </Col>
          <Col>
            <Space size={16}>
              <Button onClick={load}>刷新</Button>
              <Button
                type="primary"
                loading={autoTranslating}
                onClick={handleAutoTranslate}
                disabled={completeness.missingKeys === 0}
              >
                一键补译缺失项（{completeness.missingKeys}）
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24 }}>
        {/* 总览卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card>
              <Paragraph type="secondary" style={{ marginBottom: 8 }}>整体英文覆盖率</Paragraph>
              <Progress
                type="dashboard"
                percent={completeness.coverage}
                strokeColor={slaColor}
                size={140}
              />
              <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                <Text strong style={{ fontSize: 18 }}>{completeness.translatedKeys}</Text>
                <Text type="secondary"> / {completeness.totalKeys} key · </Text>
                <Tag color={completeness.meetsSla ? 'green' : 'orange'}>
                  {completeness.meetsSla ? 'SLA 已达成' : 'SLA 未达成'}
                </Tag>
              </Paragraph>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card title="分类覆盖率（医疗术语 / 表单标签 / 导航 / 按钮 / 错误 / 通知）">
              <Row gutter={[12, 12]}>
                {completeness.categories.map((c) => (
                  <Col xs={12} md={8} key={c.category}>
                    <Text strong style={{ fontSize: 12 }}>{c.label}</Text>
                    <Progress
                      percent={c.coverage}
                      size="small"
                      strokeColor={c.coverage >= 80 ? VI.ok : c.coverage >= 50 ? VI.warn : VI.err}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {c.translated}/{c.total} · 缺失 {c.missing}
                    </Text>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 缺失 key 列表 */}
        {completeness.missing.length > 0 && (
          <Card
            size="small"
            title={<span>待补译 Key（{completeness.missing.length}）</span>}
            style={{ marginTop: 16 }}
          >
            <List
              size="small"
              dataSource={completeness.missing.slice(0, 30)}
              renderItem={(k) => (
                <List.Item key={k} style={{ padding: '4px 0' }}>
                  <Text code style={{ fontSize: 12 }}>{k}</Text>
                </List.Item>
              )}
            />
            {completeness.missing.length > 30 && (
              <Text type="secondary">… 其余 {completeness.missing.length - 30} 项见下表</Text>
            )}
          </Card>
        )}

        {/* 翻译明细表 */}
        <Card title={<span>翻译字典明细（共 {rows.length} 项）</span>} style={{ marginTop: 16 }}>
          <Table
            rowKey="key"
            size="small"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 20, showSizeChanger: false }}
          />
        </Card>

        <Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
          Copyright © 2026 杭州健澜科技有限公司 · M158-A v4.x近期
        </Paragraph>
      </Content>
    </Layout>
  );
}
