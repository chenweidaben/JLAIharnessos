-- ============================================================================
-- 健澜科技 jlmedaios - 医院内部即时通讯（M138-C）
--
-- 【新业务场景】院内同事之间的点对点即时通讯：医生-护士-药师-行政协同。
--   与 60-chat.sql（医患互联网医院对话）、clinical.notifications（站内铃铛）互补，
--   本张表专责「医护内部 IM」，消息体加密落库，不外泄患者直接标识符。
--
-- 消息类型（与 imAggregator.ts 的 ImMessageType 枚举一致）：
--   text    文字消息
--   image   图片消息（缩略图/原图地址存在 meta）
--   file    文件消息（附件名/大小/地址存在 meta）
--   system  系统通知（排班变更 / 会诊邀请 / 危急值提醒等，由系统侧发出）
--
-- 安全红线（消息加密存储）：
--   - content_cipher 列绝不明文落库：统一经 AES-256-GCM 加密，
--     密文形态为 v1.iv.tag.ciphertext（均 base64，与 FieldCipher 约定一致）；
--   - 即使拖库，拿到的也是密文，无密钥不可还原；
--   - sender_id / receiver_id 均为 iam.users.id，仅本人可读写自己这一侧会话；
--   - read_at 一旦置位不回退，未读计数走 partial index，轻量快查。
--
-- 幂等：重复执行不会报错、不会清空已有消息。
-- 不触碰 WebSocket：本版仅做拉取式 REST，实时推送留待后续。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.im_messages (
  id              uuid PRIMARY KEY,
  sender_id       uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  receiver_id     uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('text','image','file','system')),
  -- 消息体加密存储：v1.iv.tag.ciphertext（base64），绝不明文落库
  content_cipher  text NOT NULL,
  -- 图片/文件的额外元信息（文件名、大小、下载地址等）；text 消息为空对象
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- NULL = 未读；接收方打开会话后由服务端置位，不回退
  read_at         timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- 自己不能给自己发消息（业务上无意义）
  CHECK (sender_id <> receiver_id)
);

COMMENT ON TABLE clinical.im_messages IS
  '医院内部即时通讯消息表（医护点对点），消息体 AES-256-GCM 加密存储';
COMMENT ON COLUMN clinical.im_messages.content_cipher IS
  '加密后的消息体（v1.iv.tag.ciphertext，base64），禁止明文写入';

-- 未读角标高频查询：partial index 只索引未读行，体积小、命中快
CREATE INDEX IF NOT EXISTS idx_im_messages_receiver_unread
  ON clinical.im_messages (receiver_id, created_at DESC)
  WHERE read_at IS NULL;

-- 某接收人会话列表 / 消息分页：按接收人 + 时间倒序扫描
CREATE INDEX IF NOT EXISTS idx_im_messages_receiver_created
  ON clinical.im_messages (receiver_id, created_at DESC);

-- 双人会话分页：双向 (sender,receiver) 联合，覆盖 getConversation 查询
CREATE INDEX IF NOT EXISTS idx_im_messages_pair
  ON clinical.im_messages (sender_id, receiver_id, created_at DESC);
