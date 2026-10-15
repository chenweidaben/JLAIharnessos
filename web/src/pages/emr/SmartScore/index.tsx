/**
 * 健澜科技 jlmedaios — 电子病历智能化评分页（M154-B）
 *
 * 粘贴病历全文 → POST /api/v1/emr/score → 六维得分 + 等级 + 缺陷清单 + 整改建议。
 * 深海蓝 VI：主色 #0A4D8C，头部渐变 #073A6B → #0A4D8C → #0B5AA0。
 *
 * 公平评分：重诊断逻辑/用药匹配/检查适宜等实质内容，不抠格式。
 * 评分为质控辅助，不替代医师与质控人员最终判定。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { Alert, Button, Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from 'antd';
import React, { useState } from 'react';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI */
const VI_PRIMARY = '#0A4D8C';
const VI_HEADER_BG = 'linear-gradient(160deg, #073A6B 0%, #0A4D8C 45%, #0B5AA0 100%)';

interface DimensionScore {
  key: string;
  label: string;
  maxScore: number;
  score: number;
  ratio: number;
  findings: string[];
}
interface Defect {
  dimension: string;
  severity: 'low' | 'medium' | 'high';
  code: string;
  message: string;
  deduction: number;
}
interface Suggestion {
  dimension: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  detail: string;
  recoverableScore: number;
}
interface ScoreResult {
  recordId: string | null;
  totalScore: number;
  maxTotal: number;
  grade: '优秀' | '良好' | '合格' | '不合格';
  dimensions: DimensionScore[];
  defects: Defect[];
  suggestions: Suggestion[];
  assessedAt: string;
}

/** 等级配色 */
function gradeColor(grade: string): string {
  switch (grade) {
    case '优秀':
      return '#389E0D';
    case '良好':
      return VI_PRIMARY;
    case '合格':
      return '#D48806';
    default:
      return '#CF1322';
  }
}

const SEVERITY_META: Record<Defect['severity'], { label: string; color: string }> = {
  high: { label: '严重', color: '#CF1322' },
  medium: { label: '待改进', color: '#D48806' },
  low: { label: '提示', color: '#1677FF' },
};

const SAMPLE = [
  '主诉：反复胸痛3天，加重6小时',
  '现病史：3天前劳累后起病，心前区闷痛，休息后缓解；6小时前加重，伴出汗，自服硝酸甘油未缓解。',
  '初步诊断：1.冠状动脉粥样硬化性心脏病；2.原发性高血压。',
  '处理：阿司匹林肠溶片口服，阿托伐他汀钙片口服，氨氯地平片口服。',
].join('\n');

export default function EmrSmartScorePage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<ScoreResult | null>(null);

  async function handleScore() {
    if (!content.trim()) {
      setError('请先粘贴病历全文');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await post<ScoreResult>('/api/v1/emr/score', { recordContent: content });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '评分失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: VI_HEADER_BG }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          电子病历智能化评分
          <Tag color="#FAAD14" style={{ marginLeft: 12 }}>六维 100 分 · 重实质不抠格式</Tag>
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#F5F8FC' }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Alert
          type="info" showIcon style={{ marginBottom: 16 }}
          message="公平评分：重点评判诊断逻辑是否自洽、用药是否与诊断匹配、检查是否适宜、病程是否及时；不按排版格式扣分。评分为质控辅助，不替代医师最终判定。"
        />

        <Row gutter={16}>
          {/* 输入区 */}
          <Col span={10}>
            <Card title="病历全文（粘贴即可）">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="粘贴主诉、现病史、诊断、用药、检查、病程记录等正文…"
                style={{
                  width: '100%', minHeight: 360, padding: 12,
                  border: '1px solid #d9d9d9', borderRadius: 6, resize: 'vertical',
                  fontFamily: 'inherit', lineHeight: 1.7,
                }}
              />
              <div style={{ marginTop: 12 }}>
                <Button type="primary" loading={loading} onClick={handleScore} style={{ background: VI_PRIMARY, borderColor: VI_PRIMARY }}>
                  开始智能评分
                </Button>
                <Button style={{ marginLeft: 8 }} onClick={() => setContent(SAMPLE)}>
                  填入示例
                </Button>
              </div>
            </Card>
          </Col>

          {/* 结果区 */}
          <Col span={14}>
            <Spin spinning={loading}>
              {!result ? (
                <Card>
                  <Paragraph type="secondary" style={{ textAlign: 'center', padding: 48 }}>
                    评分结果将在这里展示
                  </Paragraph>
                </Card>
              ) : (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                      <Card>
                        <Statistic title="综合得分" value={result.totalScore} suffix={`/ ${result.maxTotal}`} valueStyle={{ color: VI_PRIMARY }} />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Statistic
                          title="质量等级" value={result.grade}
                          valueStyle={{ color: gradeColor(result.grade) }}
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Statistic title="发现缺陷" value={result.defects.filter((d) => d.deduction > 0).length} valueStyle={{ color: '#D48806' }} />
                      </Card>
                    </Col>
                  </Row>

                  <Card title="六维得分明细" style={{ marginBottom: 16 }}>
                    <List
                      dataSource={result.dimensions}
                      renderItem={(d) => (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text strong>{d.label}</Text>
                              <Text>{d.score} / {d.maxScore}</Text>
                            </div>
                            <div style={{ height: 8, background: '#eaf1f9', borderRadius: 4, overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.round(d.ratio * 100)}%`, height: '100%',
                                  background: d.ratio >= 0.8 ? '#389E0D' : d.ratio >= 0.6 ? VI_PRIMARY : '#CF1322',
                                }}
                              />
                            </div>
                          </div>
                        </List.Item>
                      )}
                    />
                  </Card>

                  <Card title="缺陷清单（实质问题）" style={{ marginBottom: 16 }}>
                    {result.defects.filter((d) => d.deduction > 0).length === 0 ? (
                      <Paragraph type="secondary">未发现实质缺陷，病历质量良好。</Paragraph>
                    ) : (
                      <List
                        size="small"
                        dataSource={result.defects.filter((d) => d.deduction > 0)}
                        renderItem={(d) => (
                          <List.Item>
                            <Tag color={SEVERITY_META[d.severity].color}>{SEVERITY_META[d.severity].label}</Tag>
                            <span style={{ marginRight: 8 }}>{d.message}</span>
                            <Text type="danger">-{d.deduction}分</Text>
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>

                  <Card title="整改建议（按可挽回分数排序）">
                    {result.suggestions.length === 0 ? (
                      <Paragraph type="secondary">保持常态化书写。</Paragraph>
                    ) : (
                      <List
                        size="small"
                        dataSource={result.suggestions}
                        renderItem={(s) => (
                          <List.Item>
                            <List.Item.Meta
                              title={
                                <span>
                                  <Tag color={VI_PRIMARY}>{s.title}</Tag>
                                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>可挽回 {s.recoverableScore} 分</Text>
                                </span>
                              }
                              description={s.detail}
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>
                </>
              )}
            </Spin>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
