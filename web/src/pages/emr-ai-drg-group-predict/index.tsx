/**
 * 健澜科技 jlmedaios - 病历AI DRG 分组预测前端页（M552-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI DRG 分组预测（病历ID/科室/主诊断/是否手术/DRG组/权重）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDrgGroupPredict {
  recordId: string;
  dept: string;
}

interface PredictResult {
  drgGroup: string;
  weight: number;
}

interface PredictReport {
  drgGroup: string;
  weight: number;
}

const groupColor = (group: string): string => {
  if (group === "FM1") return "red";
  if (group === "FM2") return "orange";
  return "blue";
};

export default function EmrAiDrgGroupPredictPage() {
  const [base, setBase] = useState<AiDrgGroupPredict | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [hasSurgery, setHasSurgery] = useState(true);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [report, setReport] = useState<PredictReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-drg-group-predict", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI DRG 分组预测基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doPredict = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-drg-group-predict", {
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
        <Title level={3} style={{ color: VI.deep }}>病历AI DRG 分组预测</Title>
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
            <Text strong>主诊断：</Text>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              style={{ width: 200 }}
              placeholder="如：急性心梗 / 上呼吸道感染"
            />
            <Text strong>是否手术：</Text>
            <Switch checked={hasSurgery} onChange={setHasSurgery} checkedChildren="手术" unCheckedChildren="非手术" />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doPredict}>
              预测 DRG 分组
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="预测结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>DRG组：</Text>
                <Tag color={groupColor(report.drgGroup)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.drgGroup}
                </Tag>
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
