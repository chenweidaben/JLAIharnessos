/*
 * 健澜科技 jlmedaios - 医嘱 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.orders.service;

import com.jlmedaios.monolith.orders.entity.Orders;
import com.jlmedaios.monolith.orders.repository.OrdersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 医嘱 Service。
 */
@Service
@RequiredArgsConstructor
public class OrdersService {

    private final OrdersRepository ordersRepository;

    /**
     * 创建医嘱。
     *
     * @param orders 医嘱
     * @return 已持久化的医嘱
     */
    public Orders create(Orders orders) {
        return ordersRepository.save(orders);
    }

    /**
     * 执行医嘱（status → EXECUTED）。
     *
     * @param id 医嘱 ID
     * @return 更新后的医嘱
     */
    public Optional<Orders> execute(Long id) {
        Optional<Orders> opt = ordersRepository.findById(id);
        opt.ifPresent(o -> {
            o.setStatus("EXECUTED");
            ordersRepository.save(o);
        });
        return opt;
    }

    /**
     * 取消医嘱（status → CANCELLED）。
     *
     * @param id 医嘱 ID
     * @return 更新后的医嘱
     */
    public Optional<Orders> cancel(Long id) {
        Optional<Orders> opt = ordersRepository.findById(id);
        opt.ifPresent(o -> {
            o.setStatus("CANCELLED");
            ordersRepository.save(o);
        });
        return opt;
    }
}
