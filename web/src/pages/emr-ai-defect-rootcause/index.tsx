/**
 * 健澜科技 jlmedaios - 病历AI缺陷根因分析前端页（M547-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI缺陷根因分析（病历ID/科室/缺陷类型/发生频次/根因分析/严重级别）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDefectRootcause {
  recordId: string;
  dept: string;
}

interface RootcauseResult {
  rootCause: string;
  level: string;
}

interface RootcauseReport {
  rootCause: string;
  level: string;
}

const levelColor = (level: string): string => {
  if (level === "高") return "red";
  return "orange";
};

export default function EmrAiDefectRootcausePage() {
  const [base, setBase] = useState<AiDefectRootcause | null>(null);
  const [defectType, setDefectType] = useState("缺少签名");
  const [frequency, setFrequency] = useState(6);
  const [result, setResult] = useState<RootcauseResult | null>(null);
  const [report, setReport] = useState<RootcauseReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-defect-rootcause", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 缺陷根因分析基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-defect-rootcause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ defectType, frequency }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("根因分析完成");
      } else {
        message.error("根因分析失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI缺陷根因分析</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="分析输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>缺陷类型：</Text>
              <Input value={defectType} onChange={(e) => setDefectType(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>发生频次：</Text>
              <Input
                type="number"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAnalyze}>
            生成根因分析
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="根因分析结果">
            <Row gutter={24}>
              <Col span={16}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>根因分析：</Text>
                  <Text style={{ marginLeft: 8, fontSize: 16 }}>{report.rootCause}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>严重级别：</Text>
                  <Tag color={levelColor(report.level)} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.level}
                  </Tag>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
