/**
 * 健澜科技 jlmedaios - 病历AI用药相互作用审查前端页（M550-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI用药相互作用审查（病历ID/科室/药物A/药物B/是否有相互作用/严重级别/建议）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDrugInteraction {
  recordId: string;
  dept: string;
}

interface InteractionResult {
  hasInteraction: boolean;
  level: string;
  advice: string;
}

interface InteractionReport {
  hasInteraction: boolean;
  level: string;
  advice: string;
}

export default function EmrAiDrugInteractionPage() {
  const [base, setBase] = useState<AiDrugInteraction | null>(null);
  const [drugA, setDrugA] = useState("华法林");
  const [drugB, setDrugB] = useState("阿司匹林");
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [report, setReport] = useState<InteractionReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-drug-interaction", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 用药相互作用审查基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-drug-interaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ drugA, drugB }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("用药相互作用审查完成");
      } else {
        message.error("用药相互作用审查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI用药相互作用审查</Title>
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
            <Text strong>药物A：</Text>
            <Input
              value={drugA}
              onChange={(e) => setDrugA(e.target.value)}
              style={{ width: 160 }}
              placeholder="如：华法林"
            />
            <Text strong>药物B：</Text>
            <Input
              value={drugB}
              onChange={(e) => setDrugB(e.target.value)}
              style={{ width: 160 }}
              placeholder="如：阿司匹林"
            />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCheck}>
              审查相互作用
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审查结果">
            <Row gutter={24}>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>是否有相互作用：</Text>
                <Tag color={report.hasInteraction ? "red" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.hasInteraction ? "有" : "无"}
                </Tag>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>严重级别：</Text>
                <Tag color={report.level === "严重" ? "red" : "default"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.level}
                </Tag>
              </Col>
              <Col span={24}>
                <div style={{ marginTop: 16, padding: 12, background: report.hasInteraction ? "#fff1f0" : "#f6ffed", borderRadius: 4 }}>
                  <Text strong>建议：</Text>
                  <Text style={{ marginLeft: 8 }}>{report.advice}</Text>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
