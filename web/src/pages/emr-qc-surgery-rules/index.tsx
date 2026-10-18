/**
 * 健澜科技 jlmedaios - 质控外科专科规则前端页（M509-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：外科专科质控规则（规则列表+检查结果）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CheckResult {
  pass: boolean;
  defects: string[];
}

interface CheckReport {
  pass: boolean;
  defectCount: number;
}

export default function EmrQcSurgeryRulesPage() {
  const [rules, setRules] = useState<string[]>([]);
  const [hasOperativeNote, setHasOperativeNote] = useState(true);
  const [hasAnesthesiaRecord, setHasAnesthesiaRecord] = useState(true);
  const [hasPostOpRecord, setHasPostOpRecord] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-surgery-rules", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRules(data?.data?.rules ?? []);
        }
      } catch {
        message.error("加载规则失败");
      }
    };
    void fetchRules();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-surgery-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasOperativeNote, hasAnesthesiaRecord, hasPostOpRecord }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检查完成");
      } else {
        message.error("检查失败");
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
        <Title level={3} style={{ color: VI.deep }}>外科专科质控规则</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="规则列表">
          <List
            dataSource={rules}
            renderItem={(item, index) => (
              <List.Item>
                <Tag color={VI.accent} style={{ width: 32 }}>{index + 1}</Tag>
                <Text>{item}</Text>
              </List.Item>
            )}
          />
        </Card>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="病历检查">
          <div style={{ marginBottom: 16 }}>
            <Checkbox checked={hasOperativeNote} onChange={(e) => setHasOperativeNote(e.target.checked)} style={{ marginRight: 24 }}>有手术记录</Checkbox>
            <Checkbox checked={hasAnesthesiaRecord} onChange={(e) => setHasAnesthesiaRecord(e.target.checked)} style={{ marginRight: 24 }}>有麻醉记录</Checkbox>
            <Checkbox checked={hasPostOpRecord} onChange={(e) => setHasPostOpRecord(e.target.checked)}>有术后记录</Checkbox>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCheck}>
            检查
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检查结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>结果：</Text>
              <Tag color={report.pass ? "green" : "red"} style={{ marginLeft: 8 }}>
                {report.pass ? "通过" : "不通过"}
              </Tag>
              <Text style={{ marginLeft: 16 }}>缺陷数：{report.defectCount}</Text>
            </div>
            {result.defects.length > 0 && (
              <List
                dataSource={result.defects}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color="red">{item}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
