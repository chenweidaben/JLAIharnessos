/**
 * 健澜科技 jlmedaios - DRG 入组预测前端页（M535-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：DRG入组预测（病历ID/主诊断/是否手术/年龄/预测DRG组/权重）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DrgPredict {
  recordId: string;
  mainDiagnosis: string;
}

interface PredictResult {
  drgGroup: string;
  weight: number;
}

interface PredictReport {
  drgGroup: string;
  weight: number;
}

export default function EmrDrgPredictPage() {
  const [predict, setPredict] = useState<DrgPredict | null>(null);
  const [mainDiagnosis, setMainDiagnosis] = useState("心肌梗死");
  const [hasSurgery, setHasSurgery] = useState(true);
  const [age, setAge] = useState(65);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [report, setReport] = useState<PredictReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPredict = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-drg-predict", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setPredict(data?.data ?? null);
        }
      } catch {
        message.error("加载 DRG 预测基础数据失败");
      }
    };
    void fetchPredict();
  }, []);

  const doPredict = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-drg-predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ mainDiagnosis, hasSurgery, age }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("预测完成");
      } else {
        message.error("预测失败");
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
        <Title level={3} style={{ color: VI.deep }}>DRG 入组预测</Title>
        {predict && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{predict.recordId}</Text>
              <Text strong>主诊断：</Text><Text>{predict.mainDiagnosis}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="预测输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>主诊断：</Text>
              <Input value={mainDiagnosis} onChange={(e) => setMainDiagnosis(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>是否手术：</Text>
              <Switch checked={hasSurgery} onChange={setHasSurgery} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>年龄：</Text>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doPredict}>
            执行预测
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="预测结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>预测DRG组：</Text>
                <Tag color="blue" style={{ marginLeft: 8, fontSize: 16 }}>{report.drgGroup}</Tag>
              </div>
              <Statistic title="权重" value={report.weight} precision={1} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
