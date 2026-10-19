/**
 * 健澜科技 jlmedaios - 病历AI病历逻辑一致性检查前端页（M553-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI病历逻辑一致性检查（病历ID/科室/入院诊断/出院诊断/是否一致/问题数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiRecordConsistencyCheck {
  recordId: string;
  dept: string;
}

interface CheckResult {
  isConsistent: boolean;
  issueCount: number;
}

interface CheckReport {
  isConsistent: boolean;
  issueCount: number;
}

export default function EmrAiRecordConsistencyCheckPage() {
  const [base, setBase] = useState<AiRecordConsistencyCheck | null>(null);
  const [admissionDiagnosis, setAdmissionDiagnosis] = useState("急性心梗");
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState("急性心梗");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-record-consistency-check", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 病历逻辑一致性检查基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-record-consistency-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ admissionDiagnosis, dischargeDiagnosis }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("一致性检查完成");
      } else {
        message.error("一致性检查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI病历逻辑一致性检查</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检查输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>入院诊断：</Text>
            <Input
              value={admissionDiagnosis}
              onChange={(e) => setAdmissionDiagnosis(e.target.value)}
              style={{ width: 200 }}
            />
            <Text strong>出院诊断：</Text>
            <Input
              value={dischargeDiagnosis}
              onChange={(e) => setDischargeDiagnosis(e.target.value)}
              style={{ width: 200 }}
            />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCheck}>
              检查逻辑一致性
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检查结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>是否一致：</Text>
                <Tag color={report.isConsistent ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.isConsistent ? "一致" : "不一致"}
                </Tag>
              </Col>
              <Col span={12}>
                <Statistic title="问题数" value={report.issueCount} valueStyle={{ color: report.issueCount > 0 ? "#cf1322" : VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
