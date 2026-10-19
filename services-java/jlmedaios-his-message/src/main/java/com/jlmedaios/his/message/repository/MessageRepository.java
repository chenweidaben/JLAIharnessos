/*
 * 健澜科技 jlmedaios - 消息 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.message.repository;

import com.jlmedaios.his.message.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 消息 Repository。
 */
@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    /**
     * 按接收人 ID 查询消息列表（按发送时间倒序）。
     *
     * @param receiverId 接收人 ID
     * @return 消息列表
     */
    List<Message> findByReceiverIdOrderBySendTimeDesc(String receiverId);
}
