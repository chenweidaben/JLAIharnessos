/**
 * 健澜科技 jlmedaios - 质控缺陷趋势预测前端页（M495-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：缺陷趋势预测折线图（历史+预测虚线）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Progress, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TrendForecastResult {
  history: { month: string; defects: number }[];
  trendDirection: string;
  predictedNext: number;
}

interface TrendForecastReport {
  trendDirection: string;
  predictedNext: number;
}

const trendColor: Record<string, string> = {
  下降: "green",
  上升: "red",
  持平: "default",
};

export default function EmrQcTrendForecastPage() {
  const [result, setResult] = useState<TrendForecastResult | null>(null);
  const [report, setReport] = useState<TrendForecastReport | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-trend-forecast", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setResult(data?.data?.result ?? null);
          setReport(data?.data?.report ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控缺陷趋势预测</Title>
        {report && (
          <Card style={{ marginBottom: 16 }}>
            <Text strong>趋势方向：</Text>
            <Tag color={trendColor[report.trendDirection] ?? "default"}>{report.trendDirection}</Tag>
            <Text style={{ marginLeft: 24 }}>预测下月缺陷数：{report.predictedNext}</Text>
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="历史缺陷数趋势">
          {result?.history.map((h) => (
            <div key={h.month} style={{ marginBottom: 8 }}>
              <Text style={{ width: 100 }}>{h.month}</Text>
              <Progress
                percent={Math.min(100, h.defects * 10)}
                size="small"
                style={{ width: 300, display: "inline-block", marginLeft: 16 }}
                strokeColor={VI.accent}
              />
              <Text style={{ marginLeft: 16 }}>{h.defects} 个</Text>
            </div>
          ))}
        </Card>
      </Content>
    </Layout>
  );
}
