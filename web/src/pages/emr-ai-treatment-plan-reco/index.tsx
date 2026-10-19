/**
 * 健澜科技 jlmedaios - 病历AI诊疗方案推荐前端页（M554-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI诊疗方案推荐（病历ID/科室/诊断/病情严重度/推荐方案/预计天数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Select, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiTreatmentPlanReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  planName: string;
  expectedDays: number;
}

interface RecoReport {
  planName: string;
  expectedDays: number;
}

export default function EmrAiTreatmentPlanRecoPage() {
  const [base, setBase] = useState<AiTreatmentPlanReco | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [severity, setSeverity] = useState("危重");
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-treatment-plan-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 诊疗方案推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-treatment-plan-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, severity }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("诊疗方案推荐完成");
      } else {
        message.error("诊疗方案推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI诊疗方案推荐</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="推荐输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>诊断：</Text>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              style={{ width: 200 }}
              placeholder="如：急性心梗 / 肺炎"
            />
            <Text strong>病情严重度：</Text>
            <Select
              value={severity}
              onChange={setSeverity}
              style={{ width: 120 }}
              options={[
                { value: "危重", label: "危重" },
                { value: "普通", label: "普通" },
              ]}
            />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              推荐诊疗方案
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <Row gutter={24}>
              <Col span={16}>
                <Text strong style={{ fontSize: 16 }}>推荐方案：</Text>
                <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.planName}
                </Tag>
              </Col>
              <Col span={8}>
                <Statistic title="预计天数" value={report.expectedDays} suffix="天" valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
