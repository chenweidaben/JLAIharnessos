/*
 * 健澜科技 jlmedaios - 消息实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.message.entity;

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
 * 消息实体。
 * readStatus 默认 false；sendTime 默认当前时间。
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "message")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "receiver_id")
    private String receiverId;

    @Column(name = "content")
    private String content;

    @Column(name = "type")
    private String type;

    @Column(name = "read_status")
    @Builder.Default
    private Boolean readStatus = false;

    @Column(name = "send_time")
    @Builder.Default
    private LocalDateTime sendTime = LocalDateTime.now();
}
