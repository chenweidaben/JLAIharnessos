# -*- coding: utf-8 -*-
"""提取docx中的所有图片"""
import zipfile
import os

DOC_PATH = r"C:\claudecode5.1.118\全诊产品说明.docx"
OUT_DIR = r"C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\docs\requirements\images"
os.makedirs(OUT_DIR, exist_ok=True)

with zipfile.ZipFile(DOC_PATH, 'r') as z:
    media_files = [n for n in z.namelist() if n.startswith("word/media/")]
    for mf in sorted(media_files):
        fname = os.path.basename(mf)
        out_path = os.path.join(OUT_DIR, fname)
        with z.open(mf) as src, open(out_path, 'wb') as dst:
            dst.write(src.read())
        print(f"提取: {fname} ({os.path.getsize(out_path)} bytes)")

print(f"\n共提取 {len(media_files)} 张图片到: {OUT_DIR}")
