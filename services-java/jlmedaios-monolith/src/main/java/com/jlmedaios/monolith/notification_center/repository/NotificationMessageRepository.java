/*
 * 健澜科技 jlmedaios - 通知消息 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.notification_center.repository;

import com.jlmedaios.monolith.notification_center.entity.NotificationMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 通知消息 Repository。
 */
@Repository
public interface NotificationMessageRepository extends JpaRepository<NotificationMessage, Long> {

    /**
     * 按发送状态查询通知消息。
     *
     * @param sendStatus 发送状态
     * @return 通知消息列表
     */
    List<NotificationMessage> findBySendStatus(String sendStatus);

    /**
     * 按接收人 ID 查询通知消息。
     *
     * @param receiverId 接收人 ID
     * @return 通知消息列表
     */
    List<NotificationMessage> findByReceiverId(String receiverId);
}
