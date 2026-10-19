/*
 * 健澜科技 jlmedaios - 医嘱 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.orders.service;

import com.jlmedaios.his.orders.entity.Orders;
import com.jlmedaios.his.orders.repository.OrdersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 医嘱 Service。
 */
@Service
@RequiredArgsConstructor
public class OrdersService {

    private final OrdersRepository ordersRepository;

    /**
     * 开立医嘱。
     *
     * @param orders 医嘱
     * @return 已持久化的医嘱
     */
    public Orders create(Orders orders) {
        return ordersRepository.save(orders);
    }

    /**
     * 按患者 ID 查询医嘱列表。
     *
     * @param patientId 患者 ID
     * @return 医嘱列表
     */
    public List<Orders> getByPatientId(Long patientId) {
        return ordersRepository.findByPatientId(patientId);
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
