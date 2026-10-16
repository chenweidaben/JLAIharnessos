/**
 * 健澜科技 jlmedaios - 区域医疗协同页（M159-B）【集团化扩展·区域医疗协同】
 *
 * 面向医联体 / 集团管理者与接诊医师的一张协同工作台：
 *   ① 区域协同地图：本集团内医院 / 号源 / 设备 / 资源调配单（严格按 groupId 隔离，不串院）；
 *   ② 跨院转诊匹配：上转 / 下转 / 双向，命中专科 + 专家号共享；
 *   ③ 检验检查结果互认：跨院结果是否可被目标科室直接采信（互认名录 + 时效 + 质量）。
 *
 * 【中期路线图】本页对接 BFF 纯函数内核；后续接入真实 HIS / 号源中心时，
 *   前端交互保持不变，仅替换数据源。
 *
 * 深海蓝 VI：顶栏 #0A2540，主色 #4A90D9，警示橙 #d46b08，通过绿 #52c41a。
 * 【数据隔离】跨院患者号在后端已脱敏（P0****23），本页不展示任何原始 EMPI / PII。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Card, Col, Descriptions, Divider, Form, Input, Layout,
  Row, Select, Space, Spin, Statistic, Steps, Tag, Typography,
} from 'antd';
import {
  ApartmentOutlined, AuditOutlined, GlobalOutlined, SafetyCertificateOutlined,
  SwapOutlined, TeamOutlined,
} from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';
const OK_GREEN = '#52c41a';
const WARN_ORANGE = '#d46b08';

/** 集团 id（演示用；真实场景由登录态 / 上下文注入） */
const DEMO_GROUP_ID = 'grp_jianlan_001';

/** 与后端 RegionalMap 对齐 */
interface RegionalMap {
  groupId: string;
  total: number;
  totalBeds: number;
  totalExpertSlots: number;
  totalDevices: number;
  byLevel: Record<string, number>;
  byRegion: Record<string, number>;
  dispatches: Array<{
    dispatchId: string;
    resourceType: string;
    resourceName: string;
    fromHospitalId: string;
    toHospitalId: string;
    reason: string;
  }>;
  hospitals: Array<{
    hospitalId: string;
    name: string;
    level: string;
    region: string;
    expertSlots: number;
    capacity: number;
  }>;
}

/** 与后端 ReferralMatch 对齐 */
interface ReferralMatch {
  direction: '上转' | '下转' | '双向';
  matchedSpecialty: string;
  score: number;
  reason: string;
  accepted: boolean;
  sharedExpertSlot: number;
  maskedPatientId: string;
}

/** 与后端 RecognitionResult 对齐 */
interface RecognitionResult {
  recognized: boolean;
  reason: string;
  validDaysLeft: number;
  needReexam: boolean;
  targetDept: string;
}

const LEVEL_OPTIONS = ['三级', '二级', '一级'] as const;

/** 转诊方向标签颜色 */
function directionColor(d: string): string {
  if (d === '上转') return 'geekblue';
  if (d === '下转') return 'green';
  return 'orange';
}

export default function RegionalCollaborationPage() {
  const [map, setMap] = useState<RegionalMap | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const [match, setMatch] = useState<ReferralMatch | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const [recog, setRecog] = useState<RecognitionResult | null>(null);
  const [recogLoading, setRecogLoading] = useState(false);

  const [condition, setCondition] = useState('急性胸痛 2 小时');
  const [sourceLevel, setSourceLevel] = useState<string>('一级');
  const [targetLevel, setTargetLevel] = useState<string>('三级');

  const loadMap = useCallback(async () => {
    setMapLoading(true);
    setMapError(null);
    try {
      const data = await get<RegionalMap>('/regional/collaboration/map', { groupId: DEMO_GROUP_ID });
      setMap(data);
    } catch (e) {
      setMapError(e instanceof Error ? e.message : '协同地图加载失败');
      setMap(null);
    } finally {
      setMapLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMap();
  }, [loadMap]);

  const runReferral = async () => {
    setMatchLoading(true);
    try {
      const data = await get<ReferralMatch>('/regional/referral/match', {
        sourceHospitalId: 'h_lvl1_001',
        sourceLevel,
        targetHospitalId: 'h_lvl3_001',
        targetLevel,
        targetHospitalName: '集团总院',
        condition,
        specialties: '心血管内科,肿瘤科',
        expertSlots: 8,
        patientId: 'P01234523',
      });
      setMatch(data);
    } finally {
      setMatchLoading(false);
    }
  };

  const runRecognition = async (examType: string, examDate: string, accredited: boolean, quality: string) => {
    setRecogLoading(true);
    try {
      const data = await get<RecognitionResult>('/regional/exam-recognition', {
        resultId: 'EX-2026-0001',
        sourceHospitalId: 'h_lvl2_001',
        patientId: 'P01234523',
        examType,
        examDate,
        accredited: String(accredited),
        qualityFlag: quality,
        targetDept: '心血管内科',
      });
      setRecog(data);
    } finally {
      setRecogLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>
          <GlobalOutlined /> 区域医疗协同 · 医联体资源一张图
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#f0f4f8', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* 协同概览 */}
        <Card
          size="small"
          style={{ marginBottom: 16, borderTop: `3px solid ${ACCENT}` }}
          title={<><ApartmentOutlined /> 集团协同概览（按 groupId 隔离）</>}
          extra={<Tag color="blue">集团 {DEMO_GROUP_ID}</Tag>}
        >
          <Spin spinning={mapLoading}>
            {mapError && <Alert type="error" showIcon style={{ marginBottom: 12 }} message={mapError} />}
            <Row gutter={16}>
              <Col span={6}><Statistic title="成员医院" value={map?.total ?? 0} prefix={<TeamOutlined />} /></Col>
              <Col span={6}><Statistic title="开放床位" value={map?.totalBeds ?? 0} /></Col>
              <Col span={6}><Statistic title="可共享专家号源" value={map?.totalExpertSlots ?? 0} valueStyle={{ color: ACCENT }} /></Col>
              <Col span={6}><Statistic title="可支援设备条目" value={map?.totalDevices ?? 0} valueStyle={{ color: WARN_ORANGE }} /></Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <Space wrap size={[8, 8]}>
              {Object.entries(map?.byLevel ?? {}).map(([lv, n]) => (
                <Tag key={lv} color="geekblue">{lv} × {n}</Tag>
              ))}
              {Object.entries(map?.byRegion ?? {}).map(([rg, n]) => (
                <Tag key={rg}>{rg} × {n}</Tag>
              ))}
              {(map?.dispatches ?? []).map((d) => (
                <Tag key={d.dispatchId} color="orange" icon={<SwapOutlined />}>
                  {d.resourceType}·{d.resourceName}：{d.fromHospitalId} → {d.toHospitalId}
                </Tag>
              ))}
              {(!map || (map.dispatches.length === 0 && map.hospitals.length === 0)) && (
                <Text type="secondary">当前集团暂无登记医院与调配单（后端内存台账为空属正常）</Text>
              )}
            </Space>
          </Spin>
        </Card>

        <Row gutter={16}>
          {/* 跨院转诊匹配 */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              style={{ borderTop: `3px solid ${ACCENT}`, height: '100%' }}
              title={<><SwapOutlined /> 跨院转诊匹配（上转 / 下转 / 双向）</>}
            >
              <Form layout="vertical" size="small">
                <Form.Item label="病种描述">
                  <Input value={condition} onChange={(e) => setCondition(e.target.value)} />
                </Form.Item>
                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item label="来源院等级">
                      <Select value={sourceLevel} onChange={setSourceLevel} options={LEVEL_OPTIONS.map((v) => ({ value: v, label: v }))} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="目标院等级">
                      <Select value={targetLevel} onChange={setTargetLevel} options={LEVEL_OPTIONS.map((v) => ({ value: v, label: v }))} />
                    </Form.Item>
                  </Col>
                </Row>
                <button type="button" className="ant-btn ant-btn-primary" onClick={() => void runReferral()}>
                  匹配转诊
                </button>
              </Form>
              <Spin spinning={matchLoading}>
                {match && (
                  <Descriptions size="small" column={1} bordered style={{ marginTop: 12 }}>
                    <Descriptions.Item label="转诊方向">
                      <Tag color={directionColor(match.direction)}>{match.direction}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="命中专科">{match.matchedSpecialty}</Descriptions.Item>
                    <Descriptions.Item label="可承接">
                      <Tag color={match.accepted ? 'green' : 'red'}>{match.accepted ? '可承接' : '拒收'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="共享专家号">
                      {match.sharedExpertSlot > 0 ? `约到 ${match.sharedExpertSlot} 个专家号` : '无（下转康复）'}
                    </Descriptions.Item>
                    <Descriptions.Item label="患者号（已脱敏）">{match.maskedPatientId}</Descriptions.Item>
                    <Descriptions.Item label="匹配说明">{match.reason}</Descriptions.Item>
                  </Descriptions>
                )}
              </Spin>
            </Card>
          </Col>

          {/* 检验结果互认 */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              style={{ borderTop: `3px solid ${OK_GREEN}`, height: '100%' }}
              title={<><AuditOutlined /> 跨院检验检查结果互认</>}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  互认三条件：出检院在名录内 + 结果在有效期内 + 质量合格。点击下方场景按钮复算：
                </Text>
                <Space wrap>
                  <button type="button" className="ant-btn ant-btn-primary" onClick={() => void runRecognition('检验', daysAgo(5), true, '合格')}>
                    互认通过（5 天前检验）
                  </button>
                  <button type="button" className="ant-btn" onClick={() => void runRecognition('影像', daysAgo(120), true, '合格')}>
                    已过期（120 天前影像）
                  </button>
                  <button type="button" className="ant-btn" onClick={() => void runRecognition('检验', daysAgo(3), false, '合格')}>
                    未入互认名录
                  </button>
                  <button type="button" className="ant-btn" onClick={() => void runRecognition('超声', daysAgo(10), true, '存疑')}>
                    结果存疑
                  </button>
                </Space>
              </Space>
              <Spin spinning={recogLoading}>
                {recog && (
                  <Descriptions size="small" column={1} bordered style={{ marginTop: 12 }}>
                    <Descriptions.Item label="是否采信">
                      <Tag color={recog.recognized ? 'green' : 'red'} icon={<SafetyCertificateOutlined />}>
                        {recog.recognized ? '互认通过' : '需重查'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="目标科室">{recog.targetDept}</Descriptions.Item>
                    <Descriptions.Item label="有效期剩余">{recog.validDaysLeft} 天</Descriptions.Item>
                    <Descriptions.Item label="需重查">{recog.needReexam ? '是' : '否'}</Descriptions.Item>
                    <Descriptions.Item label="判定理由">{recog.reason}</Descriptions.Item>
                  </Descriptions>
                )}
              </Spin>
            </Card>
          </Col>
        </Row>

        {/* 能力说明 */}
        <Card size="small" style={{ marginTop: 16 }} title={<><TeamOutlined /> 四类协同能力（中期路线图）</>}>
          <Steps
            size="small"
            current={-1}
            items={[
              { title: '跨院转诊', description: '上转 / 下转 / 双向，按病种命中专科与等级差' },
              { title: '结果互认', description: '跨院检验检查结果互认，免重复检查' },
              { title: '号源共享', description: '专家号跨院预约，转诊自动占号' },
              { title: '资源调配', description: '跨院设备 / 专家支援，同集团内留痕' },
            ]}
          />
        </Card>

        <Alert
          type="warning"
          showIcon
          icon={<SafetyCertificateOutlined />}
          style={{ marginTop: 16, fontSize: 12 }}
          message="数据隔离与隐私说明"
          description="本页数据严格按 hospital_id / groupId 隔离，不串院；跨院患者号已脱敏（P0****23），原始主索引不出院。页面结果为辅助决策参考，不构成医疗建议。"
        />
        <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12, textAlign: 'center' }}>
          © 2026 杭州健澜科技有限公司
        </Paragraph>
      </Content>
    </Layout>
  );
}

/** 工具：返回 n 天前的 ISO 日期串（用于演示互认时效） */
function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}
