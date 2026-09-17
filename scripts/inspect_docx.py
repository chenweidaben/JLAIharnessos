# -*- coding: utf-8 -*-
"""检查文档段落内容和图片资源"""
import docx
import zipfile
import os

DOC_PATH = r"C:\claudecode5.1.118\全诊产品说明.docx"

doc = docx.Document(DOC_PATH)

print("=== 全部段落内容 ===")
for i, para in enumerate(doc.paragraphs):
    text = para.text.strip()
    style = para.style.name if para.style else ""
    print(f"[{i}] style={style} | len={len(text)} | {text[:200]}")

# 检查zip中的media
print("\n=== docx包内资源 ===")
with zipfile.ZipFile(DOC_PATH, 'r') as z:
    names = z.namelist()
    media_files = [n for n in names if n.startswith("word/media/")]
    print(f"总文件数: {len(names)}")
    print(f"媒体文件数: {len(media_files)}")
    for mf in media_files[:50]:
        info = z.getinfo(mf)
        print(f"  {mf} ({info.file_size} bytes)")
    if len(media_files) > 50:
        print(f"  ... 还有 {len(media_files)-50} 个媒体文件")
    
    # 检查是否有其他XML内容
    print("\n=== 其他关键文件 ===")
    for n in names:
        if n.endswith('.xml') and 'media' not in n:
            info = z.getinfo(n)
            print(f"  {n} ({info.file_size} bytes)")
