/*
 * 健澜科技 jlmedaios - 护理执行 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing.service;

import com.jlmedaios.monolith.nursing.entity.NursingOrder;
import com.jlmedaios.monolith.nursing.repository.NursingOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 护理执行 Service。
 */
@Service
@RequiredArgsConstructor
public class NursingService {

    private final NursingOrderRepository nursingOrderRepository;

    /**
     * 创建护理医嘱。
     *
     * @param nursingOrder 护理医嘱
     * @return 已持久化的护理医嘱
     */
    public NursingOrder create(NursingOrder nursingOrder) {
        return nursingOrderRepository.save(nursingOrder);
    }

    /**
     * 执行护理医嘱（status → EXECUTED + nurseName）。
     *
     * @param id        护理医嘱 ID
     * @param nurseName 护士姓名
     * @return 更新后的护理医嘱
     */
    public Optional<NursingOrder> execute(Long id, String nurseName) {
        Optional<NursingOrder> opt = nursingOrderRepository.findById(id);
        opt.ifPresent(o -> {
            o.setStatus("EXECUTED");
            o.setNurseName(nurseName);
            nursingOrderRepository.save(o);
        });
        return opt;
    }
}
