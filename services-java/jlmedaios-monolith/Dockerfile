# ============================================================
# 健澜科技 jlmedaios 模块化单体 - Dockerfile
# JDK 21 + Spring Boot 3.5.3
# ============================================================

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY target/*.jar app.jar

EXPOSE 9090

ENTRYPOINT ["java", "-jar", "app.jar"]
