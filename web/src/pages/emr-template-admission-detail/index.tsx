/**
 * 健澜科技 jlmedaios - 入院记录模板细化前端页（M523-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：入院记录模板细化（科室/模板版本/段落列表/患者姓名/字段数/渲染长度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AdmissionDetail {
  dept: string;
  templateVersion: string;
}

interface RenderResult {
  fieldCount: number;
  renderedLength: number;
}

interface DetailReport {
  fieldCount: number;
  renderedLength: number;
}

const DEFAULT_SECTIONS = ["主诉", "现病史", "既往史"];

export default function EmrTemplateAdmissionDetailPage() {
  const [detail, setDetail] = useState<AdmissionDetail | null>(null);
  const [sections] = useState(DEFAULT_SECTIONS);
  const [patientName, setPatientName] = useState("张三");
  const [result, setResult] = useState<RenderResult | null>(null);
  const [report, setReport] = useState<DetailReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-admission-detail", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setDetail(data?.data ?? null);
        }
      } catch {
        message.error("加载细化基础数据失败");
      }
    };
    void fetchDetail();
  }, []);

  const doRender = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-admission-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ sections, patientName }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("渲染完成");
      } else {
        message.error("渲染失败");
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
        <Title level={3} style={{ color: VI.deep }}>入院记录模板细化</Title>
        {detail && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="细化基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{detail.dept}</Text>
              <Text strong>模板版本：</Text>
              <Tag color={VI.accent} style={{ marginLeft: 8 }}>{detail.templateVersion}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="模板段落">
          <List
            dataSource={sections}
            renderItem={(item) => (
              <List.Item>
                <Tag color="blue">{item}</Tag>
              </List.Item>
            )}
          />
        </Card>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="渲染输入">
          <Row gutter={16}>
            <Col span={12}>
              <Text>患者姓名</Text>
              <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doRender}>
            渲染入院模板
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="渲染结果">
            <div style={{ display: "flex", gap: 32 }}>
              <Statistic title="字段数" value={report.fieldCount} />
              <Statistic title="渲染长度" value={report.renderedLength} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
