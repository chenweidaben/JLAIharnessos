/*
 * 健澜科技 jlmedaios - 挂号 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.reg.service;

import com.jlmedaios.monolith.reg.entity.Register;
import com.jlmedaios.monolith.reg.repository.RegisterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 挂号 Service。
 */
@Service
@RequiredArgsConstructor
public class RegisterService {

    private final RegisterRepository registerRepository;

    /**
     * 创建挂号。
     *
     * @param register 挂号
     * @return 已持久化的挂号
     */
    public Register create(Register register) {
        return registerRepository.save(register);
    }

    /**
     * 按 ID 查询挂号。
     *
     * @param id 挂号 ID
     * @return 挂号 Optional
     */
    public Optional<Register> getById(Long id) {
        return registerRepository.findById(id);
    }
}
