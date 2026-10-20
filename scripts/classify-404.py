# -*- coding: utf-8 -*-
"""
v5.0试点扩展（M184角色验证）e2e 404 路由三分类脚本（只读）。
读取 reports/e2e-404.txt + 扫描 src/bff/routes 的 path 字面量，输出分类统计与 A 类清单。
"""
import os, re, json, glob

ROOT = r"C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"

# 1. 读 404 清单
routes = []
with open(os.path.join(ROOT, "reports", "e2e-404.txt"), encoding="utf-8") as f:
    for line in f:
        line = line.rstrip("\n")
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        routes.append(parts[0].strip())

# 2. 收集 BFF 已注册路由路径
bff_paths = set()
pat = re.compile(r"""path:\s*['"`](/api/v1/[^'"`]*)['"`]""")
for fp in glob.glob(os.path.join(ROOT, "src", "bff", "routes", "**", "*.ts"), recursive=True):
    with open(fp, encoding="utf-8") as f:
        for m in pat.finditer(f.read()):
            p = m.group(1)
            # 去掉动态段 :id
            p = re.sub(r"/:[A-Za-z0-9_]+", "", p)
            bff_paths.add(p)

# BFF 路径扁平文本（用于 token 包含判断）
bff_blob = "\n".join(bff_paths)

# 3. C 类模式：纯静态 / 登录 / 错误页 / 壳 / 聊天UI / 低代码工作流
C_PATTERNS = [
    r"^/login", r"^/forgot-password", r"^/m(/login)?$", r"^/me$", r"^/profile$",
    r"^/403$", r"^/about$", r"^/features$", r"^/feedback$", r"^/scenarios$",
    r"^/rollback$", r"^/sessions$", r"^/demo$", r"^/chat$",
    r"^/medmuse", r"^/agent", r"^/personal-agent", r"^/digital-companion",
    r"^/mobile-health", r"^/voice-medical", r"^/telemedicine",
    r"^/builder", r"^/skills/", r"^/workflow", r"^/form-engine", r"^/graph/",
    r"^/federated-learning", r"^/finetune-loop", r"^/learning-flywheel",
    r"^/feedback-loop", r"^/experience-versions", r"^/failure-postmortem",
    r"^/case-lesson", r"^/smart-healthcare", r"^/quick-actions", r"^/demo",
    r"^/hl7-integration", r"^/architecture$", r"^/data$",
]
c_re = [re.compile(p) for p in C_PATTERNS]

# 通用无意义词（匹配时忽略）——注意：quality/operation/dashboard 是真实业务域，不能忽略
GENERIC = {"admin", "api", "v1", "v2", "v3", "list", "detail", "page", "management",
           "report", "reports", "mgmt", "view", "edit", "new", "360",
           "system", "portal", "center", "panel"}

def tokens_of(route):
    # /admin/quality-management -> ['quality','management']
    segs = [s for s in route.strip("/").split("/")]
    toks = set()
    for s in segs:
        for t in re.split(r"[-_/]", s):
            if t and t not in GENERIC and len(t) >= 2:
                toks.add(t)
    return toks

def has_bff_backing(route):
    """判断该业务路由是否有同域 BFF：核心 token 出现在任一 BFF 路径中。"""
    toks = tokens_of(route)
    if not toks:
        return False
    hits = 0
    for t in toks:
        if t in bff_blob:
            hits += 1
    # 至少一个有意义 token 命中 BFF 即视为有后端
    return hits >= 1

A, B, C = [], [], []
for r in routes:
    if any(c.search(r) for c in c_re):
        C.append(r)
    elif has_bff_backing(r):
        B.append(r)
    else:
        A.append(r)

print("=== 分类统计 ===")
print(f"总 404: {len(routes)}")
print(f"A 类(前端页面缺BFF,候选补): {len(A)}")
print(f"B 类(BFF同域存在,启发式误判,不改): {len(B)}")
print(f"C 类(纯静态/登录/壳,无需BFF): {len(C)}")
print()
print("=== A 类清单 ===")
for r in A:
    print(" ", r)

# 落盘 JSON 供文档引用
out = {"total": len(routes), "A_count": len(A), "B_count": len(B), "C_count": len(C),
       "A": A, "B": B, "C": C, "bff_route_count": len(bff_paths)}
with open(os.path.join(ROOT, "reports", "e2e-404-classification.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print()
print(f"BFF 路由总数(去重): {len(bff_paths)}")
