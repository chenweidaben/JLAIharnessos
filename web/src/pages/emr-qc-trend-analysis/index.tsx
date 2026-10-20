/**
 * 健澜科技 jlmedaios - 质控问题趋势分析（避让版）前端页（M542-D，V14，EMR 深化四模块，M542 收官）
 *
 * 深海蓝VI：质控问题趋势分析（科室/年份/月度缺陷数列表/平均缺陷数/趋势）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TrendAnalysis {
  dept: string;
  year: number;
}

interface TrendResult {
  avgDefects: number;
  trend: string;
}

interface TrendReport {
  avgDefects: number;
  trend: string;
}

const trendColor = (trend: string): string => {
  if (trend === "下降") return "green";
  if (trend === "上升") return "red";
  return "blue";
};

export default function EmrQcTrendAnalysisPage() {
  const [base, setBase] = useState<TrendAnalysis | null>(null);
  const [monthlyDefects] = useState<number[]>([30, 25, 15]);
  const [result, setResult] = useState<TrendResult | null>(null);
  const [report, setReport] = useState<TrendReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-trend-analysis", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载质控趋势基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-trend-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ monthlyDefects }),
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
        <Title level={3} style={{ color: VI.deep }}>质控问题趋势分析</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{base.dept}</Text>
              <Text strong>年份：</Text><Tag color="blue">{base.year}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="月度缺陷数列表">
          <List
            size="small"
            dataSource={monthlyDefects}
            renderItem={(item, idx) => (
              <List.Item>
                <Text>第{idx + 1}月</Text>
                <Tag color={idx === 0 ? "default" : item < monthlyDefects[idx - 1] ? "green" : item > monthlyDefects[idx - 1] ? "red" : "blue"}>
                  {item}
                </Tag>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doAnalyze}>
            执行分析
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="分析结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic title="平均缺陷数（保留1位）" value={report.avgDefects} precision={1} valueStyle={{ color: VI.accent }} />
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>趋势：</Text>
                  <Tag color={trendColor(report.trend)} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.trend}
                  </Tag>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
