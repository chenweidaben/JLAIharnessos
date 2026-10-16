/**
 * 健澜科技 jlmedaios - M157-B 系统功能全景图页（200版本里程碑，仅 admin）
 *
 * 【生产安全加固】
 *  - 拉取 GET /api/v1/admin/system-map，展示八大领域全量模块与覆盖率；
 *  - 模块状态三色：done 已上线（绿）/ partial 部分实现（橙）/ planned 规划中（灰）；
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading（加载中）/ error（失败可重试）/ empty（空兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  Progress,
  Row,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 模块交付状态 */
type ModuleStatus = 'done' | 'partial' | 'planned';

/** 与 BFF buildSystemMap 输出对齐 */
interface SystemModule {
  key: string;
  name: string;
  status: ModuleStatus;
  description: string;
  surface: string;
}

interface SystemDomain {
  key: string;
  name: string;
  modules: SystemModule[];
}

interface DomainCoverage {
  key: string;
  name: string;
  total: number;
  done: number;
  partial: number;
  planned: number;
  coveragePct: number;
}

interface CoverageStats {
  totalDomains: number;
  totalModules: number;
  done: number;
  partial: number;
  planned: number;
  coveragePct: number;
  byDomain: DomainCoverage[];
}

interface SystemMapResponse {
  version: string;
  milestone: string;
  generatedAt: string;
  company: string;
  domains: SystemDomain[];
  coverage: CoverageStats;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
};

/** 模块状态 → 标签色/文案 */
const STATUS_META: Record<ModuleStatus, { color: string; label: string }> = {
  done: { color: 'green', label: '已上线' },
  partial: { color: 'orange', label: '部分实现' },
  planned: { color: 'default', label: '规划中' },
};

/** 八大领域标题底色（深海蓝系渐进） */
const DOMAIN_HEAD_BG = '#0B2A4A';

export default function SystemMapPage() {
  const [data, setData] = useState<SystemMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/system-map');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载系统全景图失败');
        setData(null);
        return;
      }
      setData(json.data as SystemMapResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const coverage = data?.coverage;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div
          style={{
            borderLeft: `4px solid ${VI.deep}`,
            paddingLeft: 12,
            marginBottom: 16,
          }}
        >
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            系统功能全景图
          </Title>
          <Paragraph type="secondary">
            {data?.milestone ?? '200版本里程碑'} · 覆盖临床 / 护理 / 药事 / 管理 / AI / 平台 / 患者 /
            集团八大领域全部功能模块；仅系统管理员可见。
          </Paragraph>
        </div>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载系统全景图中…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => void load()}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && data && coverage && (
          <>
            {/* 总览指标条 */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={12} sm={6}>
                  <Statistic title="领域数" value={coverage.totalDomains} suffix="个" />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic title="功能模块总数" value={coverage.totalModules} suffix="个" />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="已上线 / 部分 / 规划"
                    value={`${coverage.done} / ${coverage.partial} / ${coverage.planned}`}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Text strong style={{ color: VI.deep }}>
                      全院覆盖率
                    </Text>
                    <Progress
                      type="circle"
                      size={64}
                      percent={coverage.coveragePct}
                      strokeColor={VI.accent}
                    />
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 八大领域卡片 */}
            <Row gutter={[16, 16]}>
              {data.domains.map((domain) => {
                const dc = coverage.byDomain.find((d) => d.key === domain.key);
                return (
                  <Col xs={24} md={12} xl={9} key={domain.key}>
                    <Card
                      size="small"
                      title={
                        <span style={{ color: '#fff' }}>
                          {domain.name}
                          <Text style={{ color: 'rgba(255,255,255,0.75)', marginLeft: 8 }}>
                            {dc ? `${dc.done}/${dc.total} 已上线` : ''}
                          </Text>
                        </span>
                      }
                      headStyle={{ background: DOMAIN_HEAD_BG }}
                      extra={
                        <Tag color="geekblue" style={{ marginRight: 0 }}>
                          {dc ? `${dc.coveragePct}%` : '-'}
                        </Tag>
                      }
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {domain.modules.map((m) => {
                          const meta = STATUS_META[m.status] ?? STATUS_META.planned;
                          return (
                            <Tooltip key={m.key} title={`${m.description}${m.surface ? `\n端点：${m.surface}` : ''}`}>
                              <Tag color={meta.color} style={{ cursor: 'default' }}>
                                {m.name}
                              </Tag>
                            </Tooltip>
                          );
                        })}
                      </div>
                      {dc && (
                        <Progress
                          percent={dc.coveragePct}
                          size="small"
                          strokeColor={VI.accent}
                          style={{ marginTop: 12, marginBottom: 0 }}
                        />
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* 页脚版权 */}
            <Paragraph type="secondary" style={{ marginTop: 24, textAlign: 'center' }}>
              © {new Date().getFullYear()} {data.company} · 全景图构建于{' '}
              {new Date(data.generatedAt).toLocaleString('zh-CN')} · {data.version}
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
