/**
 * 健澜科技 jlmedaios - M132-A 部署文档纯函数聚合器（产品化收尾）
 *
 * 【产品化收尾】本模块是「从零到上线」部署清单的单一事实源：
 *  - generateDeploymentChecklist()：返回有序的部署检查清单（环境准备 -> 数据库初始化
 *    -> 配置文件 -> 安装构建 -> 服务启动 -> 反向代理 -> HTTPS -> 上线验证），
 *    供运维控制台 / 部署向导渲染，也供文档与单测交叉校验；
 *  - REQUIRED_ENV_KEYS：生产环境必须显式赋值的环境变量（与 .env.example 一一对应）；
 *  - VERIFIED_COMMANDS：经 package.json scripts / 仓库入口核对过的真实命令，
 *    文档中出现的命令必须落在本清单内，杜绝「文档写的命令跑不起来」。
 *
 * 设计约束（生产安全）：
 *  - 纯函数：不读文件、不联网、不依赖系统时间；输出完全由固定常量派生，可安全单测；
 *  - 零依赖：不新增任何第三方包，不 import 业务模块，避免循环依赖；
 *  - 不碰 WebSocket：清单只覆盖 HTTP 业务面部署，WS 升级路径由既有边缘配置托管；
 *  - 本层只产出「清单数据」，不执行任何命令——执行权在运维 / 路由层。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 部署阶段分类（与文档章节一一对应，新增阶段需同步更新 DEPLOYMENT_GUIDE.md） */
export type DeploymentCategory =
  | '环境准备'
  | '数据库初始化'
  | '配置文件'
  | '安装构建'
  | '服务启动'
  | '反向代理'
  | 'HTTPS证书'
  | '上线验证';

/** 单条部署检查项 */
export interface ChecklistItem {
  /** 稳定标识，如 env.bun；重命名会破坏前端映射，只允许追加 */
  id: string;
  /** 所属部署阶段 */
  category: DeploymentCategory;
  /** 检查项短标题（运维看板展示用） */
  title: string;
  /** 操作说明：做什么、为什么、验收标准 */
  description: string;
  /** 对应的可执行命令；无命令项（如建库 SQL 步骤）为空串 */
  command: string;
  /** 是否必做：false 为可选项（演示数据、开发模式启动等） */
  required: boolean;
}

/** 部署指南文档路径（相对仓库根，测试据此做文档完整性校验） */
export const DEPLOYMENT_DOC_PATH = 'docs/DEPLOYMENT_GUIDE.md';

/** 环境变量样例文件路径（配置项覆盖校验的对照源） */
export const ENV_EXAMPLE_PATH = '.env.example';

/**
 * 生产环境必须显式赋值的环境变量。
 * 选取原则：缺失即无法启动 / 启动后存在安全隐患 / 行为与生产预期不符的键。
 * 键名必须与 .env.example 中的定义完全一致（测试会逐条比对）。
 */
export const REQUIRED_ENV_KEYS: readonly string[] = [
  'NODE_ENV', // 必须 production
  'APP_ENV', // 必须 prod
  'LOG_LEVEL', // 生产建议 info/warn
  'HTTP_PORT', // BFF 监听端口，默认 8080
  'DATABASE_URL', // PostgreSQL 16 连接串，真实部署必填
  'PGSSLMODE', // 生产必须 prefer/require，禁用 disable
  'DEMO_MODE', // 生产必须 0（关闭演示内存数据）
  'LLM_PROVIDER', // 大模型提供方
  'LLM_API_KEY', // 大模型密钥，禁止占位符上线
  'JWT_SECRET', // 登录签名密钥，生产必须高强度随机串
  'ENCRYPTION_MASTER_KEY', // 字段加密主密钥（32 字节），必须由 KMS 下发
  'ENABLE_DESENSITIZATION', // 生产必须 true（数据脱敏）
  'ENABLE_PROMPT_GUARD', // 生产必须 true（Prompt 注入防护）
  'RADAR_INTERNAL_TOKEN', // BFF 与影像推理服务共享内部鉴权 token
  'HEALTH_CHECK_PATH', // 健康检查端点，默认 /health
];

/**
 * 经仓库核实的真实命令白名单。
 * 来源：package.json scripts、src/bff/server.ts 启动方式、deploy/nginx 既有配置。
 * 文档与清单中出现的命令必须是本数组的元素，测试据此做「命令正确性」校验。
 */
export const VERIFIED_COMMANDS: readonly string[] = [
  'bun --version', // 运行时自检：要求 >= 1.3.0
  'bun install', // 安装依赖（bun.lock 锁定版本）
  'bun run build', // 等价 build.ts，产出 dist/
  'bun run typecheck', // tsc --noEmit 零报错后方可构建产物
  'bun scripts/db/check-sql.ts', // db:check：校验迁移 SQL 与库连接
  'bun scripts/db/import-seed.ts', // db:seed：导入基础/演示数据（可选）
  'bun run src/bff/server.ts', // 开发联调启动入口
  'bun dist/server.js', // 生产启动入口（start:server 脚本同此命令）
  'nginx -t', // 配置语法校验
  'nginx -s reload', // 平滑重载边缘网关
  'certbot --nginx', // 申请/续期 Let's Encrypt TLS 证书
  'curl -f http://127.0.0.1:8080/health', // 存活探针
  'curl -f http://127.0.0.1:8080/ready', // 就绪探针（DB/Redis 依赖检查）
];

/**
 * generateDeploymentChecklist：生成从零到上线的有序部署检查清单。
 *
 * 顺序即部署顺序：环境准备 -> 数据库 -> 配置 -> 构建 -> 启动 -> 反代 -> HTTPS -> 验证。
 * 纯函数：每次调用返回全新数组，调用方可自由排序/筛选而不影响本模块状态。
 *
 * @returns 有序检查项数组（id 唯一，required 项构成最短可上线路径）
 */
export function generateDeploymentChecklist(): ChecklistItem[] {
  return [
    // ---------------- 环境准备 ----------------
    {
      id: 'env.os',
      category: '环境准备',
      title: '服务器资源与操作系统',
      description:
        '生产建议 Linux x86_64（Ubuntu 22.04 LTS / CentOS Stream 9 及以上），' +
        '最低 4C8G、系统盘 100G+；PostgreSQL 数据盘建议独立挂载并预留 3 年增长。',
      command: '',
      required: true,
    },
    {
      id: 'env.runtime',
      category: '环境准备',
      title: '安装运行时 Bun >= 1.3.0（Node >= 18 兼容）',
      description:
        '本系统以 Bun 为一等运行时（packageManager: bun@1.4.2）；' +
        '安装后执行自检，版本不满足 engines 声明禁止进入下一步。',
      command: 'bun --version',
      required: true,
    },
    {
      id: 'env.infra',
      category: '环境准备',
      title: '准备 PostgreSQL 16 与 Redis 7 实例',
      description:
        'PostgreSQL 16 为业务主库，Redis 7 承担缓存/分布式锁/限流/会话黑名单；' +
        '二者只绑定内网，管理端口不对公网开放（与 docker-compose 网络分层一致）。',
      command: '',
      required: true,
    },

    // ---------------- 数据库初始化 ----------------
    {
      id: 'db.create',
      category: '数据库初始化',
      title: '创建业务库与独立账号',
      description:
        '创建数据库 jlmedaios 与专用业务账号（禁止用 superuser 跑应用），' +
        '授权仅限该库 schema public；DATABASE_URL 按 postgres://user:password@host:port/jlmedaios 拼装。',
      command: '',
      required: true,
    },
    {
      id: 'db.migrate',
      category: '数据库初始化',
      title: '启动自动迁移建表',
      description:
        'BFF 启动时 autoMigrate 按文件名顺序执行 deploy/postgres/init/*.sql，' +
        '版本记录于 public.schema_migrations，幂等可重入；迁移失败会明确报错，不会静默跳过。',
      command: '',
      required: true,
    },
    {
      id: 'db.verify',
      category: '数据库初始化',
      title: '校验 SQL 脚本与库连接',
      description:
        '迁移脚本静态检查 + 连通性复核，通过后方可继续；' +
        '等价 npm script：bun run db:check。',
      command: 'bun scripts/db/check-sql.ts',
      required: true,
    },
    {
      id: 'db.seed',
      category: '数据库初始化',
      title: '导入基础/演示数据（可选）',
      description:
        '仅联调演示环境执行；生产环境默认不导入演示数据。等价 npm script：bun run db:seed。',
      command: 'bun scripts/db/import-seed.ts',
      required: false,
    },

    // ---------------- 配置文件 ----------------
    {
      id: 'env.file',
      category: '配置文件',
      title: '复制并填写 .env',
      description:
        '以 .env.example 为模板复制为 .env，按生产环境逐项填写；' +
        '.env* 已被 .gitignore 排除，严禁把含真实口令的 .env 提交版本库。',
      command: '',
      required: true,
    },
    {
      id: 'env.secrets',
      category: '配置文件',
      title: '替换全部占位密钥',
      description:
        'JWT_SECRET、ENCRYPTION_MASTER_KEY、LLM_API_KEY、RADAR_INTERNAL_TOKEN 等' +
        '严禁以 placeholder 上线；加密主密钥应由 KMS 下发，32 字节高强度随机串。',
      command: '',
      required: true,
    },

    // ---------------- 安装构建 ----------------
    {
      id: 'deps.install',
      category: '安装构建',
      title: '安装项目依赖',
      description: '按 bun.lock 锁定版本安装，不新增/不升级依赖；离线环境需预置私有 registry 镜像。',
      command: 'bun install',
      required: true,
    },
    {
      id: 'build.app',
      category: '安装构建',
      title: '类型检查与生产构建',
      description:
        '先 tsc --noEmit 零报错（bun run typecheck）再构建；' +
        '产物输出 dist/，生产以产物启动而非 ts 源码。',
      command: 'bun run build',
      required: true,
    },

    // ---------------- 服务启动 ----------------
    {
      id: 'start.dev',
      category: '服务启动',
      title: '开发联调启动（仅内网）',
      description: '带 watch 的源码启动方式，仅供开发/测试环境；生产禁止使用。',
      command: 'bun run src/bff/server.ts',
      required: false,
    },
    {
      id: 'start.prod',
      category: '服务启动',
      title: '生产启动 BFF',
      description:
        '以 dist/server.js 启动，监听 HTTP_PORT（默认 8080），仅绑定 127.0.0.1，' +
        '对外流量一律经 Nginx 反代；建议配合 systemd 守护进程。等价 npm script：bun run start:server。',
      command: 'bun dist/server.js',
      required: true,
    },

    // ---------------- 反向代理 ----------------
    {
      id: 'proxy.nginx',
      category: '反向代理',
      title: '配置 Nginx 反代业务接口',
      description:
        '/api/v1/ 反代至 http://127.0.0.1:8080，/ 指向前端静态产物；' +
        '配置修改后先做语法校验。（WS 升级路径由既有边缘配置托管，本清单不展开。）',
      command: 'nginx -t',
      required: true,
    },
    {
      id: 'proxy.reload',
      category: '反向代理',
      title: '平滑重载 Nginx',
      description: 'nginx -t 通过后执行 reload，不断连接生效；禁止 restart 业务窗口外硬重启。',
      command: 'nginx -s reload',
      required: true,
    },

    // ---------------- HTTPS证书 ----------------
    {
      id: 'https.cert',
      category: 'HTTPS证书',
      title: '部署 TLS 证书',
      description:
        '公网域名用 certbot 申请 Let\u2019s Encrypt 并配置自动续期；' +
        '院内专网走院内 CA 签发证书，Nginx listen 443 ssl，全站强制 HTTPS。',
      command: 'certbot --nginx',
      required: true,
    },

    // ---------------- 上线验证 ----------------
    {
      id: 'verify.health',
      category: '上线验证',
      title: '存活探针验证',
      description: 'BFF 本地存活端点返回 200，证明进程与路由层正常。',
      command: 'curl -f http://127.0.0.1:8080/health',
      required: true,
    },
    {
      id: 'verify.ready',
      category: '上线验证',
      title: '就绪探针验证',
      description:
        '/ready 会串联数据库/缓存等关键依赖；返回非 2xx 说明依赖未就绪，' +
        '必须先排查 DATABASE_URL 与缓存连通，不得直接对外放量。',
      command: 'curl -f http://127.0.0.1:8080/ready',
      required: true,
    },
  ];
}
