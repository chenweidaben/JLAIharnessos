/**
 * 健澜科技 jlmedaios - 质控考核证书前端页（M503-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：考核证书卡片（姓名/考试名/成绩/等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Tag, Typography, message } from "antd";

const { Content, Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Certificate {
  user: string;
  examName: string;
  score: number;
}

interface Verify {
  valid: boolean;
  level: string;
}

export default function EmrQcExamCertificatePage() {
  const [cert, setCert] = useState<Certificate | null>(null);
  const [verify, setVerify] = useState<Verify | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-exam-certificate", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setCert(data?.data?.certificate ?? null);
          setVerify(data?.data?.verify ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>考核证书</Title>
        {cert && (
          <Card
            style={{
              background: "linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)",
              border: `2px solid ${VI.accent}`,
              borderRadius: 8,
            }}
            headStyle={{ background: VI.deep, color: "#fff", textAlign: "center" }}
            title="病历质控考核合格证书"
          >
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <Text style={{ fontSize: 16 }}>兹证明</Text>
              <Title level={2} style={{ color: VI.mid, margin: "16px 0" }}>{cert.user}</Title>
              <Text style={{ fontSize: 14 }}>在</Text>
              <Text strong style={{ margin: "0 8px", fontSize: 14 }}>{cert.examName}</Text>
              <Text style={{ fontSize: 14 }}>中取得</Text>
              <Title level={3} style={{ color: VI.accent, margin: "16px 0" }}>{cert.score} 分</Title>
              {verify && (
                <Tag
                  color={verify.level === "优秀" ? "gold" : verify.level === "良好" ? "blue" : verify.level === "及格" ? "green" : "red"}
                  style={{ fontSize: 16, padding: "4px 16px" }}
                >
                  {verify.level}
                </Tag>
              )}
              {verify && (
                <div style={{ marginTop: 24 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    证书状态：{verify.valid ? "有效" : "无效"}
                  </Text>
                </div>
              )}
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
