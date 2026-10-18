/**
 * 健澜科技 jlmedaios - 质控规则对比分析前端页（M519-D，V14，EMR 深化四模块，M519 收官）
 *
 * 深海蓝VI：质控规则对比分析（科室A/科室B/规则名/通过率差/规则数差/优势科室/结论）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RuleCompare {
  deptA: string;
  deptB: string;
  ruleName: string;
}

interface CompareResult {
  passRateDiff: number;
  ruleCountDiff: number;
  betterDept: string;
}

interface CompareReport {
  conclusion: string;
}

export default function EmrQcRuleComparePage() {
  const [compare, setCompare] = useState<RuleCompare | null>(null);
  const [deptA, setDeptA] = useState("心内科");
  const [passRateA, setPassRateA] = useState(85);
  const [ruleCountA, setRuleCountA] = useState(20);
  const [deptB, setDeptB] = useState("普外科");
  const [passRateB, setPassRateB] = useState(92);
  const [ruleCountB, setRuleCountB] = useState(25);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [report, setReport] = useState<CompareReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompare = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-rule-compare", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setCompare(data?.data ?? null);
        }
      } catch {
        message.error("加载规则对比基础数据失败");
      }
    };
    void fetchCompare();
  }, []);

  const doCompare = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-rule-compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          setA: { dept: deptA, passRate: passRateA, ruleCount: ruleCountA },
          setB: { dept: deptB, passRate: passRateB, ruleCount: ruleCountB },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("规则对比完成");
      } else {
        message.error("对比失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控规则对比分析</Title>
        {compare && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="规则对比基础数据">
            <div>
              <Text strong>科室A：</Text><Text style={{ marginRight: 24 }}>{compare.deptA}</Text>
              <Text strong>科室B：</Text><Text style={{ marginRight: 24 }}>{compare.deptB}</Text>
              <Text strong>规则名：</Text><Text>{compare.ruleName}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="规则集输入">
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>科室A</Text>
              <div style={{ marginTop: 8 }}>
                <Input value={deptA} onChange={(e) => setDeptA(e.target.value)} style={{ maxWidth: 200 }} />
              </div>
              <div style={{ marginTop: 8 }}>
                <Text>通过率：</Text>
                <InputNumber value={passRateA} onChange={(v) => setPassRateA(Number(v ?? 0))} style={{ marginLeft: 8, width: 120 }} />
              </div>
              <div style={{ marginTop: 8 }}>
                <Text>规则数：</Text>
                <InputNumber value={ruleCountA} onChange={(v) => setRuleCountA(Number(v ?? 0))} style={{ marginLeft: 8, width: 120 }} />
              </div>
            </Col>
            <Col span={12}>
              <Text strong>科室B</Text>
              <div style={{ marginTop: 8 }}>
                <Input value={deptB} onChange={(e) => setDeptB(e.target.value)} style={{ maxWidth: 200 }} />
              </div>
              <div style={{ marginTop: 8 }}>
                <Text>通过率：</Text>
                <InputNumber value={passRateB} onChange={(v) => setPassRateB(Number(v ?? 0))} style={{ marginLeft: 8, width: 120 }} />
              </div>
              <div style={{ marginTop: 8 }}>
                <Text>规则数：</Text>
                <InputNumber value={ruleCountB} onChange={(v) => setRuleCountB(Number(v ?? 0))} style={{ marginLeft: 8, width: 120 }} />
              </div>
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doCompare}>
            对比规则集
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="对比结果">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="通过率差(%)" value={result.passRateDiff} suffix=" %" />
              </Col>
              <Col span={8}>
                <Statistic title="规则数差" value={result.ruleCountDiff} />
              </Col>
              <Col span={8}>
                <Text strong>优势科室：</Text>
                <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{result.betterDept}</Tag>
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Text strong>结论：</Text>
              <Text style={{ marginLeft: 8 }}>{report.conclusion}</Text>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
