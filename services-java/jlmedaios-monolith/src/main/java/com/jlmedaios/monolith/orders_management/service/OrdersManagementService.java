/*
 * 健澜科技 jlmedaios - 医嘱管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.orders_management.service;

import com.jlmedaios.monolith.orders_management.entity.Order;
import com.jlmedaios.monolith.orders_management.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 医嘱管理 Service。
 *
 * <p>append-only: 医嘱不可修改，执行/停止留痕</p>
 */
@Service
@RequiredArgsConstructor
public class OrdersManagementService {

    private final OrderRepository orderRepository;

    /**
     * 创建医嘱。
     *
     * @param orderNo      医嘱编号
     * @param patientId    患者 ID
     * @param orderType    医嘱类型
     * @param orderContent 医嘱内容
     * @param startDate    开始日期
     * @param endDate      结束日期
     * @param doctorId     开立医生工号
     * @return 已持久化的医嘱
     */
    public Order create(String orderNo, String patientId, String orderType,
                        String orderContent, LocalDate startDate, LocalDate endDate,
                        String doctorId) {
        Order order = Order.builder()
                .orderNo(orderNo)
                .patientId(patientId)
                .orderType(orderType)
                .orderContent(orderContent)
                .startDate(startDate)
                .endDate(endDate)
                .doctorId(doctorId)
                .build();
        return orderRepository.save(order);
    }

    /**
     * 执行医嘱（status=EXECUTED）。
     *
     * @param id 医嘱 ID
     * @return 已更新的医嘱
     */
    public Optional<Order> execute(Long id) {
        Optional<Order> opt = orderRepository.findById(id);
        if (opt.isPresent()) {
            Order order = opt.get();
            order.setStatus("EXECUTED");
            orderRepository.save(order);
        }
        return opt;
    }

    /**
     * 停止医嘱（status=STOPPED）。
     *
     * @param id 医嘱 ID
     * @return 已更新的医嘱
     */
    public Optional<Order> stop(Long id) {
        Optional<Order> opt = orderRepository.findById(id);
        if (opt.isPresent()) {
            Order order = opt.get();
            order.setStatus("STOPPED");
            orderRepository.save(order);
        }
        return opt;
    }

    /**
     * 患者当前医嘱列表。
     *
     * @param patientId 患者 ID
     * @return 医嘱列表
     */
    public List<Order> patientOrders(String patientId) {
        return orderRepository.findByPatientId(patientId).stream()
                .filter(o -> !"STOPPED".equals(o.getStatus()))
                .toList();
    }
}
