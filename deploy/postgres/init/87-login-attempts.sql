-- 健澜科技 jlmedaios - 登录尝试台账（M8-C）
-- 记录全部登录尝试（成功/失败均落库），支撑登录日志查询、异常登录识别与暴力破解检测。
-- 登录成功会话另见 clinical.user_sessions；本台账只追加、不修改、不删除。

CREATE TABLE IF NOT EXISTS iam.login_attempts (
  id           BIGSERIAL PRIMARY KEY,
  username     text NOT NULL,
  user_id      uuid,                          -- 用户不存在/无法定位时为空
  success      boolean NOT NULL,
  fail_reason  text,                          -- 失败原因（统一文案，不泄露具体是用户名还是口令错误）
  ip           text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_user
  ON iam.login_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_time
  ON iam.login_attempts (created_at DESC);

-- 失败登录专用部分索引，供安全审计快速检索失败尝试
CREATE INDEX IF NOT EXISTS idx_login_attempts_fail
  ON iam.login_attempts (created_at DESC)
  WHERE success = false;

COMMENT ON TABLE iam.login_attempts IS
  '登录尝试台账：成功/失败均记录，支撑登录日志与异常登录识别（M8-C）';
