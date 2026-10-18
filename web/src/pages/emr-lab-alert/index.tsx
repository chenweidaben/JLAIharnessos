/**
 * 健澜科技 jlmedaios - 病历检验异常值提醒前端页（M537-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历检验异常值提醒（病历ID/科室/检验项/实测值/参考下限/参考上限/是否异常/方向/提示）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface LabAlert {
  recordId: string;
  dept: string;
}

interface AlertResult {
  abnormal: boolean;
  direction: string;
  message: string;
}

interface AlertReport {
  abnormal: boolean;
  direction: string;
  message: string;
}

export default function EmrLabAlertPage() {
  const [alert, setAlert] = useState<LabAlert | null>(null);
  const [testName, setTestName] = useState("白细胞");
  const [value, setValue] = useState(12.5);
  const [normalMin, setNormalMin] = useState(4);
  const [normalMax, setNormalMax] = useState(10);
  const [result, setResult] = useState<AlertResult | null>(null);
  const [report, setReport] = useState<AlertReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-lab-alert", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setAlert(data?.data ?? null);
        }
      } catch {
        message.error("加载检验提醒基础数据失败");
      }
    };
    void fetchAlert();
  }, []);

  const doDetect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-lab-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ testName, value, normalMin, normalMax }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检测完成");
      } else {
        message.error("检测失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历检验异常值提醒</Title>
        {alert && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{alert.recordId}</Text>
              <Text strong>科室：</Text><Text>{alert.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检测输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>检验项：</Text>
              <Input value={testName} onChange={(e) => setTestName(e.target.value)} style={{ width: 140, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>实测值：</Text>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>参考下限：</Text>
              <Input
                type="number"
                value={normalMin}
                onChange={(e) => setNormalMin(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>参考上限：</Text>
              <Input
                type="number"
                value={normalMax}
                onChange={(e) => setNormalMax(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doDetect}>
            执行检测
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检测结果">
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div>
                <Text strong>是否异常：</Text>
                <Tag color={report.abnormal ? "red" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.abnormal ? "异常" : "正常"}
                </Tag>
              </div>
              <div>
                <Text strong>方向：</Text>
                <Tag color={report.direction === "偏高" ? "red" : report.direction === "偏低" ? "orange" : "blue"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.direction}
                </Tag>
              </div>
              <div style={{ width: "100%" }}>
                <Text strong>提示：</Text>
                <Text style={{ marginLeft: 8, color: report.abnormal ? "red" : "#666" }}>{report.message}</Text>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
