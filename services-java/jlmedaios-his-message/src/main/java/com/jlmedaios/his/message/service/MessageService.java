/*
 * 健澜科技 jlmedaios - 消息通知 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.message.service;

import com.jlmedaios.his.message.entity.Message;
import com.jlmedaios.his.message.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 消息通知 Service。
 */
@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;

    /**
     * 发送消息。
     *
     * @param receiverId 接收人 ID
     * @param content    消息内容
     * @param type       消息类型
     * @return 已持久化的消息
     */
    public Message send(String receiverId, String content, String type) {
        Message msg = Message.builder()
                .receiverId(receiverId)
                .content(content)
                .type(type)
                .build();
        return messageRepository.save(msg);
    }

    /**
     * 收件箱。
     *
     * @param receiverId 接收人 ID
     * @return 消息列表
     */
    public List<Message> inbox(String receiverId) {
        return messageRepository.findByReceiverIdOrderBySendTimeDesc(receiverId);
    }

    /**
     * 标记已读。
     *
     * @param id 消息 ID
     * @return 更新后的消息
     */
    public Optional<Message> markRead(Long id) {
        Optional<Message> opt = messageRepository.findById(id);
        opt.ifPresent(m -> {
            m.setReadStatus(true);
            messageRepository.save(m);
        });
        return opt;
    }
}
