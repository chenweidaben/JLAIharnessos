/**
 * 健澜科技 jlmedaios - 质控-会诊记录联动前端页（M516-D，V14，EMR 深化四模块，M516 收官）
 *
 * 深海蓝VI：质控-会诊记录联动（记录ID/会诊科室/会诊类型/一致性检查）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ConsultLink {
  recordId: string;
  consultDept: string;
  consultType: string;
}

interface CheckResult {
  pass: boolean;
  defects: string[];
}

interface CheckReport {
  pass: boolean;
  defectCount: number;
}

export default function EmrQcConsultLinkPage() {
  const [link, setLink] = useState<ConsultLink | null>(null);
  const [hasRequest, setHasRequest] = useState(true);
  const [hasOpinion, setHasOpinion] = useState(true);
  const [hasReply, setHasReply] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-consult-link", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLink(data?.data ?? null);
        }
      } catch {
        message.error("加载会诊联动失败");
      }
    };
    void fetchLink();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-consult-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasRequest, hasOpinion, hasReply }),
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
        <Title level={3} style={{ color: VI.deep }}>质控-会诊记录联动</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="会诊联动数据">
          {link && (
            <div>
              <Text strong>记录ID：</Text><Text style={{ marginRight: 24 }}>{link.recordId}</Text>
              <Text strong>会诊科室：</Text><Text style={{ marginRight: 24 }}>{link.consultDept}</Text>
              <Text strong>会诊类型：</Text>
              <Tag color={VI.accent}>{link.consultType}</Tag>
            </div>
          )}
        </Card>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="会诊一致性检查">
          <div style={{ marginBottom: 16 }}>
            <Checkbox checked={hasRequest} onChange={(e) => setHasRequest(e.target.checked)} style={{ marginRight: 24 }}>有会诊申请记录</Checkbox>
            <Checkbox checked={hasOpinion} onChange={(e) => setHasOpinion(e.target.checked)} style={{ marginRight: 24 }}>有会诊意见记录</Checkbox>
            <Checkbox checked={hasReply} onChange={(e) => setHasReply(e.target.checked)}>有会诊回复</Checkbox>
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
