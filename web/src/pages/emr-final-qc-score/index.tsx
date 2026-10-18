/**
 * 健澜科技 jlmedaios - 病历终末质控评分前端页（M527-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历终末质控评分（病历ID/科室/阻断缺陷数/主要缺陷数/次要缺陷数/终末分/等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, InputNumber, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface FinalQcScore {
  recordId: string;
  dept: string;
}

interface FinalScoreResult {
  finalScore: number;
  grade: string;
}

interface FinalScoreReport {
  finalScore: number;
  grade: string;
}

export default function EmrFinalQcScorePage() {
  const [score, setScore] = useState<FinalQcScore | null>(null);
  const [blockDefects, setBlockDefects] = useState(0);
  const [majorDefects, setMajorDefects] = useState(1);
  const [minorDefects, setMinorDefects] = useState(2);
  const [result, setResult] = useState<FinalScoreResult | null>(null);
  const [report, setReport] = useState<FinalScoreReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-final-qc-score", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setScore(data?.data ?? null);
        }
      } catch {
        message.error("加载终末评分基础数据失败");
      }
    };
    void fetchScore();
  }, []);

  const doCalculate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-final-qc-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ blockDefects, majorDefects, minorDefects }),
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
        <Title level={3} style={{ color: VI.deep }}>病历终末质控评分</Title>
        {score && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{score.recordId}</Text>
              <Text strong>科室：</Text><Text>{score.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="缺陷录入">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <Text strong>阻断缺陷（×15分）：</Text>
              <InputNumber value={blockDefects} onChange={(v) => setBlockDefects(Number(v ?? 0))} min={0} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>主要缺陷（×8分）：</Text>
              <InputNumber value={majorDefects} onChange={(v) => setMajorDefects(Number(v ?? 0))} min={0} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>次要缺陷（×3分）：</Text>
              <InputNumber value={minorDefects} onChange={(v) => setMinorDefects(Number(v ?? 0))} min={0} style={{ marginLeft: 8 }} />
            </div>
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCalculate}>
              计算终末分
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评分结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="终末分" value={report.finalScore} />
              <div>
                <Text strong>等级：</Text>
                <Tag
                  color={
                    report.grade === "优秀" ? "green" :
                    report.grade === "良好" ? "blue" :
                    report.grade === "合格" ? "orange" : "red"
                  }
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
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
