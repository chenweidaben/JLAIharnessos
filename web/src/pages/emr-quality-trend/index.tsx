/**
 * 健澜科技 jlmedaios - 病历质量趋势分析前端页（M536-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历质量趋势分析（科室/年份/月度得分列表/平均分/趋势）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QualityTrend {
  dept: string;
  year: number;
}

interface TrendResult {
  avgScore: number;
  trend: string;
}

interface TrendReport {
  avgScore: number;
  trend: string;
}

export default function EmrQualityTrendPage() {
  const [trend, setTrend] = useState<QualityTrend | null>(null);
  const [scores, setScores] = useState<number[]>([85, 88, 92]);
  const [result, setResult] = useState<TrendResult | null>(null);
  const [report, setReport] = useState<TrendReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-quality-trend", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setTrend(data?.data ?? null);
        }
      } catch {
        message.error("加载趋势分析基础数据失败");
      }
    };
    void fetchTrend();
  }, []);

  const doAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-quality-trend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ scores }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("分析完成");
      } else {
        message.error("分析失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历质量趋势分析</Title>
        {trend && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{trend.dept}</Text>
              <Text strong>年份：</Text><Text>{trend.year}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="月度得分列表">
          <List
            size="small"
            dataSource={scores}
            style={{ marginBottom: 16 }}
            renderItem={(item, idx) => (
              <List.Item>
                <Text strong>第{idx + 1}月：</Text><Text style={{ marginLeft: 8 }}>{item} 分</Text>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAnalyze}>
            执行分析
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="分析结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="平均分" value={report.avgScore} precision={1} />
              <div>
                <Text strong>趋势：</Text>
                <Tag color={report.trend === "上升" ? "green" : report.trend === "下降" ? "red" : "blue"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.trend}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
