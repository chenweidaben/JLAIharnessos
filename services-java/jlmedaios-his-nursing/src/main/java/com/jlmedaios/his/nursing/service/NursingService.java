/*
 * 健澜科技 jlmedaios - 护理执行 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.nursing.service;

import com.jlmedaios.his.nursing.entity.NursingOrder;
import com.jlmedaios.his.nursing.repository.NursingOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 护理执行 Service。
 */
@Service
@RequiredArgsConstructor
public class NursingService {

    private final NursingOrderRepository nursingOrderRepository;

    /**
     * 开立护理医嘱。
     *
     * @param patientId   患者 ID
     * @param nursingType 护理类型
     * @param content     护理内容
     * @return 已持久化的护理医嘱
     */
    public NursingOrder create(Long patientId, String nursingType, String content) {
        NursingOrder order = NursingOrder.builder()
                .patientId(patientId)
                .nursingType(nursingType)
                .content(content)
                .build();
        return nursingOrderRepository.save(order);
    }

    /**
     * 按患者 ID 查询护理医嘱列表。
     *
     * @param patientId 患者 ID
     * @return 护理医嘱列表
     */
    public List<NursingOrder> getByPatientId(Long patientId) {
        return nursingOrderRepository.findByPatientId(patientId);
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
