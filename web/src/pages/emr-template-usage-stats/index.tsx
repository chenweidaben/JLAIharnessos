/**
 * 健澜科技 jlmedaios - 模板使用统计分析前端页（M525-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：模板使用统计分析（科室/周期/模板名/使用次数/总记录数/使用率/使用热度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface UsageStats {
  dept: string;
  period: string;
}

interface UsageResult {
  usageRate: number;
  popularity: string;
}

interface UsageReport {
  usageRate: number;
  popularity: string;
}

const DEFAULT_INPUT = {
  templateName: "入院记录模板",
  usedCount: 420,
  totalRecords: 500,
};

export default function EmrTemplateUsageStatsPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [result, setResult] = useState<UsageResult | null>(null);
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-usage-stats", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setStats(data?.data ?? null);
        }
      } catch {
        message.error("加载使用统计基础数据失败");
      }
    };
    void fetchStats();
  }, []);

  const doAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-usage-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(DEFAULT_INPUT),
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
        <Title level={3} style={{ color: VI.deep }}>模板使用统计分析</Title>
        {stats && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="统计基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{stats.dept}</Text>
              <Text strong>统计周期：</Text><Text>{stats.period}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="统计输入">
          <div style={{ marginBottom: 12 }}>
            <Text strong>模板名：</Text><Tag color={VI.accent} style={{ marginLeft: 8 }}>{DEFAULT_INPUT.templateName}</Tag>
          </div>
          <div>
            <Text strong>使用次数：</Text><Text style={{ marginRight: 24 }}>{DEFAULT_INPUT.usedCount}</Text>
            <Text strong>总记录数：</Text><Text>{DEFAULT_INPUT.totalRecords}</Text>
          </div>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doAnalyze}>
            统计分析
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="统计结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="使用率" value={report.usageRate} suffix="%" precision={1} />
              <div>
                <Text strong>使用热度：</Text>
                <Tag
                  color={report.popularity === "高频使用" ? "green" : report.popularity === "中频使用" ? "blue" : report.popularity === "低频使用" ? "orange" : "default"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.popularity}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
