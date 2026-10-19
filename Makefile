# ============================================================
# 健澜科技 jlmedaios Makefile
# 常用快捷命令
# ============================================================
.PHONY: up down logs test-java test-python

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

test-java:
	cd services-java/jlmedaios-monolith && mvn test

test-python:
	cd services-python && pytest tests/ -v
