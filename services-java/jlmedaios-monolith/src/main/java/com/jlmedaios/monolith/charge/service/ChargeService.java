/*
 * 健澜科技 jlmedaios - 收费 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.charge.service;

import com.jlmedaios.monolith.charge.entity.Charge;
import com.jlmedaios.monolith.charge.repository.ChargeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 收费 Service。
 */
@Service
@RequiredArgsConstructor
public class ChargeService {

    private final ChargeRepository chargeRepository;

    /**
     * 创建收费。
     *
     * @param charge 收费
     * @return 已持久化的收费
     */
    public Charge create(Charge charge) {
        return chargeRepository.save(charge);
    }

    /**
     * 按挂号 ID 查询收费列表。
     *
     * @param registerId 挂号 ID
     * @return 收费列表
     */
    public List<Charge> getByRegisterId(Long registerId) {
        return chargeRepository.findByRegisterId(registerId);
    }
}
