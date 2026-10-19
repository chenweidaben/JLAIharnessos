/*
 * 健澜科技 jlmedaios - 医嘱 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.orders.controller;

import com.jlmedaios.his.orders.common.Result;
import com.jlmedaios.his.orders.entity.Orders;
import com.jlmedaios.his.orders.service.OrdersService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 医嘱 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/his/orders")
public class OrdersController {

    private final OrdersService ordersService;

    /**
     * 开立医嘱。
     *
     * @param orders 医嘱
     * @return Result<Orders>
     */
    @PostMapping
    public Result<Orders> create(@RequestBody Orders orders) {
        return Result.ok(ordersService.create(orders));
    }

    /**
     * 按患者 ID 查询医嘱列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<Orders>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<Orders>> getByPatientId(@PathVariable Long patientId) {
        return Result.ok(ordersService.getByPatientId(patientId));
    }

    /**
     * 执行医嘱。
     *
     * @param id 医嘱 ID
     * @return Result<Orders>
     */
    @PutMapping("/{id}/execute")
    public Result<Orders> execute(@PathVariable Long id) {
        return ordersService.execute(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "医嘱不存在"));
    }

    /**
     * 取消医嘱。
     *
     * @param id 医嘱 ID
     * @return Result<Orders>
     */
    @PutMapping("/{id}/cancel")
    public Result<Orders> cancel(@PathVariable Long id) {
        return ordersService.cancel(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "医嘱不存在"));
    }
}
