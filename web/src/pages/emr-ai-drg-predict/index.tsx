/**
 * 健澜科技 jlmedaios - 病历AI DRG分组预测前端页（M544-D，V14，EMR 深化四模块，M544 收官）
 *
 * 深海蓝VI：病历AI DRG分组预测（病历ID/科室/诊断/是否手术/DRG组/权重）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDrgPredict {
  recordId: string;
  dept: string;
}

interface DrgResult {
  drgGroup: string;
  weight: number;
}

interface DrgReport {
  drgGroup: string;
  weight: number;
}

const drgColor = (group: string): string => {
  if (group === "FM1") return "red";
  if (group === "FM2") return "orange";
  return "default";
};

export default function EmrAiDrgPredictPage() {
  const [base, setBase] = useState<AiDrgPredict | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [hasSurgery, setHasSurgery] = useState(true);
  const [result, setResult] = useState<DrgResult | null>(null);
  const [report, setReport] = useState<DrgReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-drg-predict", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI DRG 预测基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doPredict = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-drg-predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, hasSurgery }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("DRG 分组预测完成");
      } else {
        message.error("DRG 分组预测失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI DRG分组预测</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="预测输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <Text strong>诊断：</Text>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>是否手术：</Text>
              <Switch checked={hasSurgery} onChange={setHasSurgery} style={{ marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doPredict}>
            预测 DRG 分组
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="预测结果">
            <Row gutter={24}>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>DRG组：</Text>
                  <Tag color={drgColor(report.drgGroup)} style={{ marginLeft: 8, fontSize: 18, padding: "4px 12px" }}>
                    {report.drgGroup}
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <Statistic title="权重" value={report.weight} precision={1} valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
