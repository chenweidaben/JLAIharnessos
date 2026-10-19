/*
 * 健澜科技 jlmedaios - 医嘱管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.orders_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.orders_management.entity.Order;
import com.jlmedaios.monolith.orders_management.service.OrdersManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 医嘱管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/order")
public class OrdersManagementController {

    private final OrdersManagementService ordersManagementService;

    /**
     * 创建医嘱。
     *
     * @param body {orderNo, patientId, orderType, orderContent, startDate, endDate, doctorId}
     * @return Result<Order>
     */
    @PostMapping("/create")
    public Result<Order> create(@RequestBody Map<String, Object> body) {
        Order order = ordersManagementService.create(
                String.valueOf(body.get("orderNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("orderType")),
                String.valueOf(body.get("orderContent")),
                LocalDate.parse(String.valueOf(body.get("startDate"))),
                LocalDate.parse(String.valueOf(body.get("endDate"))),
                String.valueOf(body.get("doctorId"))
        );
        return Result.ok(order);
    }

    /**
     * 执行医嘱。
     *
     * @param id 医嘱 ID
     * @return Result<Order>
     */
    @PutMapping("/{id}/execute")
    public Result<Order> execute(@PathVariable Long id) {
        return ordersManagementService.execute(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 停止医嘱。
     *
     * @param id 医嘱 ID
     * @return Result<Order>
     */
    @PutMapping("/{id}/stop")
    public Result<Order> stop(@PathVariable Long id) {
        return ordersManagementService.stop(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 患者当前医嘱列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<Order>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<Order>> patientOrders(@PathVariable String patientId) {
        return Result.ok(ordersManagementService.patientOrders(patientId));
    }
}
