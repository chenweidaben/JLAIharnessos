/**
 * 健澜科技 jlmedaios - 质控规则模拟测试前端页（M519-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控规则模拟测试（规则名/用例数/通过数/失败数/通过率/状态）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, InputNumber, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RuleSimulator {
  ruleName: string;
  testCases: number;
}

interface SimulationResult {
  passRate: number;
  failCount: number;
}

interface SimulatorReport {
  passRate: number;
  status: string;
}

export default function EmrQcRuleSimulatorPage() {
  const [simulator, setSimulator] = useState<RuleSimulator | null>(null);
  const [passCount, setPassCount] = useState(45);
  const [failCount, setFailCount] = useState(5);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [report, setReport] = useState<SimulatorReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSimulator = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-rule-simulator", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setSimulator(data?.data ?? null);
        }
      } catch {
        message.error("加载模拟测试基础数据失败");
      }
    };
    void fetchSimulator();
  }, []);

  const doRun = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-rule-simulator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          results: { pass: passCount, fail: failCount },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("模拟测试运行完成");
      } else {
        message.error("运行失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控规则模拟测试</Title>
        {simulator && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="模拟测试基础数据">
            <div>
              <Text strong>规则名：</Text><Text style={{ marginRight: 24 }}>{simulator.ruleName}</Text>
              <Text strong>用例数：</Text><Text style={{ marginRight: 24 }}>{simulator.testCases}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="测试结果输入">
          <div style={{ marginBottom: 16 }}>
            <Text>通过数</Text>
            <InputNumber value={passCount} onChange={(v) => setPassCount(Number(v ?? 0))} style={{ marginLeft: 8, width: 120 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text>失败数</Text>
            <InputNumber value={failCount} onChange={(v) => setFailCount(Number(v ?? 0))} style={{ marginLeft: 8, width: 120 }} />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRun}>
            运行模拟测试
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="模拟结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="通过率(%)" value={result.passRate} suffix=" %" />
              <Statistic title="失败数" value={result.failCount} />
              <div>
                <Text strong>状态：</Text>
                <Tag
                  color={report.status === "通过" ? "green" : report.status === "基本通过" ? "blue" : "red"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.status}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
