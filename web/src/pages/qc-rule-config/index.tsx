/**
 * 健澜科技 jlmedaios - 规则质控可视化配置前端页（M461-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：规则表格（规则名/分类/严重度/开关 Switch/权重 Slider 0-100）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Layout,
  message,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { QcRuleConfigV14 } from "@/bff/aggregators/qcRuleConfigV14Aggregator";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const CATEGORY_LABEL: Record<string, string> = {
  homepage: "首页",
  basic: "基础",
  intrinsic: "内涵",
  warning: "预警",
  custom: "自定义",
};

const SEVERITY_COLOR: Record<string, string> = {
  block: "red",
  major: "orange",
  minor: "blue",
};

async function apiFetch(path: string, options?: RequestInit): Promise<Response | null> {
  try {
    const token = localStorage.getItem("token") ?? "";
    const resp = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options?.headers ?? {}),
      },
    });
    return resp;
  } catch {
    return null;
  }
}

export default function QcRuleConfigPage() {
  const [rules, setRules] = useState<QcRuleConfigV14[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await apiFetch("/api/v1/qc-rule-config");
        if (resp && resp.ok) {
          const data = await resp.json();
          if (!cancelled) setRules(data?.rules ?? []);
        }
      } catch {
        // graceful: 后端未就绪时不展示
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleToggle = async (record: QcRuleConfigV14, enabled: boolean) => {
    const resp = await apiFetch(`/api/v1/qc-rule-config/${record.ruleId}`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
    if (resp && resp.ok) {
      const data = await resp.json();
      setRules(data.rules ?? []);
      message.success(`已${enabled ? "启用" : "停用"}规则 ${record.ruleId}`);
    } else {
      message.warning(`操作失败（后端 route 未就绪）`);
    }
  };

  const handleWeight = async (record: QcRuleConfigV14, weight: number) => {
    const resp = await apiFetch(`/api/v1/qc-rule-config/${record.ruleId}`, {
      method: "PUT",
      body: JSON.stringify({ weight }),
    });
    if (resp && resp.ok) {
      const data = await resp.json();
      setRules(data.rules ?? []);
      message.success(`已调整规则 ${record.ruleId} 权重为 ${weight}`);
    } else {
      message.warning(`操作失败（后端 route 未就绪）`);
    }
  };

  const columns = [
    { title: "规则 ID", dataIndex: "ruleId", key: "ruleId" },
    { title: "规则名", dataIndex: "name", key: "name" },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      render: (cat: string) => <Tag color="blue">{CATEGORY_LABEL[cat] ?? cat}</Tag>,
    },
    {
      title: "严重度",
      dataIndex: "severity",
      key: "severity",
      render: (sev: string) => <Tag color={SEVERITY_COLOR[sev] ?? "default"}>{sev}</Tag>,
    },
    {
      title: "启停",
      dataIndex: "enabled",
      key: "enabled",
      render: (enabled: boolean, record: QcRuleConfigV14) => (
        <Switch checked={enabled} onChange={(v) => handleToggle(record, v)} />
      ),
    },
    {
      title: "权重 (0-100)",
      dataIndex: "weight",
      key: "weight",
      render: (weight: number, record: QcRuleConfigV14) => (
        <Slider
          style={{ width: 180 }}
          min={0}
          max={100}
          value={weight}
          onChange={(v) => handleWeight(record, v)}
        />
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>规则质控可视化配置</Title>
        <Card title="规则列表" headStyle={{ background: VI.deep, color: "#fff" }} loading={loading}>
          <Table rowKey="ruleId" columns={columns} dataSource={rules} pagination={false} size="small" />
        </Card>
        <Space style={{ marginTop: 16 }}>
          <Button style={{ background: VI.accent }} onClick={() => window.location.reload()}>刷新</Button>
        </Space>
      </Content>
    </Layout>
  );
}
