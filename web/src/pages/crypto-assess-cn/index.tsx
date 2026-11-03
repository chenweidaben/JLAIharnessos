/**
 * 健澜科技：P2 等保三级商用密码应用安全性评估自评工作台（M86-O）。
 *
 * 【场景】网络安全等级保护（三级）商用密码应用安全性评估（密评）自评：
 *   五域测评项清单（物理和环境 / 网络和通信 / 设备和计算 / 应用和数据 / 管理制度），
 *   逐项自评定级（合规 / 部分合规 / 不合规 / 不适用）+ 证据留痕，
 *   自动汇总总体结论并生成整改建议面板，支持导出自评报告。
 *
 * 视觉：深海蓝 VI（主色 #0A2A5E，辅色 #1E5BA8，浅底 #F4F7FB）。
 */
import {
  Button,
  Card,
  Col,
  Input,
  message,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { get, post } from '@/api/client';

const { Title, Text, Paragraph } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deepSea: '#0A2A5E',
  accent: '#1E5BA8',
  bg: '#F4F7FB',
};

type AssessStatus = 'compliant' | 'partial' | 'noncompliant' | 'not-applicable';

interface AssessItem {
  itemId: string;
  domain: string;
  name: string;
  gmtCode: string;
  requirement: string;
  selfStatus: AssessStatus;
  evidence?: string;
}

interface DomainStat {
  domain: string;
  domainLabel: string;
  compliant: number;
  total: number;
}

interface GapItem {
  itemId: string;
  domain: string;
  domainLabel: string;
  name: string;
  gmtCode: string;
  selfStatus: AssessStatus;
  advice: string;
}

interface Summary {
  domainStatus: DomainStat[];
  overall: '基本符合' | '不符合';
  compliantTotal: number;
  total: number;
  gaps: GapItem[];
}

const STATUS_OPTIONS: { value: AssessStatus; label: string; color: string }[] = [
  { value: 'compliant', label: '合规', color: 'green' },
  { value: 'partial', label: '部分合规', color: 'orange' },
  { value: 'noncompliant', label: '不合规', color: 'red' },
  { value: 'not-applicable', label: '不适用', color: 'default' },
];

const STATUS_LABEL: Record<AssessStatus, string> = STATUS_OPTIONS.reduce(
  (acc, cur) => ({ ...acc, [cur.value]: cur.label }),
  {} as Record<AssessStatus, string>,
);

const STATUS_COLOR: Record<AssessStatus, string> = STATUS_OPTIONS.reduce(
  (acc, cur) => ({ ...acc, [cur.value]: cur.color }),
  {} as Record<AssessStatus, string>,
);

const DOMAIN_ORDER = [
  'physical-environment',
  'network-communication',
  'device-computing',
  'application-data',
  'management',
];

const DOMAIN_LABEL: Record<string, string> = {
  'physical-environment': '物理和环境安全',
  'network-communication': '网络和通信安全',
  'device-computing': '设备和计算安全',
  'application-data': '应用和数据安全',
  management: '管理制度',
};

export default function CryptoAssessCnPage() {
  const [items, setItems] = useState<AssessItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  /** 行内编辑态：itemId -> { status, evidence } */
  const [draft, setDraft] = useState<Record<string, { status: AssessStatus; evidence: string }>>({});

  const loadAll = async () => {
    setLoading(true);
    try {
      const [itemsResp, sumResp] = await Promise.all([
        get<{ items: AssessItem[]; total: number }>('/api/v1/crypto-assess/items'),
        get<Summary>('/api/v1/crypto-assess/summary'),
      ]);
      setItems(itemsResp.items ?? []);
      setSummary(sumResp);
      const draftMap: Record<string, { status: AssessStatus; evidence: string }> = {};
      for (const it of itemsResp.items ?? []) {
        draftMap[it.itemId] = { status: it.selfStatus, evidence: it.evidence ?? '' };
      }
      setDraft(draftMap);
    } catch (e) {
      message.error(`加载密评数据失败：${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveItem = async (itemId: string) => {
    const d = draft[itemId];
    if (!d) return;
    setSavingId(itemId);
    try {
      const resp = await post<{ item: AssessItem; summary: Summary }>(
        `/api/v1/crypto-assess/items/${itemId}/status`,
        { status: d.status, evidence: d.evidence },
      );
      setItems((prev) => prev.map((p) => (p.itemId === itemId ? resp.item : p)));
      if (resp.summary) setSummary(resp.summary);
      message.success(`已保存 ${itemId} 自评状态`);
    } catch (e) {
      message.error(`保存失败：${(e as Error).message}`);
    } finally {
      setSavingId(null);
    }
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      const resp = await post<{ demo: boolean; reportId: string; generatedAt: string }>(
        '/api/v1/crypto-assess/export',
        {},
      );
      message.success(`自评报告已生成（DEMO）：${resp.reportId}`);
    } catch (e) {
      message.error(`导出失败：${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  const groupedItems = useMemo(() => {
    const map = new Map<string, AssessItem[]>();
    for (const it of items) {
      const arr = map.get(it.domain) ?? [];
      arr.push(it);
      map.set(it.domain, arr);
    }
    return DOMAIN_ORDER.filter((d) => map.has(d)).map((d) => ({
      domain: d,
      domainLabel: DOMAIN_LABEL[d] ?? d,
      items: map.get(d) ?? [],
    }));
  }, [items]);

  const overallColor = summary?.overall === '基本符合' ? 'green' : 'red';

  return (
    <div style={{ background: VI.bg, minHeight: '100vh', padding: 16 }}>
      <Card variant="borderless" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: VI.deepSea, marginBottom: 4 }}>
              等保三级 · 商用密码应用安全性评估自评工作台
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              依据 GB/T 39786-2021 与 GM/T 0054-2018，按五域逐项自评定级并留痕证据，自动形成总体结论与整改建议。
            </Paragraph>
          </Col>
          <Col>
            <Space>
              <Button onClick={loadAll} loading={loading}>
                刷新
              </Button>
              <Button
                type="primary"
                loading={exporting}
                onClick={exportReport}
                style={{ background: VI.accent, borderColor: VI.accent }}
              >
                导出自评报告
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card variant="borderless">
            <Text type="secondary">总体结论</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={overallColor} style={{ fontSize: 16, padding: '4px 12px' }}>
                {summary?.overall ?? '待评估'}
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              合规 {summary?.compliantTotal ?? 0} / 测评项 {summary?.total ?? 0}
            </Text>
          </Card>
        </Col>
        {(summary?.domainStatus ?? []).map((d) => (
          <Col span={Math.floor(18 / (summary?.domainStatus.length || 1))} key={d.domain}>
            <Card variant="borderless">
              <Text type="secondary">{d.domainLabel}</Text>
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ fontSize: 20, color: VI.deepSea }}>
                  {d.compliant}
                </Text>
                <Text type="secondary"> / {d.total}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                合规项数
              </Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        variant="borderless"
        title={<span style={{ color: VI.deepSea }}>测评项清单（按域分组）</span>}
        style={{ marginBottom: 16 }}
      >
        {groupedItems.map((g) => (
          <div key={g.domain} style={{ marginBottom: 16 }}>
            <Title level={5} style={{ color: VI.accent, marginTop: 0 }}>
              {g.domainLabel}
            </Title>
            <Table
              rowKey="itemId"
              size="small"
              loading={loading}
              pagination={false}
              dataSource={g.items}
              columns={[
                {
                  title: '测评项',
                  dataIndex: 'name',
                  width: 220,
                  render: (name: string, row) => (
                    <Space direction="vertical" size={0}>
                      <Text strong>{name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {row.gmtCode}
                      </Text>
                    </Space>
                  ),
                },
                {
                  title: '要求描述',
                  dataIndex: 'requirement',
                  ellipsis: true,
                  render: (r: string) => (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {r}
                    </Text>
                  ),
                },
                {
                  title: '自评定级',
                  dataIndex: 'selfStatus',
                  width: 160,
                  render: (_: unknown, row) => (
                    <Select
                      value={draft[row.itemId]?.status ?? row.selfStatus}
                      style={{ width: 140 }}
                      onChange={(v: AssessStatus) =>
                        setDraft((prev) => ({
                          ...prev,
                          [row.itemId]: {
                            status: v,
                            evidence: prev[row.itemId]?.evidence ?? row.evidence ?? '',
                          },
                        }))
                      }
                      options={STATUS_OPTIONS}
                    />
                  ),
                },
                {
                  title: '证据 / 留痕',
                  dataIndex: 'evidence',
                  width: 260,
                  render: (_: unknown, row) => (
                    <Input.TextArea
                      size="small"
                      rows={2}
                      placeholder="填写证明材料链接或描述"
                      value={draft[row.itemId]?.evidence ?? row.evidence ?? ''}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [row.itemId]: {
                            status: prev[row.itemId]?.status ?? row.selfStatus,
                            evidence: e.target.value,
                          },
                        }))
                      }
                    />
                  ),
                },
                {
                  title: '状态',
                  dataIndex: 'selfStatus',
                  width: 110,
                  render: (s: AssessStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
                },
                {
                  title: '操作',
                  width: 90,
                  render: (_: unknown, row) => (
                    <Button
                      size="small"
                      type="link"
                      loading={savingId === row.itemId}
                      onClick={() => saveItem(row.itemId)}
                    >
                      保存
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        ))}
      </Card>

      <Card
        variant="borderless"
        title={
          <span style={{ color: VI.deepSea }}>
            整改面板（非合规项 {summary?.gaps.length ?? 0} 项）
          </span>
        }
      >
        {(summary?.gaps.length ?? 0) === 0 ? (
          <Text type="secondary">暂无非合规项，密评自评通过。</Text>
        ) : (
          <Table
            rowKey="itemId"
            size="small"
            pagination={false}
            dataSource={summary?.gaps ?? []}
            columns={[
              { title: '测评项', dataIndex: 'name', width: 220 },
              { title: '所属域', dataIndex: 'domainLabel', width: 160 },
              {
                title: '当前状态',
                dataIndex: 'selfStatus',
                width: 110,
                render: (s: AssessStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
              },
              {
                title: '整改建议',
                dataIndex: 'advice',
                render: (a: string) => <Text style={{ fontSize: 12 }}>{a}</Text>,
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
