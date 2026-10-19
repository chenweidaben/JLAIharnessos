/*
 * 健澜科技 jlmedaios - 通知消息实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.notification_center.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 通知消息实体。
 *
 * <p>append-only: 通知消息不可修改；生产接短信网关/微信模板消息，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "notification_message")
public class NotificationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id")
    private String messageId;

    // @Sensitive 接收人 ID，脱敏存储
    @Column(name = "receiver_id")
    private String receiverId;

    @Column(name = "channel")
    private String channel;

    @Column(name = "title")
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "send_status")
    @Builder.Default
    private String sendStatus = "PENDING";

    @Column(name = "send_time")
    @Builder.Default
    private LocalDateTime sendTime = LocalDateTime.now();

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;
}
