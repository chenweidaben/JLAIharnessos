$env:PATH = "C:\Users\lenovo\.bun\bin;$env:PATH"
$env:DEMO_MODE = "1"
$env:DATABASE_URL = "postgres://postgres@127.0.0.1:5433/jlmedaios"
Set-Location "C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
& "C:\Users\lenovo\.bun\bin\bun.exe" run src/bff/server.ts
