/*
 * 健澜科技 jlmedaios - 挂号 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.reg.controller;

import com.jlmedaios.his.reg.common.Result;
import com.jlmedaios.his.reg.entity.Register;
import com.jlmedaios.his.reg.service.RegisterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 挂号 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/his/register")
public class RegisterController {

    private final RegisterService registerService;

    /**
     * 创建挂号记录。
     *
     * @param register 挂号记录
     * @return Result<Register>
     */
    @PostMapping
    public Result<Register> create(@RequestBody Register register) {
        return Result.ok(registerService.create(register));
    }

    /**
     * 按 ID 查询挂号记录。
     *
     * @param id 挂号 ID
     * @return Result<Register>，找不到返回 404
     */
    @GetMapping("/{id}")
    public Result<Register> getById(@PathVariable Long id) {
        return registerService.getById(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "挂号记录不存在"));
    }
}
