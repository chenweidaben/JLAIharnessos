/**
 * 健澜科技 jlmedaios - 用户操作手册页（M132-B，产品化收尾）
 *
 * 左侧目录（按章节）+ 右侧正文；顶部角色切换（医生/护士/药师/管理员/患者）。
 * 三态完备：loading（Spin）/ error（Alert + 重试）/ empty（Empty）。
 * 数据来源：GET /api/v1/help/manual?role=xxx（真实 BFF，信封已由 @/api 解包）。
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
  Layout,
  List,
  Select,
  Spin,
  Steps,
  Tag,
  Typography,
} from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { get } from '@/api';

const { Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 主色 */
const DEEP_SEA = '#0A4D8C';

/** 与后端 userManualAggregator 对齐的类型 */
interface ManualStep {
  no: number;
  title: string;
  detail: string;
}
interface ManualChapter {
  id: string;
  title: string;
  summary: string;
  audience: string[];
  steps: ManualStep[];
  cautions: string[];
  tags: string[];
}
interface ManualTocItem {
  id: string;
  title: string;
  stepCount: number;
}
interface ManualData {
  title: string;
  version: string;
  role: string;
  roleLabel: string;
  generatedAt: string;
  copyright: string;
  toc: ManualTocItem[];
  chapters: ManualChapter[];
  totalChapters: number;
  totalSteps: number;
}
interface ManualResponse {
  manual: ManualData;
}

/** 角色选项（与后端 ManualRole 对齐） */
const ROLES = [
  { value: 'doctor', label: '医生' },
  { value: 'nurse', label: '护士' },
  { value: 'pharmacist', label: '药师' },
  { value: 'admin', label: '管理员' },
  { value: 'patient', label: '患者' },
];

export default function HelpManualPage() {
  const [role, setRole] = useState<string>('doctor');
  const [manual, setManual] = useState<ManualData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeChapterId, setActiveChapterId] = useState<string>('');

  const load = async (r: string) => {
    setLoading(true);
    setError('');
    try {
      const resp = await get<ManualResponse>('/api/v1/help/manual', { role: r });
      setManual(resp.manual);
      // 默认选中第一章
      setActiveChapterId(resp.manual.toc[0]?.id ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作手册加载失败');
      setManual(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const activeChapter = useMemo(() => {
    if (!manual) return null;
    return (
      manual.chapters.find((c) => c.id === activeChapterId) ?? manual.chapters[0] ?? null
    );
  }, [manual, activeChapterId]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Sider
        width={280}
        style={{ background: DEEP_SEA, padding: '16px 0', overflow: 'auto' }}
        theme="dark"
      >
        <div style={{ padding: '0 16px 16px', color: '#fff' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            <BookOutlined /> 用户操作手册
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
            健澜数智医院 · 产品化收尾
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
        {(manual?.toc ?? []).map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveChapterId(item.id)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              color: '#fff',
              background:
                activeChapter?.id === item.id ? 'rgba(255,255,255,0.18)' : 'transparent',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{item.title}</span>
            <Tag style={{ margin: 0, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}>
              {item.stepCount} 步
            </Tag>
          </div>
        ))}
      </Sider>

      <Layout>
        <Content style={{ padding: 24 }}>
          {/* loading 态 */}
          {loading && (
            <Card>
              <Spin tip="加载操作手册…">
                <div style={{ height: 200 }} />
              </Spin>
            </Card>
          )}

          {/* error 态 */}
          {!loading && error && (
            <Alert
              type="error"
              showIcon
              message="操作手册加载失败"
              description={error}
              action={
                <Button size="small" onClick={() => void load(role)}>
                  重试
                </Button>
              }
            />
          )}

          {/* empty 态 */}
          {!loading && !error && (!manual || manual.toc.length === 0) && (
            <Card>
              <Empty description="暂无该角色的操作手册" />
            </Card>
          )}

          {/* 正文 */}
          {!loading && !error && manual && activeChapter && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tag color={DEEP_SEA}>
                  {manual.roleLabel}手册 · {manual.version}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  共 {manual.totalChapters} 章 / {manual.totalSteps} 步
                </Text>
              </div>

              <Title level={3} style={{ marginTop: 12 }}>
                {activeChapter.title}
              </Title>
              <Paragraph style={{ color: 'rgba(0,0,0,0.65)' }}>{activeChapter.summary}</Paragraph>

              {/* 操作步骤 */}
              <Title level={5}>操作步骤</Title>
              <Steps
                direction="vertical"
                current={activeChapter.steps.length}
                items={activeChapter.steps.map((s) => ({
                  title: `${s.no}. ${s.title}`,
                  description: s.detail,
                }))}
              />

              {/* 注意事项 */}
              {activeChapter.cautions.length > 0 && (
                <>
                  <Title level={5} style={{ marginTop: 24 }}>
                    <SafetyCertificateOutlined /> 注意事项 / 红线
                  </Title>
                  <List
                    size="small"
                    dataSource={activeChapter.cautions}
                    renderItem={(item) => (
                      <List.Item>
                        <CheckCircleOutlined style={{ color: DEEP_SEA, marginRight: 8 }} />
                        {item}
                      </List.Item>
                    )}
                  />
                </>
              )}

              <div style={{ marginTop: 16 }}>
                {activeChapter.tags.map((t) => (
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
            {manual?.copyright ?? '© 2026 杭州健澜科技有限公司'} · 用户操作手册（产品化收尾）
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
