/*
 * 健澜科技 jlmedaios - 不良事件上报实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.incident_report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 不良事件上报实体。
 *
 * <p>append-only: 不良事件描述不可修改，调查过程留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "incident_report")
public class IncidentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_no")
    private String reportNo;

    // @Sensitive 上报人工号，脱敏存储
    @Column(name = "reporter_id")
    private String reporterId;

    @Column(name = "event_type")
    private String eventType;

    @Column(name = "event_level")
    private String eventLevel;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "event_time")
    private LocalDateTime eventTime;

    @Column(name = "report_time")
    @Builder.Default
    private LocalDateTime reportTime = LocalDateTime.now();

    @Column(name = "status")
    @Builder.Default
    private String status = "REPORTED";

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;
}
