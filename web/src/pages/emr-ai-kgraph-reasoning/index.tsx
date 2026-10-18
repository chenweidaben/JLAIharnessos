/**
 * 健澜科技 jlmedaios - AI病历质控知识图谱推理前端页（M522-D，V14，EMR 深化四模块，M522 收官）
 *
 * 深海蓝VI：AI病历质控知识图谱推理（领域/节点数/查询词/匹配节点/边数/匹配数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiKGraphReasoning {
  domain: string;
  nodeCount: number;
}

interface ReasoningResult {
  matchedNodes: string[];
  edgeCount: number;
}

interface ReasoningReport {
  matchedCount: number;
  edgeCount: number;
}

const DEFAULT_NODES = ["病历书写规范", "病历首页", "手术记录", "病历质控指标"];

export default function EmrAiKGraphReasoningPage() {
  const [reasoning, setReasoning] = useState<AiKGraphReasoning | null>(null);
  const [query, setQuery] = useState("病历");
  const [nodes] = useState(DEFAULT_NODES);
  const [result, setResult] = useState<ReasoningResult | null>(null);
  const [report, setReport] = useState<ReasoningReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReasoning = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-kgraph-reasoning", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setReasoning(data?.data ?? null);
        }
      } catch {
        message.error("加载知识图谱推理基础数据失败");
      }
    };
    void fetchReasoning();
  }, []);

  const doReason = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-kgraph-reasoning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ query, nodes }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("推理完成");
      } else {
        message.error("推理失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI病历质控知识图谱推理</Title>
        {reasoning && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="知识图谱推理基础数据">
            <div>
              <Text strong>领域：</Text><Text style={{ marginRight: 24 }}>{reasoning.domain}</Text>
              <Text strong>节点数：</Text><Text>{reasoning.nodeCount}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="图谱节点">
          <List
            dataSource={nodes}
            renderItem={(item) => (
              <List.Item>
                <Tag color="blue">{item}</Tag>
              </List.Item>
            )}
          />
        </Card>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="查询输入">
          <Input placeholder="输入查询词" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doReason}>
            AI图谱推理
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推理结果">
            <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
              <Statistic title="匹配节点数" value={report.matchedCount} />
              <Statistic title="边数" value={report.edgeCount} />
            </div>
            <div>
              <Text strong="true">匹配节点：</Text>
              <div style={{ marginTop: 8 }}>
                {result.matchedNodes.map((n) => (
                  <Tag key={n} color="green" style={{ marginBottom: 4 }}>{n}</Tag>
                ))}
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
