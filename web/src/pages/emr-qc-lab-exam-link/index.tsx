/**
 * 健澜科技 jlmedaios - 质控-检验检查联动前端页（M514-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控-检验检查联动（记录ID/检验数/检查数/一致性检查）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface LabExamLink {
  recordId: string;
  labCount: number;
  examCount: number;
}

interface CheckResult {
  pass: boolean;
  defects: string[];
}

interface CheckReport {
  pass: boolean;
  defectCount: number;
}

export default function EmrQcLabExamLinkPage() {
  const [link, setLink] = useState<LabExamLink | null>(null);
  const [hasLabReport, setHasLabReport] = useState(true);
  const [hasExamReport, setHasExamReport] = useState(true);
  const [hasDiagnosis, setHasDiagnosis] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-lab-exam-link", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLink(data?.data ?? null);
        }
      } catch {
        message.error("加载检验检查联动失败");
      }
    };
    void fetchLink();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-lab-exam-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasLabReport, hasExamReport, hasDiagnosis }),
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
        <Title level={3} style={{ color: VI.deep }}>质控-检验检查联动</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检验检查联动数据">
          {link && (
            <div>
              <Text strong>记录ID：</Text><Text style={{ marginRight: 24 }}>{link.recordId}</Text>
              <Text strong>检验数：</Text><Text style={{ marginRight: 24 }}>{link.labCount}</Text>
              <Text strong>检查数：</Text><Text>{link.examCount}</Text>
            </div>
          )}
        </Card>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检验检查一致性检查">
          <div style={{ marginBottom: 16 }}>
            <Checkbox checked={hasLabReport} onChange={(e) => setHasLabReport(e.target.checked)} style={{ marginRight: 24 }}>有检验报告</Checkbox>
            <Checkbox checked={hasExamReport} onChange={(e) => setHasExamReport(e.target.checked)} style={{ marginRight: 24 }}>有检查报告</Checkbox>
            <Checkbox checked={hasDiagnosis} onChange={(e) => setHasDiagnosis(e.target.checked)}>有诊断</Checkbox>
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
