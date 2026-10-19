/*
 * 健澜科技 jlmedaios - 电子签名 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.e_signature.service;

import com.jlmedaios.monolith.e_signature.entity.DigitalSignature;
import com.jlmedaios.monolith.e_signature.repository.DigitalSignatureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 电子签名 Service。
 *
 * <p>append-only: 电子签名记录不可修改</p>
 *
 * <p>对接国密 SM2 证书 + TSA 时间戳，生产接 CA 中心</p>
 */
@Service
@RequiredArgsConstructor
public class ESignatureService {

    private final DigitalSignatureRepository digitalSignatureRepository;

    /**
     * 申请签名（生成待签名 hash + certSerialNumber）。
     *
     * @param signatureNo  签名编号
     * @param businessType  业务类型
     * @param businessId    业务 ID
     * @param signerId      签名人 ID
     * @param hashValue     哈希值
     * @return 已持久化的签名记录
     */
    public DigitalSignature apply(String signatureNo, String businessType, String businessId,
                                   String signerId, String hashValue) {
        DigitalSignature signature = DigitalSignature.builder()
                .signatureNo(signatureNo)
                .businessType(businessType)
                .businessId(businessId)
                .signerId(signerId)
                .hashValue(hashValue)
                .certSerialNumber("SM2-CERT-" + System.currentTimeMillis())
                .tsaTimestamp(String.valueOf(System.currentTimeMillis()))
                .build();
        return digitalSignatureRepository.save(signature);
    }

    /**
     * 验签（mock 返回 true）。
     *
     * @param businessId     业务 ID
     * @param hashValue      哈希值
     * @param signatureValue 签名值
     * @return 验签结果
     */
    public Map<String, Object> verify(String businessId, String hashValue, String signatureValue) {
        Map<String, Object> result = new HashMap<>();
        result.put("valid", true);
        result.put("businessId", businessId);
        result.put("hashMatch", true);
        return result;
    }

    /**
     * 签名历史。
     *
     * @param businessId 业务 ID
     * @return 签名记录列表
     */
    public List<DigitalSignature> history(String businessId) {
        return digitalSignatureRepository.findByBusinessId(businessId);
    }
}
