/**
 * 健澜科技 jlmedaios - 病历结构化数据统计前端页（M532-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历结构化数据统计（科室/周期/总记录/结构化记录/结构化率/差距）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface StructStats {
  dept: string;
  period: string;
}

interface StatsResult {
  structRate: number;
  gap: number;
}

interface StatsReport {
  structRate: number;
  gap: number;
}

export default function EmrStructStatsPage() {
  const [stats, setStats] = useState<StructStats | null>(null);
  const [totalRecords, setTotalRecords] = useState(500);
  const [structuredRecords, setStructuredRecords] = useState(450);
  const [result, setResult] = useState<StatsResult | null>(null);
  const [report, setReport] = useState<StatsReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-struct-stats", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setStats(data?.data ?? null);
        }
      } catch {
        message.error("加载统计基础数据失败");
      }
    };
    void fetchStats();
  }, []);

  const doCompute = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-struct-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ totalRecords, structuredRecords }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("统计完成");
      } else {
        message.error("统计失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历结构化数据统计</Title>
        {stats && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{stats.dept}</Text>
              <Text strong>周期：</Text><Text>{stats.period}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>总记录数：</Text>
              <Input
                type="number"
                value={totalRecords}
                onChange={(e) => setTotalRecords(Number(e.target.value))}
                style={{ width: 160, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>结构化记录数：</Text>
              <Input
                type="number"
                value={structuredRecords}
                onChange={(e) => setStructuredRecords(Number(e.target.value))}
                style={{ width: 160, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCompute}>
            执行统计
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="统计结果">
            <div style={{ display: "flex", gap: 32 }}>
              <Statistic title="结构化率(%)" value={report.structRate} precision={1} />
              <Statistic title="差距（未结构化数）" value={report.gap} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
