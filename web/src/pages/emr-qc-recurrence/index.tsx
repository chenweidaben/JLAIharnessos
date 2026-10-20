/**
 * 健澜科技 jlmedaios - 质控复发预警前端页（M496-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：复发预警列表（问题/复发状态 Tag 红复发/绿未复发）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Statistic, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Detection {
  issue: string;
  previousCount: number;
  currentCount: number;
  recurrence: boolean;
}

interface RecurrenceReport {
  total: number;
  recurrent: number;
  rate: number;
}

export default function EmrQcRecurrencePage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [report, setReport] = useState<RecurrenceReport | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-recurrence", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setDetections(data?.data?.detections ?? []);
          setReport(data?.data?.report ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const columns = [
    { title: "问题", dataIndex: "issue", key: "issue" },
    { title: "上期数", dataIndex: "previousCount", key: "previousCount" },
    { title: "本期数", dataIndex: "currentCount", key: "currentCount" },
    {
      title: "复发状态",
      dataIndex: "recurrence",
      key: "recurrence",
      render: (recurrence: boolean) => (
        <Tag color={recurrence ? "red" : "green"}>{recurrence ? "复发" : "未复发"}</Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控复发预警</Title>
        {report && (
          <Card style={{ marginBottom: 16 }}>
            <Statistic title="总问题数" value={report.total} style={{ display: "inline-block", marginRight: 32 }} />
            <Statistic title="复发数" value={report.recurrent} style={{ display: "inline-block", marginRight: 32 }} />
            <Statistic title="复发率" value={report.rate} suffix="%" style={{ display: "inline-block" }} />
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="复发预警列表">
          <Table columns={columns} dataSource={detections} rowKey="issue" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
