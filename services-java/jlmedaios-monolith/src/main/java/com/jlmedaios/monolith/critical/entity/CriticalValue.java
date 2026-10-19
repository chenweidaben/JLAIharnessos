/*
 * 健澜科技 jlmedaios - 危急值实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.critical.entity;

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
 * 危急值实体。
 *
 * <p>append-only: 危急值报告不可修改，闭环时间戳审计</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "critical_value")
public class CriticalValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "test_item")
    private String testItem;

    @Column(name = "result_value")
    private String resultValue;

    @Column(name = "reference_range")
    private String referenceRange;

    // CRITICAL 危急 / WARNING 警告
    @Column(name = "level")
    private String level;

    // 检验科报告时间
    @Column(name = "reported_time")
    @Builder.Default
    private LocalDateTime reportedTime = LocalDateTime.now();

    // 医生接收时间
    @Column(name = "receiver_ack_time")
    private LocalDateTime receiverAckTime;

    @Column(name = "ack_by")
    private String ackBy;

    // 临床处置
    @Column(name = "clinical_action")
    private String clinicalAction;

    @Column(name = "status")
    @Builder.Default
    private String status = "REPORTED";

    // 超时升级：0=未升级，1=升级科主任，2=升级医务科
    @Column(name = "escalation_level")
    @Builder.Default
    private Integer escalationLevel = 0;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
