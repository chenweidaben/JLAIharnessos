/**
 * 健澜科技 jlmedaios - 病历质控规则引擎可视化对接前端页（M467-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：规则列表+触发日志表格+手动执行按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, message, Space, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RuleResult {
  ruleId: string;
  triggered: boolean;
  message: string;
}

export default function EmrRuleEnginePage() {
  const [results, setResults] = useState<RuleResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; triggeredCount: number; passRate: number } | null>(null);

  const handleExecute = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-rule-engine/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ note: "患者主诉缺失，现病史过短。" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResults(data?.results ?? []);
        setSummary(data?.summary ?? null);
        message.success("规则执行完成");
      } else {
        message.warning("执行失败（后端 route 未就绪）");
      }
    } catch {
      message.warning("执行失败（后端 route 未就绪）");
    }
  };

  const columns = [
    { title: "规则ID", dataIndex: "ruleId", key: "ruleId" },
    { title: "触发", dataIndex: "triggered", key: "triggered", render: (v: boolean) => (v ? <Tag color="red">触发</Tag> : <Tag color="green">通过</Tag>) },
    { title: "提示", dataIndex: "message", key: "message" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控规则引擎</Title>
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <Button type="primary" style={{ background: VI.accent }} onClick={handleExecute}>手动执行规则</Button>
            {summary && (
              <Tag color="blue">通过率：{summary.passRate}%（{summary.triggeredCount}/{summary.total}）</Tag>
            )}
          </Space>
        </Card>
        <Card title="执行结果" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Table dataSource={results} columns={columns} rowKey="ruleId" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
