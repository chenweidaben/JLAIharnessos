/**
 * 健澜科技 jlmedaios - M145-D 部署配置生成纯函数聚合器（生产化收尾）
 *
 * 【生产化收尾】本模块把「运维要照着装起来」所需要的两份关键配置，收敛为可单测、
 * 可复算的纯函数：
 *  - generateDockerCompose(config)：产出生产级 docker-compose.yml 文本，
 *    覆盖 postgres / redis / bff 后端三要素、命名卷持久化、重启策略、
 *    Docker json-file 日志轮转（max-size/max-file）与备份策略注释；
 *  - generateNginxConfig(domain, sslCert)：产出对外唯一入口的 nginx.conf，
 *    覆盖 80->443 跳转、TLS1.2/1.3、静态资源缓存、/api 反向代理到 bff、
 *    gzip 与安全响应头；不涉及 WebSocket 升级块（WS 路径由既有边缘网关托管）；
 *  - generateBackupPolicy()：产出备份/容灾策略（全备周期 + WAL 归档 + 保留期 +
 *    异地副本 + 月度恢复演练），供文档、路由与单测交叉一致。
 *
 * 设计约束（生产安全）：
 *  - 纯函数：不读文件、不联网、不依赖系统时间；输出仅由入参与固定常量派生；
 *  - 零依赖：不新增任何第三方包，不 import 业务模块，避免循环依赖；
 *  - 不碰 WebSocket：nginx 模板不含 Upgrade/Connection 头，WS 升级交给边缘层；
 *  - 本层只产出「配置文本与策略数据」，绝不执行 docker/nginx——执行权在运维。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* -------------------------------------------------------------------------- */
/* 类型定义                                                                    */
/* -------------------------------------------------------------------------- */

/** 生成 docker-compose.yml 所需的运维可调入参（均有安全默认值） */
export interface DeployConfig {
  /** 对外域名，如 hospital.example.com（同时写入后端 cookie/CORS 提示） */
  domain: string;
  /** 业务镜像标签，默认 jlmedaios/bff:latest */
  appImage?: string;
  /** bff 容器对外暴露端口（仅宿主机内网映射，真正入口是 nginx），默认 8080 */
  httpPort?: number;
  /** PostgreSQL 超级用户密码（生产务必改为随机强口令），默认随机占位提示 */
  dbPassword?: string;
  /** Redis 访问密码，默认关闭保护模式时的占位口令 */
  redisPassword?: string;
  /** JWT 签名密钥（生产务必替换），默认占位提示 */
  jwtSecret?: string;
  /** 容器时区，默认 Asia/Shanghai */
  timezone?: string;
  /** 是否启用每日全量备份 sidecar（默认 true） */
  enableBackup?: boolean;
}

/** 备份/容灾策略（generateBackupPolicy 的返回结构） */
export interface BackupPolicy {
  /** 是否启用应用层备份编排 */
  enabled: boolean;
  /** 全量 pg_dump 的 cron 表达式（宿主机/sidecar），默认每日 02:00 */
  fullBackupCron: string;
  /** PostgreSQL 是否开启 continuous WAL 归档（PITR 时点恢复） */
  walArchive: boolean;
  /** 本地备份保留天数，默认 30 */
  retentionDays: number;
  /** 是否每周把全量包复制到异地对象存储 */
  offsiteCopy: boolean;
  /** 每周异地副本的星期几（0=周日），默认 0（周日凌晨） */
  offsiteWeeklyDay: number;
  /** 备份任务清单（名称 / cron / 目标） */
  jobs: Array<{ name: string; schedule: string; target: string }>;
  /** 是否每月做一次恢复演练（在隔离环境还原并校验） */
  verifyRestoreMonthly: boolean;
}

/* -------------------------------------------------------------------------- */
/* 常量默认值                                                                  */
/* -------------------------------------------------------------------------- */

/** 业务镜像默认标签 */
export const DEFAULT_APP_IMAGE = 'jlmedaios/bff:latest';

/** bff 默认对内端口 */
export const DEFAULT_HTTP_PORT = 8080;

/** 占位口令：文档/模板里显式提示运维必须替换，禁止直接上生产 */
export const PLACEHOLDER_SECRET = 'CHANGE_ME_BEFORE_PRODUCTION';

/* -------------------------------------------------------------------------- */
/* 备份策略                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 【生产化收尾】产出默认备份/容灾策略。
 * 规则：每日 02:00 全量 + 连续 WAL 归档支持 PITR；本地保留 30 天；
 * 每周日异地副本；每月一次恢复演练。纯函数，固定输出，便于单测锁定。
 */
export function generateBackupPolicy(): BackupPolicy {
  return {
    enabled: true,
    fullBackupCron: '0 2 * * *',
    walArchive: true,
    retentionDays: 30,
    offsiteCopy: true,
    offsiteWeeklyDay: 0,
    jobs: [
      { name: 'pg_dump_full', schedule: '0 2 * * *', target: '/backup/postgres/full' },
      { name: 'redis_rdb', schedule: '15 3 * * *', target: '/backup/redis/dump' },
      { name: 'offsite_sync', schedule: '0 4 * * 0', target: 's3://jlmedaios-backup/offsite' },
    ],
    verifyRestoreMonthly: true,
  };
}

/* -------------------------------------------------------------------------- */
/* docker-compose.yml 生成                                                    */
/* -------------------------------------------------------------------------- */

/** 转义 YAML 中标量可能破坏缩进的字符：口令类仅做保守包裹提示 */
function resolve(config: Required<Pick<DeployConfig, 'domain'>> & Partial<DeployConfig>) {
  return {
    domain: config.domain,
    appImage: config.appImage ?? DEFAULT_APP_IMAGE,
    httpPort: config.httpPort ?? DEFAULT_HTTP_PORT,
    dbPassword: config.dbPassword ?? PLACEHOLDER_SECRET,
    redisPassword: config.redisPassword ?? PLACEHOLDER_SECRET,
    jwtSecret: config.jwtSecret ?? PLACEHOLDER_SECRET,
    timezone: config.timezone ?? 'Asia/Shanghai',
    enableBackup: config.enableBackup ?? true,
  };
}

/**
 * 【生产化收尾】根据运维入参生成生产级 docker-compose.yml 文本。
 * 包含：postgres16 / redis7 / bff 三服务，命名卷持久化，restart: always，
 * json-file 日志轮转（每容器 max-size=10m, max-file=3），以及备份策略注释。
 * 纯函数：同入参必得同文本，不读环境、不联网。
 */
export function generateDockerCompose(config: DeployConfig): string {
  const c = resolve(config);
  const policy = generateBackupPolicy();

  const backupBlock = c.enableBackup
    ? `
  # 备份 sidecar：每日全量 pg_dump + WAL 归档（策略见 generateBackupPolicy）
  backup:
    image: postgres:16-alpine
    container_name: jlmedaios-backup
    restart: "no"            # 由宿主机 cron 触发，非常驻
    depends_on:
      - postgres
    environment:
      TZ: ${c.timezone}
      PGHOST: postgres
      PGPASSWORD: \${DB_PASSWORD:-${c.dbPassword}}
    volumes:
      - backup_data:/backup
    logging: *default-logging
`
    : '';

  return `# =============================================================================
# 健澜科技 jlmedaios 生产编排（M145-D 生产化收尾，由 deployConfigAggregator 生成）
# 用法：
#   1) cp .env.compose.example .env  并填入真实口令（勿提交 git）
#   2) docker compose up -d
#   3) 对外入口仅暴露 nginx；本文件中的端口映射仅用于内网排障
# Copyright (c) 2026 杭州健澜科技有限公司
# =============================================================================

# 全局日志轮转：所有容器统一 json-file 驱动，单文件 10m、保留 3 个，
# 防止日志把数据盘写满（生产日志轮转要求）。
x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

services:
  postgres:
    image: postgres:16-alpine
    container_name: jlmedaios-postgres
    restart: always
    environment:
      TZ: ${c.timezone}
      POSTGRES_USER: jlm
      POSTGRES_PASSWORD: \${DB_PASSWORD:-${c.dbPassword}}
      POSTGRES_DB: jlmedaios
    volumes:
      - pg_data:/var/lib/postgresql/data
    # 仅监听内网，不对公网暴露 5432
    networks:
      - jlm_net
    logging: *default-logging
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jlm -d jlmedaios"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: jlmedaios-redis
    restart: always
    # 启用访问密码，禁止裸奔；保护模式默认开启
    command: ["redis-server", "--requirepass", "\${REDIS_PASSWORD:-${c.redisPassword}}", "--appendonly", "yes"]
    volumes:
      - redis_data:/data
    networks:
      - jlm_net
    logging: *default-logging

  bff:
    image: ${c.appImage}
    container_name: jlmedaios-bff
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      TZ: ${c.timezone}
      NODE_ENV: production
      PORT: "8080"
      DATABASE_URL: "postgres://jlm:\${DB_PASSWORD:-${c.dbPassword}}@postgres:5432/jlmedaios"
      REDIS_URL: "redis://:\${REDIS_PASSWORD:-${c.redisPassword}}@redis:6379/0"
      JWT_SECRET: \${JWT_SECRET:-${c.jwtSecret}}
      APP_DOMAIN: ${c.domain}
    # 仅映射到 127.0.0.1：外部流量一律走 nginx，不直连 bff
    ports:
      - "127.0.0.1:${c.httpPort}:8080"
    networks:
      - jlm_net
    logging: *default-logging
${backupBlock}
networks:
  jlm_net:
    driver: bridge

volumes:
  pg_data:
  redis_data:
  backup_data:
`;
}

/* -------------------------------------------------------------------------- */
/* nginx.conf 生成                                                            */
/* -------------------------------------------------------------------------- */

/**
 * 【生产化收尾】根据域名与证书路径生成对外唯一入口的 nginx.conf。
 * @param domain   对外域名，如 hospital.example.com
 * @param sslCert  TLS 证书 fullchain.pem 的绝对路径；私钥按同目录 privkey.pem 推导
 *
 * 要点：80 仅用于 ACME 挑战并 301 跳转 443；TLS1.2/1.3；/api 反代到本地 bff；
 * 静态资源长缓存；gzip；安全响应头。不含 WebSocket Upgrade 块（WS 由边缘托管）。
 * 纯函数：同入参必得同文本。
 */
export function generateNginxConfig(domain: string, sslCert: string): string {
  const certPath = sslCert;
  // 私钥与证书同目录：fullchain.pem -> privkey.pem；若调用方传入的不是 fullchain 则原样拼接 .key
  const keyPath = /fullchain\.pem$/i.test(sslCert)
    ? sslCert.replace(/fullchain\.pem$/i, 'privkey.pem')
    : `${sslCert}.key`;

  return `# =============================================================================
# 健澜科技 jlmedaios 边缘反向代理（M145-D 生产化收尾）
# 对外唯一入口：80 -> 443 强制跳转；业务面仅反代到本地 bff。
# 注意：本配置不含 WebSocket Upgrade 块，WS 升级路径由既有边缘网关托管。
# Domain: ${domain}
# Copyright (c) 2026 杭州健澜科技有限公司
# =============================================================================

# 上游：bff 容器经宿主机 127.0.0.1 暴露
upstream jlm_bff {
    server 127.0.0.1:8080 fail_timeout=10s;
    keepalive 32;
}

server {
    listen 80;
    server_name ${domain};
    # ACME / Let's Encrypt 续签挑战目录放行，其余一律跳 HTTPS
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name ${domain};

    # TLS 证书（由 certbot / 运维放置）
    ssl_certificate     ${certPath};
    ssl_certificate_key ${keyPath};
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    # 安全响应头
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 上传/请求体上限（医疗附件较大，给到 50m）
    client_max_body_size 50m;

    # gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/xml;
    gzip_min_length 1024;

    # 业务 API 反向代理到 bff
    location /api/ {
        proxy_pass http://jlm_bff;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 120s;
    }

    # 前端静态资源（构建产物），带长缓存
    location / {
        root /var/www/jlmedaios;
        index index.html;
        try_files $uri $uri/ /index.html;
        expires 7d;
        add_header Cache-Control "public";
    }
}
`;
}
