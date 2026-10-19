/**
 * 健澜科技 jlmedaios - 病历AI费用合理性审查前端页（M552-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI费用合理性审查（病历ID/科室/实际费用/预期费用/是否合理/偏差率%）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiCostRationalAudit {
  recordId: string;
  dept: string;
}

interface AuditResult {
  isReasonable: boolean;
  deviationPct: number;
}

interface AuditReport {
  isReasonable: boolean;
  deviationPct: number;
}

export default function EmrAiCostRationalAuditPage() {
  const [base, setBase] = useState<AiCostRationalAudit | null>(null);
  const [actualCost, setActualCost] = useState(10500);
  const [expectedCost, setExpectedCost] = useState(10000);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-cost-rational-audit", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 费用合理性审查基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAudit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-cost-rational-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ actualCost, expectedCost }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("费用合理性审查完成");
      } else {
        message.error("费用合理性审查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI费用合理性审查</Title>
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
            <Text strong>实际费用：</Text>
            <Input
              type="number"
              value={actualCost}
              onChange={(e) => setActualCost(Number(e.target.value))}
              style={{ width: 140 }}
            />
            <Text strong>预期费用：</Text>
            <Input
              type="number"
              value={expectedCost}
              onChange={(e) => setExpectedCost(Number(e.target.value))}
              style={{ width: 140 }}
            />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAudit}>
              审查费用合理性
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审查结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>是否合理：</Text>
                <Tag color={report.isReasonable ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.isReasonable ? "合理" : "不合理"}
                </Tag>
              </Col>
              <Col span={12}>
                <Statistic
                  title="偏差率(%)"
                  value={report.deviationPct}
                  precision={1}
                  valueStyle={{ color: Math.abs(report.deviationPct) > 20 ? "#cf1322" : VI.accent }}
                />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
