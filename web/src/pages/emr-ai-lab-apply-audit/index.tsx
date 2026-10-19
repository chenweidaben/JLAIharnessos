/**
 * 健澜科技 jlmedaios - 病历AI检验申请合理性审查前端页（M561-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI检验申请合理性审查（病历ID/科室/检验项目/年龄/是否已有结果/是否合理/审查建议）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, InputNumber, Layout, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiLabApplyAudit {
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

export default function EmrAiLabApplyAuditPage() {
  const [base, setBase] = useState<AiLabApplyAudit | null>(null);
  const [testName, setTestName] = useState("血常规");
  const [patientAge, setPatientAge] = useState(45);
  const [hasResult, setHasResult] = useState(true);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-lab-apply-audit", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 检验申请合理性审查基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAudit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-lab-apply-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ testName, patientAge, hasResult }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检验申请合理性审查完成");
      } else {
        message.error("检验申请合理性审查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI检验申请合理性审查</Title>
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
            <Text strong>检验项目：</Text>
            <Input value={testName} onChange={(e) => setTestName(e.target.value)} style={{ width: 200 }} />
            <Text strong>年龄：</Text>
            <InputNumber min={0} max={130} value={patientAge} onChange={(v) => setPatientAge(Number(v ?? 0))} />
            <Text strong>已有结果：</Text>
            <Switch checked={hasResult} onChange={setHasResult} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAudit}>
              合理性审查
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审查结果">
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>是否合理：</Text>
                <Tag color={report.isRational ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.isRational ? "合理" : "不合理"}
                </Tag>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>审查建议：</Text>
                <Tag color={report.isRational ? "blue" : "orange"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.advice}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
