/**
 * 健澜科技 jlmedaios - 病历质控操作日志前端页（M473-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：日志表格（时间/操作人/动作/目标）+ 筛选器（操作人输入框+动作下拉）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Input, Layout, Select, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface OpLog {
  id: string;
  operator: string;
  action: string;
  target: string;
  timestamp: string;
}

export default function EmrQcOpLogPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<OpLog[]>([]);
  const [operator, setOperator] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const params = new URLSearchParams();
        if (operator) params.set("operator", operator);
        if (action) params.set("action", action);
        const url = `/api/v1/emr-qc-op-log${params.toString() ? `?${params.toString()}` : ""}`;
        const resp = await fetch(url, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setLogs(data?.logs ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [operator, action]);

  const columns = [
    { title: "时间", dataIndex: "timestamp", key: "timestamp" },
    { title: "操作人", dataIndex: "operator", key: "operator", render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: "动作", dataIndex: "action", key: "action", render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: "目标", dataIndex: "target", key: "target" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控操作日志</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input
            placeholder="筛选操作人，如：张三"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            style={{ width: 200, marginRight: 16 }}
            allowClear
          />
          <Select
            value={action || "all"}
            onChange={(v) => setAction(v === "all" ? "" : v)}
            style={{ width: 160 }}
            options={[
              { value: "all", label: "全部动作" },
              { value: "审核", label: "审核" },
              { value: "驳回", label: "驳回" },
            ]}
          />
        </Card>
        <Card title="日志列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table dataSource={logs} columns={columns} rowKey="id" pagination={false} />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
