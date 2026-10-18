/**
 * 健澜科技 jlmedaios - 病历质量综合评分前端页（M536-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历质量综合评分（病历ID/科室/阻断项数/主要缺陷数/次要缺陷数/综合得分/等级）。
 * 避让 M465-B 旧 emr-quality-score（实时评分仪表盘），采用 -comprehensive 后缀。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QualityScore {
  recordId: string;
  dept: string;
}

interface ScoreResult {
  score: number;
  grade: string;
}

interface ScoreReport {
  score: number;
  grade: string;
}

export default function EmrQualityScoreComprehensivePage() {
  const [score, setScore] = useState<QualityScore | null>(null);
  const [block, setBlock] = useState(0);
  const [major, setMajor] = useState(0);
  const [minor, setMinor] = useState(1);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [report, setReport] = useState<ScoreReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-quality-score-comprehensive", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setScore(data?.data ?? null);
        }
      } catch {
        message.error("加载质量综合评分基础数据失败");
      }
    };
    void fetchScore();
  }, []);

  const doCompute = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-quality-score-comprehensive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ block, major, minor }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("评分完成");
      } else {
        message.error("评分失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历质量综合评分</Title>
        {score && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{score.recordId}</Text>
              <Text strong>科室：</Text><Text>{score.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="评分输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>阻断项数：</Text>
              <Input
                type="number"
                value={block}
                onChange={(e) => setBlock(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>主要缺陷数：</Text>
              <Input
                type="number"
                value={major}
                onChange={(e) => setMajor(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>次要缺陷数：</Text>
              <Input
                type="number"
                value={minor}
                onChange={(e) => setMinor(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCompute}>
            执行评分
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评分结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="综合得分" value={report.score} />
              <div>
                <Text strong>等级：</Text>
                <Tag color={report.grade === "优秀" ? "green" : report.grade === "良好" ? "blue" : report.grade === "合格" ? "orange" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.grade}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
