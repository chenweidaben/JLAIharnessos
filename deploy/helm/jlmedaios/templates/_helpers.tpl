{{/*
生成资源名称。
*/}}
{{- define "jlmedaios.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
完整名称（带 release 前缀）。
*/}}
{{- define "jlmedaios.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
目标命名空间。
*/}}
{{- define "jlmedaios.namespace" -}}
{{- .Values.namespace.name -}}
{{- end -}}

{{/*
Secret 名称。
*/}}
{{- define "jlmedaios.secretName" -}}
{{- .Values.secret.name -}}
{{- end -}}

{{/*
后端镜像（标签为空时回退到 appVersion）。
*/}}
{{- define "jlmedaios.backendImage" -}}
{{- $tag := .Values.image.backend.tag | default .Chart.AppVersion -}}
{{- printf "%s/%s:%s" .Values.image.registry .Values.image.backend.repository $tag -}}
{{- end -}}

{{/*
前端镜像（标签为空时回退到 appVersion）。
*/}}
{{- define "jlmedaios.webImage" -}}
{{- $tag := .Values.image.web.tag | default .Chart.AppVersion -}}
{{- printf "%s/%s:%s" .Values.image.registry .Values.image.web.repository $tag -}}
{{- end -}}

{{/*
通用标签。
*/}}
{{- define "jlmedaios.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/name: {{ include "jlmedaios.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/part-of: jlmedaios
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end -}}

{{/*
数据库主机（内置或外部）。
*/}}
{{- define "jlmedaios.pgHost" -}}
{{- if .Values.internal.postgres.enabled -}}
{{- "postgres" -}}
{{- else -}}
{{- .Values.external.postgres.host -}}
{{- end -}}
{{- end -}}

{{/*
数据库端口（内置或外部）。
*/}}
{{- define "jlmedaios.pgPort" -}}
{{- if .Values.internal.postgres.enabled -}}
{{- "5432" -}}
{{- else -}}
{{- .Values.external.postgres.port -}}
{{- end -}}
{{- end -}}

{{/*
数据库名（内置或外部）。
*/}}
{{- define "jlmedaios.pgDatabase" -}}
{{- if .Values.internal.postgres.enabled -}}
{{- .Values.internal.postgres.database -}}
{{- else -}}
{{- .Values.external.postgres.database -}}
{{- end -}}
{{- end -}}

{{/*
Redis 主机（内置或外部）。
*/}}
{{- define "jlmedaios.redisHost" -}}
{{- if .Values.internal.redis.enabled -}}
{{- "redis" -}}
{{- else -}}
{{- .Values.external.redis.host -}}
{{- end -}}
{{- end -}}

{{/*
Redis 端口（内置或外部）。
*/}}
{{- define "jlmedaios.redisPort" -}}
{{- if .Values.internal.redis.enabled -}}
{{- "6379" -}}
{{- else -}}
{{- .Values.external.redis.port -}}
{{- end -}}
{{- end -}}
