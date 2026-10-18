/**
 * 健澜科技 jlmedaios - 个人质控档案自动生成前端页（M518-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：个人质控档案自动生成（医生/科室/病历总数/通过率/缺陷数/合规率/等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PersonalProfile {
  doctor: string;
  dept: string;
  totalRecords: number;
}

interface PersonalProfileResult {
  passRate: number;
  defectCount: number;
  complianceRate: number;
}

interface PersonalProfileSummary {
  grade: string;
}

export default function EmrQcPersonalProfilePage() {
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [doctor, setDoctor] = useState("张医生");
  const [dept, setDept] = useState("心内科");
  const [totalRecords, setTotalRecords] = useState(120);
  const [passRate, setPassRate] = useState(95);
  const [defectCount, setDefectCount] = useState(6);
  const [complianceRate, setComplianceRate] = useState(88.5);
  const [result, setResult] = useState<PersonalProfileResult | null>(null);
  const [summary, setSummary] = useState<PersonalProfileSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-personal-profile", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setProfile(data?.data ?? null);
        }
      } catch {
        message.error("加载个人档案基础数据失败");
      }
    };
    void fetchProfile();
  }, []);

  const doGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-personal-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          doctor,
          dept,
          totalRecords,
          stats: { passRate, defectCount, complianceRate },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setSummary(data?.data?.summary ?? null);
        message.success("档案生成完成");
      } else {
        message.error("生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>个人质控档案自动生成</Title>
        {profile && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="个人档案基础数据">
            <div>
              <Text strong>医生：</Text><Text style={{ marginRight: 24 }}>{profile.doctor}</Text>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{profile.dept}</Text>
              <Text strong>病历总数：</Text><Text>{profile.totalRecords}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="统计输入">
          <Row gutter={16}>
            <Col span={6}>
              <Text>医生</Text>
              <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={6}>
              <Text>科室</Text>
              <Input value={dept} onChange={(e) => setDept(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={4}>
              <Text>病历总数</Text>
              <InputNumber value={totalRecords} onChange={(v) => setTotalRecords(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={3}>
              <Text>通过率(%)</Text>
              <InputNumber value={passRate} onChange={(v) => setPassRate(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={3}>
              <Text>缺陷数</Text>
              <InputNumber value={defectCount} onChange={(v) => setDefectCount(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={2}>
              <Text>合规率</Text>
              <InputNumber value={complianceRate} onChange={(v) => setComplianceRate(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doGenerate}>
            生成档案
          </Button>
        </Card>
        {result && summary && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="档案结果">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="通过率(%)" value={result.passRate} suffix=" / 100" />
              </Col>
              <Col span={6}>
                <Statistic title="缺陷数" value={result.defectCount} />
              </Col>
              <Col span={6}>
                <Statistic title="合规率(%)" value={result.complianceRate} suffix=" / 100" />
              </Col>
              <Col span={6}>
                <Text strong>等级：</Text>
                <Tag
                  color={summary.grade === "优秀" ? "green" : summary.grade === "良好" ? "blue" : summary.grade === "合格" ? "orange" : "red"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {summary.grade}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
