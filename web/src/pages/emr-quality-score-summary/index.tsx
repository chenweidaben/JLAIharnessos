/**
 * 健澜科技 jlmedaios - 病历质量评分汇总前端页（M481-D，M481 收官，V14，EMR 深化四模块，-summary 避让 M465-B）
 *
 * 深海蓝VI：评分汇总表格（科室/平均分）+ 趋势图占位。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptAvgScore {
  dept: string;
  avgScore: number;
}

export default function EmrQualityScoreSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [aggregated, setAggregated] = useState<DeptAvgScore[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-quality-score-summary", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setAggregated(data?.aggregated ?? []);
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
    { title: "科室", dataIndex: "dept", key: "dept" },
    {
      title: "平均分",
      dataIndex: "avgScore",
      key: "avgScore",
      render: (avg: number) => <Text strong style={{ color: VI.accent }}>{avg.toFixed(1)}</Text>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质量评分汇总</Title>
        <Spin spinning={loading}>
          <Card title="各科室平均分" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            <Table dataSource={aggregated} columns={columns} rowKey="dept" pagination={false} />
          </Card>
          <Card title="趋势图（占位）" headStyle={{ background: VI.mid, color: "#fff" }}>
            <Text type="secondary">趋势图待接入 ECharts</Text>
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
