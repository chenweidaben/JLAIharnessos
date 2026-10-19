/**
 * 健澜科技 jlmedaios - 病历AI合理用药审查前端页（M554-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI合理用药审查（病历ID/科室/药品名称/患者年龄/是否过敏/是否合理/用药建议）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiRationalMedicationAudit {
  recordId: string;
  dept: string;
}

interface AuditResult {
  isRational: boolean;
  advice: string;
}

interface AuditReport {
  isRational: boolean;
  advice: string;
}

export default function EmrAiRationalMedicationAuditPage() {
  const [base, setBase] = useState<AiRationalMedicationAudit | null>(null);
  const [drugName, setDrugName] = useState("布洛芬");
  const [patientAge, setPatientAge] = useState(45);
  const [hasAllergy, setHasAllergy] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-rational-medication-audit", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 合理用药审查基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAudit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-rational-medication-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ drugName, patientAge, hasAllergy }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("合理用药审查完成");
      } else {
        message.error("合理用药审查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI合理用药审查</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="审查输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>药品名称：</Text>
            <Input
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              style={{ width: 180 }}
              placeholder="如：布洛芬 / 青霉素"
            />
            <Text strong>患者年龄：</Text>
            <Input
              type="number"
              value={patientAge}
              onChange={(e) => setPatientAge(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <Text strong>是否过敏：</Text>
            <Switch checked={hasAllergy} onChange={setHasAllergy} checkedChildren="过敏" unCheckedChildren="无" />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAudit}>
              审查合理用药
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审查结果">
            <Row gutter={24}>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>是否合理：</Text>
                <Tag color={report.isRational ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.isRational ? "合理" : "不合理"}
                </Tag>
              </Col>
              <Col span={16}>
                <Text strong style={{ fontSize: 16 }}>用药建议：</Text>
                <Text style={{ marginLeft: 8, fontSize: 16, color: report.isRational ? undefined : "#cf1322" }}>
                  {report.advice}
                </Text>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
