/*
 * 健澜科技 jlmedaios - 检验高级 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lab_advanced.service;

import com.jlmedaios.monolith.lab_advanced.entity.LabOrder;
import com.jlmedaios.monolith.lab_advanced.entity.LabResult;
import com.jlmedaios.monolith.lab_advanced.repository.LabOrderRepository;
import com.jlmedaios.monolith.lab_advanced.repository.LabResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 检验高级 Service。
 *
 * <p>append-only: 检验结果不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class LabAdvancedService {

    private final LabOrderRepository labOrderRepository;
    private final LabResultRepository labResultRepository;

    /**
     * 创建检验申请单。
     *
     * @param orderNo      申请单编号
     * @param patientId     患者 ID
     * @param testPanel    检验组合
     * @param specimenType  标本类型
     * @return 已持久化的申请单
     */
    public LabOrder createOrder(String orderNo, String patientId, String testPanel,
                                 String specimenType) {
        LabOrder order = LabOrder.builder()
                .orderNo(orderNo)
                .patientId(patientId)
                .testPanel(testPanel)
                .specimenType(specimenType)
                .build();
        return labOrderRepository.save(order);
    }

    /**
     * 采样（status=COLLECTED + collectTime）。
     *
     * @param orderId 申请单 ID
     * @return 已更新的申请单
     */
    public Optional<LabOrder> collect(Long orderId) {
        Optional<LabOrder> opt = labOrderRepository.findById(orderId);
        if (opt.isPresent()) {
            LabOrder order = opt.get();
            order.setStatus("COLLECTED");
            order.setCollectTime(LocalDateTime.now());
            labOrderRepository.save(order);
        }
        return opt;
    }

    /**
     * 检验结果。
     *
     * @param orderNo 申请单编号
     * @return 结果列表
     */
    public List<LabResult> results(String orderNo) {
        return labResultRepository.findByOrderNo(orderNo);
    }

    /**
     * 异常结果列表（abnormalFlag=H or L）。
     *
     * @return 异常结果列表
     */
    public List<LabResult> abnormalResults() {
        List<LabResult> high = labResultRepository.findByAbnormalFlag("H");
        List<LabResult> low = labResultRepository.findByAbnormalFlag("L");
        high.addAll(low);
        return high;
    }
}
