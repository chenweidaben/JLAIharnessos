/**
 * 健澜科技 jlmedaios - 病历质量科室对比前端页（M536-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历质量科室对比（A科室/B科室/A得分/B得分/差值/领先科室）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QualityCompare {
  deptA: string;
  deptB: string;
}

interface CompareResult {
  diff: number;
  betterDept: string;
}

interface CompareReport {
  diff: number;
  betterDept: string;
}

export default function EmrQualityComparePage() {
  const [compare, setCompare] = useState<QualityCompare | null>(null);
  const [scoreA, setScoreA] = useState(92);
  const [scoreB, setScoreB] = useState(78);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [report, setReport] = useState<CompareReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompare = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-quality-compare", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setCompare(data?.data ?? null);
        }
      } catch {
        message.error("加载科室对比基础数据失败");
      }
    };
    void fetchCompare();
  }, []);

  const doCompare = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-quality-compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ scoreA, scoreB }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("对比完成");
      } else {
        message.error("对比失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历质量科室对比</Title>
        {compare && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>A科室：</Text><Text style={{ marginRight: 24 }}>{compare.deptA}</Text>
              <Text strong>B科室：</Text><Text>{compare.deptB}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="对比输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>A得分：</Text>
              <Input
                type="number"
                value={scoreA}
                onChange={(e) => setScoreA(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>B得分：</Text>
              <Input
                type="number"
                value={scoreB}
                onChange={(e) => setScoreB(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCompare}>
            执行对比
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="对比结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="差值" value={report.diff} />
              <div>
                <Text strong>领先科室：</Text>
                <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{report.betterDept}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
