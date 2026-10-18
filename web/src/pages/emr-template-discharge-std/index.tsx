/**
 * 健澜科技 jlmedaios - 出院小结模板标准化前端页（M523-D，V14，EMR 深化四模块，M523 收官）
 *
 * 深海蓝VI：出院小结模板标准化（科室/标准版本/诊断/治疗/随访/标准化分/等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DischargeStd {
  dept: string;
  stdVersion: string;
}

interface StdResult {
  hasDiagnosis: boolean;
  hasTreatment: boolean;
  hasFollowUp: boolean;
  standardScore: number;
}

interface StdReport {
  standardScore: number;
  grade: string;
}

export default function EmrTemplateDischargeStdPage() {
  const [std, setStd] = useState<DischargeStd | null>(null);
  const [diagnosis, setDiagnosis] = useState("冠心病");
  const [treatment, setTreatment] = useState("PCI术后");
  const [followUp, setFollowUp] = useState("1月后复诊");
  const [result, setResult] = useState<StdResult | null>(null);
  const [report, setReport] = useState<StdReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStd = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-discharge-std", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setStd(data?.data ?? null);
        }
      } catch {
        message.error("加载标准化基础数据失败");
      }
    };
    void fetchStd();
  }, []);

  const doStandardize = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-discharge-std", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, treatment, followUp }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("标准化完成");
      } else {
        message.error("标准化失败");
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
        <Title level={3} style={{ color: VI.deep }}>出院小结模板标准化</Title>
        {std && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="标准化基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{std.dept}</Text>
              <Text strong>标准版本：</Text>
              <Tag color={VI.accent} style={{ marginLeft: 8 }}>{std.stdVersion}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="出院小结内容">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <Text strong>诊断</Text>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ marginTop: 4 }} />
            </div>
            <div>
              <Text strong>治疗</Text>
              <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} style={{ marginTop: 4 }} />
            </div>
            <div>
              <Text strong>随访</Text>
              <Input value={followUp} onChange={(e) => setFollowUp(e.target.value)} style={{ marginTop: 4 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doStandardize}>
            标准化出院模板
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="标准化结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="标准化分" value={report.standardScore} precision={1} />
              <div>
                <Text strong>等级：</Text>
                <Tag
                  color={report.grade === "完全标准化" ? "green" : report.grade === "基本标准化" ? "blue" : "orange"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.grade}
                </Tag>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <Text strong>字段完整性：</Text>
              <Tag color={result.hasDiagnosis ? "green" : "red"} style={{ marginLeft: 8 }}>诊断{result.hasDiagnosis ? "✓" : "✗"}</Tag>
              <Tag color={result.hasTreatment ? "green" : "red"} style={{ marginLeft: 8 }}>治疗{result.hasTreatment ? "✓" : "✗"}</Tag>
              <Tag color={result.hasFollowUp ? "green" : "red"} style={{ marginLeft: 8 }}>随访{result.hasFollowUp ? "✓" : "✗"}</Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
