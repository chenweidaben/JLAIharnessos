/**
 * 健澜AI原生医院操作系统OS - 互联互通标准化成熟度五级乙等自评工作台（M86-N）
 * 顶部汇总 Cards + 按域分组测评项 Table（可展开证据输入）+ 差距整改面板 + 导出报告
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Col, Empty, Input, InputNumber, Row, Space, Spin, Statistic, Table, Tag, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

type Domain = 'data-resource' | 'interoperability' | 'infrastructure' | 'application-effect';

interface ItemRow {
  itemId: string;
  domain: Domain;
  name: string;
  maxScore: number;
  selfScore: number;
  evidence?: string;
  updatedAt: string;
}

interface DomainScore {
  domain: Domain;
  domainName: string;
  weight: number;
  got: number;
  rate: number;
}

interface GapRow {
  itemId: string;
  name: string;
  domain: Domain;
  domainName: string;
  selfScore: number;
  maxScore: number;
  gap: number;
  suggestion: string;
}

interface Summary {
  domainScores: DomainScore[];
  totalScore: number;
  totalMax: number;
  totalRate: number;
  minRate: number;
  passed: boolean;
  levelHint: string;
  gaps: GapRow[];
  generatedAt: string;
}

const DOMAIN_COLOR: Record<Domain, string> = {
  'data-resource': '#1E5F8C',
  'interoperability': '#4A90D9',
  'infrastructure': '#2E7D5B',
  'application-effect': '#B8860B',
};

const DOMAIN_LABEL: Record<Domain, string> = {
  'data-resource': '数据资源标准化',
  'interoperability': '互联互通',
  'infrastructure': '基础设施建设',
  'application-effect': '应用效果',
};

function rateColor(rate: number): string {
  if (rate >= 90) return '#2E7D32';
  if (rate >= 80) return '#B8860B';
  return '#C62828';
}

export default function InteropFiveBPage() {
  usePageTitle('互联互通五乙自评工作台');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [draftScore, setDraftScore] = useState<Record<string, number>>({});
  const [draftEvidence, setDraftEvidence] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsResp, summaryResp] = await Promise.all([
        fetch('/api/v1/interop-five-b/items').then((r) => r.json()),
        fetch('/api/v1/interop-five-b/summary').then((r) => r.json()),
      ]);
      const list = (itemsResp?.data?.items ?? []) as ItemRow[];
      setItems(list);
      setSummary((summaryResp?.data ?? null) as Summary | null);
      const ds: Record<string, number> = {};
      const de: Record<string, string> = {};
      list.forEach((it) => {
        ds[it.itemId] = it.selfScore;
        de[it.itemId] = it.evidence ?? '';
      });
      setDraftScore(ds);
      setDraftEvidence(de);
    } catch (e) {
      console.warn('[interop-five-b] 拉取自评数据失败：', e);
      message.warning('BFF 未连通，已进入离线空状态（DEMO_MODE 下应返回内存数据）');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (row: ItemRow) => {
    setSavingId(row.itemId);
    try {
      const score = draftScore[row.itemId] ?? row.selfScore;
      const evidence = draftEvidence[row.itemId] ?? '';
      const resp = await fetch(`/api/v1/interop-five-b/items/${encodeURIComponent(row.itemId)}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, evidence }),
      });
      const json = await resp.json();
      if (json?.code === 0) {
        message.success(`已保存 ${row.itemId}：自评分 ${score}%`);
        const updated = json?.data as ItemRow;
        setItems((prev) => prev.map((it) => (it.itemId === row.itemId ? { ...it, ...updated } : it)));
        if (json?.data?.summary) setSummary(json.data.summary as Summary);
      } else {
        message.error(json?.message ?? '保存失败');
      }
    } catch (e) {
      console.warn('[interop-five-b] 保存失败：', e);
      message.error('保存失败，请稍后重试');
    } finally {
      setSavingId(null);
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const resp = await fetch('/api/v1/interop-five-b/export', { method: 'POST' });
      const json = await resp.json();
      if (json?.code === 0) {
        const data = json.data as { demo: boolean; reportId: string; sections: { title: string; bullets: string[] }[] };
        message.success(`自评报告已生成（${data.reportId}，DEMO 离线骨架）`);
        console.log('[interop-five-b] report:', data);
      } else {
        message.error(json?.message ?? '导出失败');
      }
    } catch (e) {
      console.warn('[interop-five-b] 导出失败：', e);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo<ColumnsType<ItemRow>>(() => [
    { title: '编号', dataIndex: 'itemId', key: 'itemId', width: 90 },
    {
      title: '测评域', dataIndex: 'domain', key: 'domain', width: 140,
      render: (v: Domain) => <Tag color={DOMAIN_COLOR[v]}>{DOMAIN_LABEL[v]}</Tag>,
    },
    { title: '测评项', dataIndex: 'name', key: 'name' },
    { title: '权重', dataIndex: 'maxScore', key: 'maxScore', width: 80, render: (v: number) => `${v} 分` },
    {
      title: '当前自评分', dataIndex: 'selfScore', key: 'selfScore', width: 110,
      render: (v: number) => <span style={{ color: rateColor(v), fontWeight: 600 }}>{v}%</span>,
    },
    {
      title: '操作', key: 'op', width: 200,
      render: (_: unknown, row) => (
        <Space size={8}>
          <InputNumber
            min={0} max={100} step={5}
            value={draftScore[row.itemId] ?? row.selfScore}
            onChange={(v) => setDraftScore((p) => ({ ...p, [row.itemId]: v ?? 0 }))}
          />
          <Button type="link" size="small" loading={savingId === row.itemId} onClick={() => onSave(row)}>
            保存
          </Button>
        </Space>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [draftScore, savingId]);

  return (
    <PageContainer
      title="互联互通标准化成熟度五级乙等自评工作台"
      description="国家医疗健康信息互联互通标准化成熟度测评（五级乙等）自评工作台 · DEMO_MODE 内存数据"
      extra={<Button type="primary" onClick={onExport} loading={exporting}>导出自评报告</Button>}
    >
      {loading && <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />}
      {!loading && (
        <>
          {/* 顶部汇总 Cards */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="自评总分"
                  value={summary?.totalScore ?? 0}
                  suffix={`/ ${summary?.totalMax ?? 0}（${summary?.totalRate ?? 0}%）`}
                  valueStyle={{ color: rateColor(summary?.totalRate ?? 0) }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <div style={{ marginBottom: 8 }}>达标状态</div>
                {summary ? (
                  <Tag color={summary.passed ? 'success' : 'error'} style={{ fontSize: 14, padding: '4px 12px' }}>
                    {summary.passed ? '达标（五乙）' : '未达标'}
                  </Tag>
                ) : <Tag>—</Tag>}
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small">
                <div style={{ marginBottom: 8, color: '#666' }}>四域得分率</div>
                <Row gutter={8}>
                  {(summary?.domainScores ?? []).map((d) => (
                    <Col span={6} key={d.domain}>
                      <div style={{ fontSize: 12, color: '#666' }}>{d.domainName}</div>
                      <div style={{ color: rateColor(d.rate), fontWeight: 600 }}>{d.rate}%</div>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>

          {/* 测评项 Table */}
          <Card title={`测评项清单（${items.length} 项）`} style={{ marginBottom: 16 }}>
            {items.length === 0 ? <Empty description="暂无自评项（DEMO_MODE 下应由 BFF 内存预置 14 项）" /> : (
              <Table<ItemRow>
                rowKey="itemId"
                columns={columns}
                dataSource={items}
                pagination={false}
                size="middle"
                scroll={{ x: 900 }}
                expandable={{
                  expandedRowRender: (row) => (
                    <div style={{ padding: '8px 16px' }}>
                      <div style={{ marginBottom: 8, color: '#666' }}>证据 / 整改说明（最长 500 字，保存后随自评分一并提交）</div>
                      <Input.TextArea
                        rows={3}
                        maxLength={500}
                        showCount
                        value={draftEvidence[row.itemId] ?? ''}
                        onChange={(e) => setDraftEvidence((p) => ({ ...p, [row.itemId]: e.target.value }))}
                        placeholder="填写证据材料链接、整改责任人、计划完成时间等"
                      />
                    </div>
                  ),
                }}
              />
            )}
          </Card>

          {/* 差距面板 */}
          <Card title="差距面板：得分率最低 3 项" size="small">
            {(summary?.gaps ?? []).length === 0 ? <Empty description="暂无差距数据" /> : (
              <Row gutter={16}>
                {(summary?.gaps ?? []).map((g) => (
                  <Col span={8} key={g.itemId}>
                    <Card size="small" style={{ marginBottom: 8, borderTop: `3px solid ${rateColor(g.selfScore)}` }}>
                      <Tag color={DOMAIN_COLOR[g.domain]}>{g.domainName}</Tag>
                      <div style={{ margin: '8px 0', fontWeight: 600 }}>{g.name}</div>
                      <div>当前自评分：<span style={{ color: rateColor(g.selfScore) }}>{g.selfScore}%</span>（差距 {g.gap} 分）</div>
                      <div style={{ marginTop: 8, color: '#555', fontSize: 13 }}>{g.suggestion}</div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
            {summary?.levelHint && (
              <div style={{ marginTop: 12, color: '#888', fontSize: 12 }}>口径：{summary.levelHint}</div>
            )}
          </Card>
        </>
      )}
    </PageContainer>
  );
}
