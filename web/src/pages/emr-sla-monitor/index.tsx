/**
 * 健澜科技 jlmedaios - 病历书写时限 SLA 实时监控前端页（M461-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：红绿灯表格（绿 on_time/黄 warning/红 overdue）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Table, Tag, Typography } from "antd";
import type { SlaItemV14 } from "@/bff/aggregators/emrSlaMonitorV14Aggregator";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const STATUS_META: Record<string, { label: string; color: string }> = {
  on_time: { label: "正常", color: "green" },
  warning: { label: "预警", color: "orange" },
  overdue: { label: "逾期", color: "red" },
};

export default function EmrSlaMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SlaItemV14[]>([]);
  const [summary, setSummary] = useState({ onTime: 0, warning: 0, overdue: 0 });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-sla-monitor", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setItems(data?.items ?? []);
            setSummary({
              onTime: data?.onTime ?? 0,
              warning: data?.warning ?? 0,
              overdue: data?.overdue ?? 0,
            });
          }
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const columns = [
    { title: "记录 ID", dataIndex: "recordId", key: "recordId" },
    { title: "病历类型", dataIndex: "recordType", key: "recordType" },
    { title: "患者", dataIndex: "patientName", key: "patientName" },
    { title: "应完成时间", dataIndex: "dueAt", key: "dueAt" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const meta = STATUS_META[status] ?? { label: status, color: "default" };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历书写时限 SLA 实时监控</Title>
        <div style={{ marginBottom: 16, display: "flex", gap: 16 }}>
          <Tag color="green" style={{ fontSize: 14, padding: "4px 12px" }}>正常 {summary.onTime}</Tag>
          <Tag color="orange" style={{ fontSize: 14, padding: "4px 12px" }}>预警 {summary.warning}</Tag>
          <Tag color="red" style={{ fontSize: 14, padding: "4px 12px" }}>逾期 {summary.overdue}</Tag>
        </div>
        <Card title="SLA 列表" headStyle={{ background: VI.deep, color: "#fff" }} loading={loading}>
          <Table rowKey="recordId" columns={columns} dataSource={items} pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
