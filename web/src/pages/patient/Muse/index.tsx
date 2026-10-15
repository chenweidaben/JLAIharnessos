/**
 * 健澜科技 jlmedaios - 患者 Personal Agent（Patient MUSE）健康画像页（M117-A）
 *
 * 依据宪法第七章 7.7（患者 MUSE）：
 *   健康档案（慢病标签 / 用药过敏史）、就医偏好（偏好标签）、
 *   健康提醒（慢病随访 / 过敏告知 / 用药配药 / 复诊预约）。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 * 权限：医生端可看任意患者，患者端仅看本人（BFF 已强校验）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Layout,
  List,
  Row,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined, SafetyOutlined, MedicineBoxOutlined, HeartOutlined } from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';

type ReminderLevel = 'info' | 'warning' | 'critical';

interface HealthReminder {
  type: string;
  title: string;
  message: string;
  level: ReminderLevel;
}

/** 与 BFF GET /api/v1/patient/muse/:id 响应 data 对齐 */
interface PatientMuseData {
  demo: boolean;
  patientId: string;
  chronicConditions: string[];
  allergies: string[];
  preferenceTags: string[];
  healthReminders: HealthReminder[];
}

const LEVEL_COLOR: Record<ReminderLevel, string> = {
  critical: '#cf1322',
  warning: '#faad14',
  info: ACCENT,
};

const LEVEL_TAG: Record<ReminderLevel, string> = {
  critical: '紧急',
  warning: '提醒',
  info: '建议',
};

export default function PatientMusePage() {
  // 患者号：医生端可通过路由参数 ?patientId=xxx 查看指定患者；
  // 患者端缺省即本人（BFF 已校验 :id === c.user.id）。
  const [patientId, setPatientId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('patientId') ?? 'me';
    }
    return 'me';
  });
  const [data, setData] = useState<PatientMuseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async (pid: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await get<PatientMuseData>(`/patient/muse/${encodeURIComponent(pid)}`, undefined, {
        silent: true,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '患者健康画像加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(patientId);
  }, [load, patientId]);

  const isEmpty = useMemo(
    () =>
      !!data &&
      data.chronicConditions.length === 0 &&
      data.allergies.length === 0 &&
      data.preferenceTags.length === 0 &&
      data.healthReminders.length === 0,
    [data],
  );

  const criticalCount = (data?.healthReminders ?? []).filter((r) => r.level === 'critical').length;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: DEEP_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          患者 MUSE · 健康画像
        </Title>
        <div>
          {data?.demo && (
            <Badge count="演示数据" style={{ background: '#faad14', marginRight: 12 }} overflowCount={99} />
          )}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load(patientId)}>
            刷新
          </Button>
        </div>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error}
            action={
              <Button size="small" danger onClick={() => void load(patientId)}>
                重试
              </Button>
            }
          />
        )}

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="加载患者健康画像…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无健康画像数据：就诊后系统将自动沉淀慢病标签、用药过敏史与就医偏好" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 健康档案：慢病 + 过敏 */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span style={{ color: '#fff' }}>
                    <HeartOutlined style={{ marginRight: 8 }} />
                    健康档案
                  </span>
                }
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                    慢性病（{(data?.chronicConditions ?? []).length}）
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    {(data?.chronicConditions ?? []).length === 0 ? (
                      <Text style={{ color: 'rgba(255,255,255,0.45)' }}>暂无慢病记录</Text>
                    ) : (
                      (data?.chronicConditions ?? []).map((c) => (
                        <Tag key={c} color={MID_BLUE} style={{ marginBottom: 6 }}>
                          <SafetyOutlined /> {c}
                        </Tag>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                    用药过敏史（{(data?.allergies ?? []).length}）
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    {(data?.allergies ?? []).length === 0 ? (
                      <Text style={{ color: 'rgba(255,255,255,0.45)' }}>暂无过敏记录</Text>
                    ) : (
                      (data?.allergies ?? []).map((a) => (
                        <Tag key={a} color="error" style={{ marginBottom: 6 }}>
                          <MedicineBoxOutlined /> {a}
                        </Tag>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </Col>

            {/* 就医偏好 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>就医偏好</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                {(data?.preferenceTags ?? []).length === 0 ? (
                  <Text style={{ color: 'rgba(255,255,255,0.45)' }}>
                    暂无偏好标签：随就诊与用药记录自动归纳
                  </Text>
                ) : (
                  (data?.preferenceTags ?? []).map((t) => (
                    <Tag key={t} color={ACCENT} style={{ marginBottom: 8 }}>
                      {t}
                    </Tag>
                  ))
                )}
              </Card>
            </Col>

            {/* 健康提醒 */}
            <Col span={24}>
              <Card
                title={
                  <span style={{ color: '#fff' }}>
                    健康提醒
                    {criticalCount > 0 && (
                      <Tag color="error" style={{ marginLeft: 8 }}>
                        {criticalCount} 条紧急
                      </Tag>
                    )}
                  </span>
                }
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <List
                  size="small"
                  dataSource={data?.healthReminders ?? []}
                  renderItem={(item) => (
                    <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width: '100%' }}>
                        <Text style={{ color: '#fff' }}>
                          <Tag color={LEVEL_COLOR[item.level]}>{LEVEL_TAG[item.level]}</Tag>
                          {item.title}
                        </Text>
                        <div>
                          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                            {item.message}
                          </Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
