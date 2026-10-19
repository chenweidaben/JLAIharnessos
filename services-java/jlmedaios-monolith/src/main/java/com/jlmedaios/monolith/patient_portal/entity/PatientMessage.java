/*
 * 健澜科技 jlmedaios - 患者消息实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_portal.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 患者消息实体。
 *
 * <p>append-only: 患者消息不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "patient_message")
public class PatientMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id")
    private String messageId;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "message_type")
    private String messageType;

    @Column(name = "title")
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "send_time")
    @Builder.Default
    private LocalDateTime sendTime = LocalDateTime.now();

    @Column(name = "read_status")
    @Builder.Default
    private String readStatus = "UNREAD";
}
