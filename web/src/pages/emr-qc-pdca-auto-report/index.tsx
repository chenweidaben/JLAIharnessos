/**
 * 健澜科技 jlmedaios - 质控PDCA报告自动生成前端页（M518-D，V14，EMR 深化四模块，M518 收官，避让 -auto）
 *
 * 深海蓝VI：质控PDCA报告自动生成（项目名/科室/阶段/改进前分/改进后分/改进幅度/改进率/状态）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PdcaReport {
  projectName: string;
  dept: string;
  phase: string;
}

interface PdcaResult {
  improvement: number;
  improvementRate: number;
}

interface PdcaSummary {
  status: string;
}

export default function EmrQcPdcaReportAutoPage() {
  const [report, setReport] = useState<PdcaReport | null>(null);
  const [projectName, setProjectName] = useState("病历书写质量改进");
  const [dept, setDept] = useState("心内科");
  const [phase, setPhase] = useState("Check");
  const [beforeScore, setBeforeScore] = useState(70);
  const [afterScore, setAfterScore] = useState(85);
  const [result, setResult] = useState<PdcaResult | null>(null);
  const [summary, setSummary] = useState<PdcaSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-pdca-auto-report", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setReport(data?.data ?? null);
        }
      } catch {
        message.error("加载PDCA报告基础数据失败");
      }
    };
    void fetchReport();
  }, []);

  const doGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-pdca-auto-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          projectName,
          dept,
          phase,
          metrics: { beforeScore, afterScore },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setSummary(data?.data?.summary ?? null);
        message.success("PDCA报告生成完成");
      } else {
        message.error("生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控PDCA报告自动生成</Title>
        {report && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="PDCA报告基础数据">
            <div>
              <Text strong>项目名称：</Text><Text style={{ marginRight: 24 }}>{report.projectName}</Text>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{report.dept}</Text>
              <Text strong>当前阶段：</Text>
              <Tag color={VI.accent}>{report.phase}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="改进指标输入">
          <Row gutter={16}>
            <Col span={8}>
              <Text>项目名称</Text>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={4}>
              <Text>科室</Text>
              <Input value={dept} onChange={(e) => setDept(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={4}>
              <Text>当前阶段</Text>
              <Input value={phase} onChange={(e) => setPhase(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={4}>
              <Text>改进前分</Text>
              <InputNumber value={beforeScore} onChange={(v) => setBeforeScore(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={4}>
              <Text>改进后分</Text>
              <InputNumber value={afterScore} onChange={(v) => setAfterScore(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doGenerate}>
            生成PDCA报告
          </Button>
        </Card>
        {result && summary && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="PDCA结果">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="改进幅度" value={result.improvement} />
              </Col>
              <Col span={6}>
                <Statistic title="改进率(%)" value={result.improvementRate} suffix=" %" />
              </Col>
              <Col span={12}>
                <Text strong>状态：</Text>
                <Tag
                  color={summary.status === "显著改进" ? "green" : summary.status === "持续改进" ? "blue" : summary.status === "基本达标" ? "orange" : "red"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {summary.status}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
