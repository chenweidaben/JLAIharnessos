/*
 * 健澜科技 jlmedaios - 消息通知中心 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.notification_center.service;

import com.jlmedaios.monolith.notification_center.entity.NotificationMessage;
import com.jlmedaios.monolith.notification_center.repository.NotificationMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 消息通知中心 Service。
 *
 * <p>append-only: 通知消息不可修改；生产接短信网关/微信模板消息，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class NotificationCenterService {

    private final NotificationMessageRepository notificationMessageRepository;

    /**
     * 发送通知（mock 返回 DELIVERED）。
     *
     * @param receiverId 接收人 ID
     * @param channel    渠道
     * @param title      标题
     * @param content    内容
     * @return 已持久化的通知消息
     */
    public NotificationMessage sendNotification(String receiverId, String channel,
                                                  String title, String content) {
        NotificationMessage message = NotificationMessage.builder()
                .messageId(UUID.randomUUID().toString())
                .receiverId(receiverId)
                .channel(channel)
                .title(title)
                .content(content)
                .sendStatus("DELIVERED")
                .sendTime(LocalDateTime.now())
                .build();
        return notificationMessageRepository.save(message);
    }

    /**
     * 发送历史。
     *
     * @return 通知消息列表
     */
    public List<NotificationMessage> history() {
        return notificationMessageRepository.findAll();
    }

    /**
     * 失败重发列表（sendStatus=FAILED）。
     *
     * @return 通知消息列表
     */
    public List<NotificationMessage> failedList() {
        return notificationMessageRepository.findBySendStatus("FAILED");
    }
}
