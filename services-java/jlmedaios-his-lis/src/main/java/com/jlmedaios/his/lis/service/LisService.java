/*
 * 健澜科技 jlmedaios - 检验对接 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.lis.service;

import com.jlmedaios.his.lis.entity.LisRequest;
import com.jlmedaios.his.lis.repository.LisRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 检验对接 Service。
 * TODO: 对接 LIS 系统 HL7 v2.x / FHIR R4 接口。
 */
@Service
@RequiredArgsConstructor
public class LisService {

    private final LisRequestRepository lisRequestRepository;

    /**
     * 申请检验。
     *
     * @param patientId 患者 ID
     * @param testCode  检验编码
     * @param testName  检验名称
     * @return 已持久化的检验申请
     */
    public LisRequest request(Long patientId, String testCode, String testName) {
        LisRequest req = LisRequest.builder()
                .patientId(patientId)
                .testCode(testCode)
                .testName(testName)
                .build();
        return lisRequestRepository.save(req);
    }

    /**
     * 查询检验结果。
     *
     * @param id 检验申请 ID
     * @return 检验申请 Optional
     */
    public Optional<LisRequest> getResult(Long id) {
        return lisRequestRepository.findById(id);
    }
}
