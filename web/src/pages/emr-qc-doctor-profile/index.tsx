/**
 * 健澜科技 jlmedaios - 医生质控个人档案前端页（M542-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：医生质控个人档案（医生ID/姓名/总病历数/缺陷数/平均分/缺陷率/等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DoctorProfile {
  doctorId: string;
  doctorName: string;
}

interface ProfileResult {
  doctorId: string;
  defectRate: number;
  level: string;
}

interface ProfileReport {
  doctorId: string;
  defectRate: number;
  level: string;
}

const levelColor = (level: string): string => {
  if (level === "优秀") return "green";
  if (level === "合格") return "blue";
  return "red";
};

export default function EmrQcDoctorProfilePage() {
  const [base, setBase] = useState<DoctorProfile | null>(null);
  const [doctorId, setDoctorId] = useState("D001");
  const [totalRecords, setTotalRecords] = useState(200);
  const [defectCount, setDefectCount] = useState(8);
  const [avgScore, setAvgScore] = useState(95);
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-doctor-profile", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载医生档案基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doLoad = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-doctor-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ doctorId, totalRecords, defectCount, avgScore }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("档案加载完成");
      } else {
        message.error("档案加载失败");
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
        <Title level={3} style={{ color: VI.deep }}>医生质控个人档案</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>医生ID：</Text><Text style={{ marginRight: 24 }}>{base.doctorId}</Text>
              <Text strong>姓名：</Text><Tag color="blue">{base.doctorName}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="档案输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>医生ID：</Text>
              <Input value={doctorId} onChange={(e) => setDoctorId(e.target.value)} style={{ width: 120, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>总病历数：</Text>
              <Input
                type="number"
                value={totalRecords}
                onChange={(e) => setTotalRecords(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>缺陷数：</Text>
              <Input
                type="number"
                value={defectCount}
                onChange={(e) => setDefectCount(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>平均分：</Text>
              <Input
                type="number"
                value={avgScore}
                onChange={(e) => setAvgScore(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doLoad}>
            加载档案
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="档案结果">
            <Row gutter={24}>
              <Col span={8}>
                <Statistic title="缺陷率（%）" value={report.defectRate} precision={1} suffix="%" valueStyle={{ color: "#cf1322" }} />
              </Col>
              <Col span={8}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>等级：</Text>
                  <Tag color={levelColor(report.level)} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.level}
                  </Tag>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
