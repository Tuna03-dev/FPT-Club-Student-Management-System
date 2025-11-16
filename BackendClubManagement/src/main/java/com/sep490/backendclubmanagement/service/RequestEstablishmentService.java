package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.AssignRequestEstablishmentRequest;
import com.sep490.backendclubmanagement.dto.request.CreateRequestEstablishmentRequest;
import com.sep490.backendclubmanagement.dto.request.CompleteDefenseRequest;
import com.sep490.backendclubmanagement.dto.request.ProposeDefenseScheduleRequest;
import com.sep490.backendclubmanagement.dto.request.RejectContactRequest;
import com.sep490.backendclubmanagement.dto.request.RejectDefenseScheduleRequest;
import com.sep490.backendclubmanagement.dto.request.RejectProposalRequest;
import com.sep490.backendclubmanagement.dto.request.SubmitFinalFormRequest;
import com.sep490.backendclubmanagement.dto.request.SubmitProposalRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateRequestEstablishmentRequest;
import com.sep490.backendclubmanagement.dto.response.ClubCreationFinalFormResponse;
import com.sep490.backendclubmanagement.dto.response.ClubProposalResponse;
import com.sep490.backendclubmanagement.dto.response.DefenseScheduleResponse;
import com.sep490.backendclubmanagement.dto.response.RequestEstablishmentResponse;
import com.sep490.backendclubmanagement.dto.response.WorkflowHistoryResponse;
import com.sep490.backendclubmanagement.entity.ClubCreationFinalForm;
import com.sep490.backendclubmanagement.entity.ClubProposal;
import com.sep490.backendclubmanagement.entity.DefenseSchedule;
import com.sep490.backendclubmanagement.entity.DefenseScheduleStatus;
import com.sep490.backendclubmanagement.entity.RequestEstablishment;
import com.sep490.backendclubmanagement.entity.RequestEstablishmentStatus;
import com.sep490.backendclubmanagement.entity.User;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.entity.ClubCreationWorkFlowHistory;
import com.sep490.backendclubmanagement.repository.ClubCreationFinalFormRepository;
import com.sep490.backendclubmanagement.repository.ClubCreationWorkFlowHistoryRepository;
import com.sep490.backendclubmanagement.repository.ClubProposalRepository;
import com.sep490.backendclubmanagement.repository.DefenseScheduleRepository;
import com.sep490.backendclubmanagement.repository.RequestEstablishmentRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RequestEstablishmentService {

    private final RequestEstablishmentRepository requestEstablishmentRepository;
    private final UserRepository userRepository;
    private final ClubCreationWorkFlowHistoryRepository workflowHistoryRepository;
    private final WorkflowHistoryService workflowHistoryService;
    private final ClubProposalRepository clubProposalRepository;
    private final CloudinaryService cloudinaryService;
    private final DefenseScheduleRepository defenseScheduleRepository;
    private final ClubCreationFinalFormRepository clubCreationFinalFormRepository;

    @Transactional
    public RequestEstablishmentResponse createRequest(Long userId, CreateRequestEstablishmentRequest request) throws AppException {
        if (request.getClubName() == null || request.getClubName().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Tên CLB không được để trống");
        }
        if (request.getClubCategory() == null || request.getClubCategory().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Danh mục CLB không được để trống");
        }
        if (request.getExpectedMemberCount() == null || request.getExpectedMemberCount() <= 0) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Số lượng thành viên dự kiến phải lớn hơn 0");
        }

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        RequestEstablishmentStatus status = Boolean.TRUE.equals(request.getIsDraft())
                ? RequestEstablishmentStatus.DRAFT
                : RequestEstablishmentStatus.SUBMITTED;

        RequestEstablishment requestEstablishment = RequestEstablishment.builder()
                .clubName(request.getClubName().trim())
                .clubCategory(request.getClubCategory().trim())
                .expectedMemberCount(request.getExpectedMemberCount())
                .activityObjectives(request.getActivityObjectives())
                .expectedActivities(request.getExpectedActivities())
                .description(request.getDescription())
                .status(status)
                .createdBy(creator)
                .sendDate(status == RequestEstablishmentStatus.SUBMITTED ? LocalDateTime.now() : null)
                .build();

        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);

        return mapToResponse(requestEstablishment);
    }

    public Page<RequestEstablishmentResponse> getMyRequests(Long userId, RequestEstablishmentStatus status, Pageable pageable) throws AppException {
        Page<RequestEstablishment> requests;
        if (status != null) {
            requests = requestEstablishmentRepository.findByCreatedByAndStatus(userId, status, pageable);
        } else {
            requests = requestEstablishmentRepository.findByCreatedBy(userId, pageable);
        }
        return requests.map(this::mapToResponse);
    }

    public RequestEstablishmentResponse getRequestDetail(Long requestId, Long userId) throws AppException {
        RequestEstablishment request = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (!request.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem yêu cầu này");
        }

        return mapToResponse(request);
    }

    @Transactional
    public RequestEstablishmentResponse updateRequest(Long requestId, Long userId, UpdateRequestEstablishmentRequest request) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission: only creator can update
        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền cập nhật yêu cầu này");
        }

        // Check status: only DRAFT can be updated
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.DRAFT) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể cập nhật yêu cầu ở trạng thái DRAFT");
        }

       // Update fields if provided
        if (request.getClubName() != null && !request.getClubName().trim().isEmpty()) {
            requestEstablishment.setClubName(request.getClubName().trim());
        }
        if (request.getClubCategory() != null && !request.getClubCategory().trim().isEmpty()) {
            requestEstablishment.setClubCategory(request.getClubCategory().trim());
        }
        if (request.getExpectedMemberCount() != null && request.getExpectedMemberCount() > 0) {
            requestEstablishment.setExpectedMemberCount(request.getExpectedMemberCount());
        }
        if (request.getActivityObjectives() != null) {
            requestEstablishment.setActivityObjectives(request.getActivityObjectives());
        }
        if (request.getExpectedActivities() != null) {
            requestEstablishment.setExpectedActivities(request.getExpectedActivities());
        }
        if (request.getDescription() != null) {
            requestEstablishment.setDescription(request.getDescription());
        }

        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);

        return mapToResponse(requestEstablishment);
    }

    @Transactional
    public void deleteRequest(Long requestId, Long userId) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xóa yêu cầu này");
        }

        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.DRAFT) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể xóa yêu cầu ở trạng thái DRAFT");
        }

        requestEstablishmentRepository.delete(requestEstablishment);

    }

    @Transactional
    public RequestEstablishmentResponse submitRequest(Long requestId, Long userId) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền gửi yêu cầu này");
        }

        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.DRAFT) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể gửi yêu cầu ở trạng thái DRAFT");
        }

        // Validate required fields before submitting
        if (requestEstablishment.getClubName() == null || requestEstablishment.getClubName().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Tên CLB không được để trống");
        }
        if (requestEstablishment.getClubCategory() == null || requestEstablishment.getClubCategory().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Danh mục CLB không được để trống");
        }
        if (requestEstablishment.getExpectedMemberCount() == null || requestEstablishment.getExpectedMemberCount() <= 0) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Số lượng thành viên dự kiến phải lớn hơn 0");
        }

        requestEstablishment.setStatus(RequestEstablishmentStatus.SUBMITTED);
        requestEstablishment.setSendDate(LocalDateTime.now());

        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        requestEstablishmentRepository.flush();

        try {
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), userId, "REQUEST_SUBMITTED", "Sinh viên đã gửi yêu cầu thành lập CLB");
        } catch (Exception e) {
            log.error("Failed to create workflow history for request {}, but continuing: {}", 
                    requestEstablishment.getId(), e.getMessage(), e);
        }

        return mapToResponse(requestEstablishment);
    }

    //  STAFF

    public Page<RequestEstablishmentResponse> getPendingRequests(Pageable pageable) throws AppException {
        List<RequestEstablishmentStatus> pendingStatuses = List.of(
                RequestEstablishmentStatus.SUBMITTED,
                RequestEstablishmentStatus.CONTACT_CONFIRMATION_PENDING
        );
        Page<RequestEstablishment> requests = requestEstablishmentRepository.findByStatusIn(pendingStatuses, pageable);
        return requests.map(this::mapToResponse);
    }

    public RequestEstablishmentResponse getRequestDetailForStaff(Long requestId) throws AppException {
        RequestEstablishment request = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));
        return mapToResponse(request);
    }

    @Transactional
    public RequestEstablishmentResponse assignRequest(Long requestId, Long staffId, AssignRequestEstablishmentRequest request) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.SUBMITTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể gán yêu cầu ở trạng thái SUBMITTED");
        }

        Long assignedStaffId = request.getStaffId() != null ? request.getStaffId() : staffId;
        User assignedStaff = userRepository.findById(assignedStaffId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND, "Không tìm thấy staff được gán"));

        requestEstablishment.setAssignedStaff(assignedStaff);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);

        log.info("Assigned request establishment {} to staff: {} by staff: {}", requestId, assignedStaffId, staffId);

        return mapToResponse(requestEstablishment);
    }

    @Transactional
    public RequestEstablishmentResponse receiveRequest(Long requestId, Long staffId) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền nhận yêu cầu này");
        }

        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.SUBMITTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể nhận yêu cầu ở trạng thái SUBMITTED");
        }

        LocalDateTime now = LocalDateTime.now();
        requestEstablishment.setReceivedAt(now);
        requestEstablishment.setConfirmationDeadline(now.plusDays(5));
        requestEstablishment.setStatus(RequestEstablishmentStatus.CONTACT_CONFIRMATION_PENDING);

        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        try {
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "REQUEST_REVIEW", "Staff đã nhận yêu cầu và bắt đầu xem xét");
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Received request establishment {} by staff: {}", requestId, staffId);

        return mapToResponse(requestEstablishment);
    }

    @Transactional
    public RequestEstablishmentResponse confirmContact(Long requestId, Long staffId) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xác nhận yêu cầu này");
        }

        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.CONTACT_CONFIRMATION_PENDING) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể xác nhận liên hệ ở trạng thái CONTACT_CONFIRMATION_PENDING");
        }

        if (requestEstablishment.getConfirmationDeadline() != null &&
            LocalDateTime.now().isAfter(requestEstablishment.getConfirmationDeadline())) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Đã quá hạn xác nhận liên hệ");
        }

        requestEstablishment.setConfirmedAt(LocalDateTime.now());
        requestEstablishment.setStatus(RequestEstablishmentStatus.CONTACT_CONFIRMED);

        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        try {
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "REQUEST_REVIEW", "Staff đã xác nhận liên hệ với sinh viên");
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        return mapToResponse(requestEstablishment);
    }

    @Transactional
    public RequestEstablishmentResponse rejectContact(Long requestId, Long staffId, RejectContactRequest request) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền từ chối yêu cầu này");
        }

        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.CONTACT_CONFIRMATION_PENDING) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể từ chối ở trạng thái CONTACT_CONFIRMATION_PENDING");
        }

        requestEstablishment.setStatus(RequestEstablishmentStatus.CONTACT_REJECTED);

        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        try {
            String comment = "Staff từ chối xác nhận liên hệ. Lý do: " + (request.getReason() != null ? request.getReason() : "Không có lý do");
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "REQUEST_REVIEW", comment);
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Rejected contact for request establishment {} by staff: {}, reason: {}", 
                requestId, staffId, request.getReason());

        return mapToResponse(requestEstablishment);
    }

    @Transactional
    public RequestEstablishmentResponse requestProposal(Long requestId, Long staffId) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền yêu cầu đề án");
        }

       // Check status: only CONTACT_CONFIRMED can request proposal
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.CONTACT_CONFIRMED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể yêu cầu đề án sau khi đã xác nhận liên hệ");
        }

        requestEstablishment.setStatus(RequestEstablishmentStatus.PROPOSAL_REQUIRED);

        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        try {
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "PROPOSAL_REVIEW", "Staff đã yêu cầu sinh viên nộp đề án chi tiết");
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        return mapToResponse(requestEstablishment);
    }

    /**
     * Student nộp đề án chi tiết
     * Chuyển status từ PROPOSAL_REQUIRED → PROPOSAL_SUBMITTED
     * Hỗ trợ upload file trực tiếp (Word, Excel, PDF) hoặc dùng fileUrl
     */
    @Transactional
    public RequestEstablishmentResponse submitProposal(Long requestId, Long userId, SubmitProposalRequest request, MultipartFile file) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check ownership
        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền nộp đề án cho yêu cầu này");
        }

        // Check status: only PROPOSAL_REQUIRED or PROPOSAL_REJECTED can submit proposal
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.PROPOSAL_REQUIRED &&
            requestEstablishment.getStatus() != RequestEstablishmentStatus.PROPOSAL_REJECTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể nộp đề án khi trạng thái là PROPOSAL_REQUIRED hoặc PROPOSAL_REJECTED");
        }

        // Validate: phải có file hoặc fileUrl
        String fileUrl = request.getFileUrl();
        if ((file == null || file.isEmpty()) && (fileUrl == null || fileUrl.trim().isEmpty())) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Vui lòng upload file đề án hoặc cung cấp fileUrl");
        }

        // Upload file nếu có
        if (file != null && !file.isEmpty()) {
            try {
                // Validate file type (Word, Excel, PDF)
                String originalFilename = file.getOriginalFilename();
                if (originalFilename != null) {
                    String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
                    if (!extension.matches("pdf|doc|docx|xls|xlsx|ppt|pptx")) {
                        throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ chấp nhận file Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx) hoặc PDF (.pdf)");
                    }
                }

                // Upload file to Cloudinary in club/proposals folder
                CloudinaryService.UploadResult uploadResult = cloudinaryService.uploadFile(file, "club/proposals");
                fileUrl = uploadResult.url();
                log.info("Uploaded proposal file for request {}: {}", requestId, fileUrl);
            } catch (AppException e) {
                throw e; // Re-throw AppException
            } catch (Exception e) {
                log.error("Failed to upload proposal file: {}", e.getMessage(), e);
                throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể upload file đề án: " + e.getMessage());
            }
        }

        // Luôn tạo proposal mới (nhiều version) thay vì update proposal cũ
        ClubProposal proposal = ClubProposal.builder()
                .title(request.getTitle())
                .fileUrl(fileUrl)
                .requestEstablishment(requestEstablishment)
                .build();
        proposal = clubProposalRepository.save(proposal);
        log.info("Created new proposal version {} for request {}", proposal.getId(), requestId);

        // Update request status
        requestEstablishment.setStatus(RequestEstablishmentStatus.PROPOSAL_SUBMITTED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history
        try {
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), userId, "PROPOSAL_REVIEW", "Sinh viên đã nộp đề án chi tiết");
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Submitted proposal for request establishment {} by user: {}", requestId, userId);

        return mapToResponse(requestEstablishment);
    }

    /**
     * Student xem danh sách đề án của yêu cầu
     */
    public List<ClubProposalResponse> getProposals(Long requestId, Long userId) throws AppException {
        // Get request to check ownership
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check ownership
        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem đề án của yêu cầu này");
        }

        // Get all proposals for this request
        List<ClubProposal> proposals = clubProposalRepository.findAllByRequestEstablishmentIdOrderByCreatedAtDesc(requestId);

        return proposals.stream()
                .map(this::mapToProposalResponse)
                .toList();
    }

    /**
     * Student xem chi tiết đề án
     */
    public ClubProposalResponse getProposalDetail(Long requestId, Long proposalId, Long userId) throws AppException {
        // Get request to check ownership
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check ownership
        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem đề án của yêu cầu này");
        }

        // Get proposal
        ClubProposal proposal = clubProposalRepository.findByIdAndRequestEstablishmentId(proposalId, requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy đề án"));

        return mapToProposalResponse(proposal);
    }

    /**
     * Staff xem danh sách đề án đã nộp (status = PROPOSAL_SUBMITTED)
     * Chỉ hiển thị các proposals từ requests được assign cho staff đó
     */
    public Page<ClubProposalResponse> getSubmittedProposals(Long staffId, Pageable pageable) throws AppException {
        // Get all requests with PROPOSAL_SUBMITTED status assigned to this staff (without pagination first)
        List<RequestEstablishmentStatus> statuses = List.of(RequestEstablishmentStatus.PROPOSAL_SUBMITTED);
        List<RequestEstablishment> allRequests = requestEstablishmentRepository.findByAssignedStaffAndStatusIn(
                staffId, 
                statuses, 
                org.springframework.data.domain.Pageable.unpaged()
        ).getContent();
        
        // Get request IDs
        List<Long> requestIds = allRequests.stream()
                .map(RequestEstablishment::getId)
                .toList();
        
        if (requestIds.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }
        
        // Get all proposals for these requests, ordered by created date desc
        List<ClubProposal> allProposals = clubProposalRepository.findByRequestEstablishmentIdInOrderByCreatedAtDesc(requestIds);
        
        // Convert to response
        List<ClubProposalResponse> proposalResponses = allProposals.stream()
                .map(this::mapToProposalResponse)
                .toList();
        
        // Apply pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), proposalResponses.size());
        List<ClubProposalResponse> pagedContent = start < proposalResponses.size() 
                ? proposalResponses.subList(start, end) 
                : List.of();
        
        return new PageImpl<>(
                pagedContent,
                pageable,
                proposalResponses.size()
        );
    }

    /**
     * Staff xem chi tiết đề án
     */
    public ClubProposalResponse getProposalDetailForStaff(Long requestId, Long proposalId, Long staffId) throws AppException {
        // Get request to check permission
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission: only assigned staff can view
        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem đề án này");
        }

        // Get proposal
        ClubProposal proposal = clubProposalRepository.findByIdAndRequestEstablishmentId(proposalId, requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy đề án"));

        return mapToProposalResponse(proposal);
    }

    /**
     * Staff duyệt đề án
     * Chuyển status từ PROPOSAL_SUBMITTED → PROPOSAL_APPROVED
     */
    @Transactional
    public RequestEstablishmentResponse approveProposal(Long requestId, Long staffId) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission
        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền duyệt đề án này");
        }

        // Check status: only PROPOSAL_SUBMITTED can be approved
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.PROPOSAL_SUBMITTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể duyệt đề án ở trạng thái PROPOSAL_SUBMITTED");
        }

        // Get latest proposal (mới nhất) để duyệt
        List<ClubProposal> proposals = clubProposalRepository.findAllByRequestEstablishmentIdOrderByCreatedAtDesc(requestId);
        if (proposals.isEmpty()) {
            throw new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy đề án để duyệt");
        }
        ClubProposal proposal = proposals.get(0); // Lấy proposal mới nhất (đầu tiên trong list đã sort DESC)

        // Update status
        requestEstablishment.setStatus(RequestEstablishmentStatus.PROPOSAL_APPROVED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history
        try {
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "PROPOSAL_REVIEW", "Staff đã duyệt đề án: " + proposal.getTitle());
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Approved proposal for request establishment {} by staff: {}", requestId, staffId);

        return mapToResponse(requestEstablishment);
    }

    /**
     * Staff từ chối đề án
     * Chuyển status từ PROPOSAL_SUBMITTED → PROPOSAL_REJECTED
     */
    @Transactional
    public RequestEstablishmentResponse rejectProposal(Long requestId, Long staffId, RejectProposalRequest request) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission
        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền từ chối đề án này");
        }

        // Check status: only PROPOSAL_SUBMITTED can be rejected
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.PROPOSAL_SUBMITTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể từ chối đề án ở trạng thái PROPOSAL_SUBMITTED");
        }

        // Get latest proposal (mới nhất) để từ chối
        List<ClubProposal> proposals = clubProposalRepository.findAllByRequestEstablishmentIdOrderByCreatedAtDesc(requestId);
        if (proposals.isEmpty()) {
            throw new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy đề án để từ chối");
        }
        ClubProposal proposal = proposals.get(0); // Lấy proposal mới nhất (đầu tiên trong list đã sort DESC)

        // Update status
        requestEstablishment.setStatus(RequestEstablishmentStatus.PROPOSAL_REJECTED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history
        try {
            String comment = "Staff từ chối đề án: " + proposal.getTitle();
            if (request.getReason() != null && !request.getReason().trim().isEmpty()) {
                comment += ". Lý do: " + request.getReason();
            }
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "PROPOSAL_REVIEW", comment);
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Rejected proposal for request establishment {} by staff: {}, reason: {}", 
                requestId, staffId, request.getReason());

        return mapToResponse(requestEstablishment);
    }

    /**
     * Student đề xuất lịch bảo vệ
     * Chuyển status từ PROPOSAL_APPROVED → DEFENSE_SCHEDULE_PROPOSED
     */
    @Transactional
    public DefenseScheduleResponse proposeDefenseSchedule(Long requestId, Long userId, ProposeDefenseScheduleRequest request) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check ownership
        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền đề xuất lịch bảo vệ cho yêu cầu này");
        }

        // Check status: only PROPOSAL_APPROVED or DEFENSE_SCHEDULE_REJECTED can propose schedule
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.PROPOSAL_APPROVED &&
            requestEstablishment.getStatus() != RequestEstablishmentStatus.DEFENSE_SCHEDULE_REJECTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể đề xuất lịch bảo vệ khi trạng thái là PROPOSAL_APPROVED hoặc DEFENSE_SCHEDULE_REJECTED");
        }

        // Check if defense schedule already exists
        DefenseSchedule existingSchedule = defenseScheduleRepository.findByRequestEstablishmentId(requestId).orElse(null);
        
        DefenseSchedule schedule;
        if (existingSchedule != null) {
            // Update existing schedule
            existingSchedule.setDefenseDate(request.getDefenseDate());
            existingSchedule.setLocation(request.getLocation());
            existingSchedule.setMeetingLink(request.getMeetingLink());
            existingSchedule.setNotes(request.getNotes());
            existingSchedule.setResult(DefenseScheduleStatus.PROPOSED); // Reset to PROPOSED
            schedule = defenseScheduleRepository.save(existingSchedule);
            log.info("Updated defense schedule {} for request {}", schedule.getId(), requestId);
        } else {
            // Create new schedule
            schedule = DefenseSchedule.builder()
                    .defenseDate(request.getDefenseDate())
                    .location(request.getLocation())
                    .meetingLink(request.getMeetingLink())
                    .notes(request.getNotes())
                    .result(DefenseScheduleStatus.PROPOSED)
                    .requestEstablishment(requestEstablishment)
                    .build();
            schedule = defenseScheduleRepository.save(schedule);
            log.info("Created new defense schedule {} for request {}", schedule.getId(), requestId);
        }

        // Update request status
        requestEstablishment.setStatus(RequestEstablishmentStatus.DEFENSE_SCHEDULE_PROPOSED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history
        try {
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), userId, "PROPOSE_DEFENSE_TIME", "Sinh viên đã đề xuất lịch bảo vệ: " + request.getDefenseDate());
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Proposed defense schedule for request establishment {} by user: {}", requestId, userId);

        return mapToDefenseScheduleResponse(schedule);
    }

    /**
     * Student xem lịch bảo vệ
     */
    public DefenseScheduleResponse getDefenseSchedule(Long requestId, Long userId) throws AppException {
        // Get request to check ownership
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check ownership
        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem lịch bảo vệ của yêu cầu này");
        }

        // Get defense schedule
        DefenseSchedule schedule = defenseScheduleRepository.findByRequestEstablishmentId(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy lịch bảo vệ"));

        return mapToDefenseScheduleResponse(schedule);
    }

    /**
     * Student cập nhật lịch bảo vệ (chỉ khi chưa được confirm)
     */
    @Transactional
    public DefenseScheduleResponse updateDefenseSchedule(Long requestId, Long userId, ProposeDefenseScheduleRequest request) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check ownership
        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền cập nhật lịch bảo vệ cho yêu cầu này");
        }

        // Check status: only DEFENSE_SCHEDULE_PROPOSED or DEFENSE_SCHEDULE_REJECTED can update
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.DEFENSE_SCHEDULE_PROPOSED &&
            requestEstablishment.getStatus() != RequestEstablishmentStatus.DEFENSE_SCHEDULE_REJECTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể cập nhật lịch bảo vệ khi trạng thái là DEFENSE_SCHEDULE_PROPOSED hoặc DEFENSE_SCHEDULE_REJECTED");
        }

        // Get defense schedule
        DefenseSchedule schedule = defenseScheduleRepository.findByRequestEstablishmentId(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy lịch bảo vệ để cập nhật"));

        // Check if schedule is already confirmed
        if (schedule.getResult() == DefenseScheduleStatus.CONFIRMED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Không thể cập nhật lịch bảo vệ đã được xác nhận");
        }

        // Update schedule
        schedule.setDefenseDate(request.getDefenseDate());
        schedule.setLocation(request.getLocation());
        schedule.setMeetingLink(request.getMeetingLink());
        schedule.setNotes(request.getNotes());
        schedule.setResult(DefenseScheduleStatus.PROPOSED); // Reset to PROPOSED
        schedule = defenseScheduleRepository.save(schedule);

        // Update request status if it was rejected
        if (requestEstablishment.getStatus() == RequestEstablishmentStatus.DEFENSE_SCHEDULE_REJECTED) {
            requestEstablishment.setStatus(RequestEstablishmentStatus.DEFENSE_SCHEDULE_PROPOSED);
            requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        }

        return mapToDefenseScheduleResponse(schedule);
    }

    /**
     * Staff xem danh sách lịch bảo vệ đã đề xuất (status = DEFENSE_SCHEDULE_PROPOSED)
     * Chỉ hiển thị các defense schedules từ requests được assign cho staff đó
     */
    public Page<DefenseScheduleResponse> getProposedDefenseSchedules(Long staffId, Pageable pageable) throws AppException {
        // Get all requests with DEFENSE_SCHEDULE_PROPOSED status assigned to this staff (without pagination first)
        List<RequestEstablishmentStatus> statuses = List.of(RequestEstablishmentStatus.DEFENSE_SCHEDULE_PROPOSED);
        List<RequestEstablishment> allRequests = requestEstablishmentRepository.findByAssignedStaffAndStatusIn(
                staffId, 
                statuses, 
                org.springframework.data.domain.Pageable.unpaged()
        ).getContent();
        
        // Get request IDs
        List<Long> requestIds = allRequests.stream()
                .map(RequestEstablishment::getId)
                .toList();
        
        if (requestIds.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }
        
        // Get all defense schedules for these requests, ordered by created date desc
        List<DefenseSchedule> allSchedules = defenseScheduleRepository.findAll().stream()
                .filter(s -> requestIds.contains(s.getRequestEstablishment().getId()))
                .filter(s -> s.getResult() == DefenseScheduleStatus.PROPOSED) // Only proposed schedules
                .sorted((s1, s2) -> {
                    if (s2.getCreatedAt() == null) return -1;
                    if (s1.getCreatedAt() == null) return 1;
                    return s2.getCreatedAt().compareTo(s1.getCreatedAt());
                })
                .toList();
        
        // Convert to response
        List<DefenseScheduleResponse> scheduleResponses = allSchedules.stream()
                .map(this::mapToDefenseScheduleResponse)
                .toList();
        
        // Apply pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), scheduleResponses.size());
        List<DefenseScheduleResponse> pagedContent = start < scheduleResponses.size() 
                ? scheduleResponses.subList(start, end) 
                : List.of();
        
        return new PageImpl<>(
                pagedContent,
                pageable,
                scheduleResponses.size()
        );
    }

    /**
     * Staff xem chi tiết lịch bảo vệ
     */
    public DefenseScheduleResponse getDefenseScheduleForStaff(Long requestId, Long staffId) throws AppException {
        // Get request to check permission
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission: only assigned staff can view
        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem lịch bảo vệ này");
        }

        // Get defense schedule
        DefenseSchedule schedule = defenseScheduleRepository.findByRequestEstablishmentId(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy lịch bảo vệ"));

        return mapToDefenseScheduleResponse(schedule);
    }

    /**
     * Staff duyệt lịch bảo vệ
     * Chuyển status từ DEFENSE_SCHEDULE_PROPOSED → DEFENSE_SCHEDULE_APPROVED
     */
    @Transactional
    public RequestEstablishmentResponse approveDefenseSchedule(Long requestId, Long staffId) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission
        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền duyệt lịch bảo vệ này");
        }

        // Check status: only DEFENSE_SCHEDULE_PROPOSED can be approved
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.DEFENSE_SCHEDULE_PROPOSED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể duyệt lịch bảo vệ ở trạng thái DEFENSE_SCHEDULE_PROPOSED");
        }

        // Get defense schedule
        DefenseSchedule schedule = defenseScheduleRepository.findByRequestEstablishmentId(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy lịch bảo vệ để duyệt"));

        // Update schedule status
        schedule.setResult(DefenseScheduleStatus.CONFIRMED);
        schedule = defenseScheduleRepository.save(schedule);

        // Update request status
        requestEstablishment.setStatus(RequestEstablishmentStatus.DEFENSE_SCHEDULE_APPROVED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history
        try {
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "PROPOSE_DEFENSE_TIME", "Staff đã duyệt lịch bảo vệ: " + schedule.getDefenseDate());
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Approved defense schedule for request establishment {} by staff: {}", requestId, staffId);

        return mapToResponse(requestEstablishment);
    }

    /**
     * Staff từ chối lịch bảo vệ
     * Chuyển status từ DEFENSE_SCHEDULE_PROPOSED → DEFENSE_SCHEDULE_REJECTED
     */
    @Transactional
    public RequestEstablishmentResponse rejectDefenseSchedule(Long requestId, Long staffId, RejectDefenseScheduleRequest request) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission
        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền từ chối lịch bảo vệ này");
        }

        // Check status: only DEFENSE_SCHEDULE_PROPOSED can be rejected
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.DEFENSE_SCHEDULE_PROPOSED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể từ chối lịch bảo vệ ở trạng thái DEFENSE_SCHEDULE_PROPOSED");
        }

        // Get defense schedule
        DefenseSchedule schedule = defenseScheduleRepository.findByRequestEstablishmentId(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy lịch bảo vệ để từ chối"));

        // Update request status
        requestEstablishment.setStatus(RequestEstablishmentStatus.DEFENSE_SCHEDULE_REJECTED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history
        try {
            String comment = "Staff từ chối lịch bảo vệ: " + schedule.getDefenseDate();
            if (request.getReason() != null && !request.getReason().trim().isEmpty()) {
                comment += ". Lý do: " + request.getReason();
            }
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "PROPOSE_DEFENSE_TIME", comment);
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Rejected defense schedule for request establishment {} by staff: {}, reason: {}", 
                requestId, staffId, request.getReason());

        return mapToResponse(requestEstablishment);
    }

    /**
     * Staff nhập kết quả bảo vệ (PASSED/FAILED) + feedback
     * Nếu FAILED → REJECTED (end)
     * Nếu PASSED → DEFENSE_COMPLETED (tiếp tục)
     */
    @Transactional
    public RequestEstablishmentResponse completeDefense(Long requestId, Long staffId, CompleteDefenseRequest request) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission
        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền nhập kết quả bảo vệ này");
        }

        // Check status: only DEFENSE_SCHEDULE_APPROVED or DEFENSE_SCHEDULED can complete defense
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.DEFENSE_SCHEDULE_APPROVED &&
            requestEstablishment.getStatus() != RequestEstablishmentStatus.DEFENSE_SCHEDULED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể nhập kết quả bảo vệ khi trạng thái là DEFENSE_SCHEDULE_APPROVED hoặc DEFENSE_SCHEDULED");
        }

        // Validate result: only PASSED or FAILED
        if (request.getResult() != DefenseScheduleStatus.PASSED && request.getResult() != DefenseScheduleStatus.FAILED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Kết quả bảo vệ chỉ có thể là PASSED hoặc FAILED");
        }

        // Get defense schedule
        DefenseSchedule schedule = defenseScheduleRepository.findByRequestEstablishmentId(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy lịch bảo vệ"));

        // Update defense schedule
        schedule.setResult(request.getResult());
        schedule.setFeedback(request.getFeedback());
        schedule = defenseScheduleRepository.save(schedule);

        // Update request status based on result
        if (request.getResult() == DefenseScheduleStatus.FAILED) {
            // FAILED → REJECTED (end)
            requestEstablishment.setStatus(RequestEstablishmentStatus.REJECTED);
        } else {
            // PASSED → DEFENSE_COMPLETED (tiếp tục)
            requestEstablishment.setStatus(RequestEstablishmentStatus.DEFENSE_COMPLETED);
        }
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history
        try {
            String comment = "Staff đã nhập kết quả bảo vệ: " + request.getResult();
            if (request.getFeedback() != null && !request.getFeedback().trim().isEmpty()) {
                comment += ". Feedback: " + request.getFeedback();
            }
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "DEFENSE_COMPLETED", comment);
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Completed defense for request establishment {} by staff: {}, result: {}", 
                requestId, staffId, request.getResult());

        return mapToResponse(requestEstablishment);
    }

    /**
     * Student nộp form cuối
     * Chuyển status từ DEFENSE_COMPLETED → FINAL_FORM_SUBMITTED
     * Hỗ trợ upload file trực tiếp (Word, Excel, PDF) hoặc dùng fileUrl
     * Luôn tạo form mới (nhiều version) thay vì update form cũ
     */
    @Transactional
    public ClubCreationFinalFormResponse submitFinalForm(Long requestId, Long userId, SubmitFinalFormRequest request, MultipartFile file) throws AppException {
        // Get request
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check ownership
        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền nộp form cuối cho yêu cầu này");
        }

        // Check status: only DEFENSE_COMPLETED can submit final form
        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.DEFENSE_COMPLETED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể nộp form cuối khi trạng thái là DEFENSE_COMPLETED");
        }

        // Validate: phải có file hoặc fileUrl
        String fileUrl = request.getFileUrl();
        if ((file == null || file.isEmpty()) && (fileUrl == null || fileUrl.trim().isEmpty())) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Vui lòng upload file form cuối hoặc cung cấp fileUrl");
        }

        // Upload file nếu có
        if (file != null && !file.isEmpty()) {
            try {
                // Validate file type (Word, Excel, PDF)
                String originalFilename = file.getOriginalFilename();
                if (originalFilename != null) {
                    String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
                    if (!extension.matches("pdf|doc|docx|xls|xlsx|ppt|pptx")) {
                        throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ chấp nhận file Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx) hoặc PDF (.pdf)");
                    }
                }

                // Upload file to Cloudinary in club/final-forms folder
                CloudinaryService.UploadResult uploadResult = cloudinaryService.uploadFile(file, "club/final-forms");
                fileUrl = uploadResult.url();
                log.info("Uploaded final form file for request {}: {}", requestId, fileUrl);
            } catch (AppException e) {
                throw e; // Re-throw AppException
            } catch (Exception e) {
                log.error("Failed to upload final form file: {}", e.getMessage(), e);
                throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể upload file form cuối: " + e.getMessage());
            }
        }

        // Get submitted by user
        User submittedBy = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND, "Không tìm thấy người dùng"));

        // Create formData JSON: {"title": "...", "fileUrl": "..."}
        String formDataJson = String.format("{\"title\":\"%s\",\"fileUrl\":\"%s\"}", 
                request.getTitle().replace("\"", "\\\""), 
                fileUrl != null ? fileUrl.replace("\"", "\\\"") : "");

        // Luôn tạo final form mới (nhiều version) thay vì update form cũ
        ClubCreationFinalForm finalForm = ClubCreationFinalForm.builder()
                .formData(formDataJson)
                .status("SUBMITTED")
                .submittedAt(LocalDateTime.now())
                .submittedBy(submittedBy)
                .requestEstablishment(requestEstablishment)
                .build();
        finalForm = clubCreationFinalFormRepository.save(finalForm);
        log.info("Created new final form version {} for request {}", finalForm.getId(), requestId);

        // Update request status
        requestEstablishment.setStatus(RequestEstablishmentStatus.FINAL_FORM_SUBMITTED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history
        try {
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), userId, "FINAL_FORM", "Sinh viên đã nộp form cuối: " + request.getTitle());
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Submitted final form for request establishment {} by user: {}", requestId, userId);

        return mapToFinalFormResponse(finalForm);
    }

    private ClubCreationFinalFormResponse mapToFinalFormResponse(ClubCreationFinalForm finalForm) {
        ClubCreationFinalFormResponse.ClubCreationFinalFormResponseBuilder builder = ClubCreationFinalFormResponse.builder()
                .id(finalForm.getId())
                .formData(finalForm.getFormData())
                .status(finalForm.getStatus())
                .submittedAt(finalForm.getSubmittedAt())
                .reviewedAt(finalForm.getReviewedAt())
                .requestEstablishmentId(finalForm.getRequestEstablishment() != null ? finalForm.getRequestEstablishment().getId() : null)
                .createdAt(finalForm.getCreatedAt())
                .updatedAt(finalForm.getUpdatedAt());

        if (finalForm.getSubmittedBy() != null) {
            builder.submittedById(finalForm.getSubmittedBy().getId())
                    .submittedByFullName(finalForm.getSubmittedBy().getFullName())
                    .submittedByEmail(finalForm.getSubmittedBy().getEmail());
        }

        if (finalForm.getReviewedBy() != null) {
            builder.reviewedById(finalForm.getReviewedBy().getId())
                    .reviewedByFullName(finalForm.getReviewedBy().getFullName())
                    .reviewedByEmail(finalForm.getReviewedBy().getEmail());
        }

        return builder.build();
    }

    private DefenseScheduleResponse mapToDefenseScheduleResponse(DefenseSchedule schedule) {
        return DefenseScheduleResponse.builder()
                .id(schedule.getId())
                .defenseDate(schedule.getDefenseDate())
                .location(schedule.getLocation())
                .meetingLink(schedule.getMeetingLink())
                .panelMembers(schedule.getPanelMembers())
                .notes(schedule.getNotes())
                .result(schedule.getResult())
                .feedback(schedule.getFeedback())
                .fapBookingId(schedule.getFapBookingId())
                .isAutoBooked(schedule.getIsAutoBooked())
                .fapBookingStatus(schedule.getFapBookingStatus())
                .fapBookingLink(schedule.getFapBookingLink())
                .requestEstablishmentId(schedule.getRequestEstablishment() != null ? schedule.getRequestEstablishment().getId() : null)
                .createdAt(schedule.getCreatedAt())
                .updatedAt(schedule.getUpdatedAt())
                .build();
    }

    private ClubProposalResponse mapToProposalResponse(ClubProposal proposal) {
        return ClubProposalResponse.builder()
                .id(proposal.getId())
                .title(proposal.getTitle())
                .fileUrl(proposal.getFileUrl())
                .requestEstablishmentId(proposal.getRequestEstablishment() != null ? proposal.getRequestEstablishment().getId() : null)
                .clubId(proposal.getClub() != null ? proposal.getClub().getId() : null)
                .createdAt(proposal.getCreatedAt())
                .updatedAt(proposal.getUpdatedAt())
                .build();
    }

    private RequestEstablishmentResponse mapToResponse(RequestEstablishment request) {
        RequestEstablishmentResponse.RequestEstablishmentResponseBuilder builder = RequestEstablishmentResponse.builder()
                .id(request.getId())
                .clubName(request.getClubName())
                .clubCategory(request.getClubCategory())
                .clubCode(request.getClubCode())
                .status(request.getStatus())
                .sendDate(request.getSendDate())
                .expectedMemberCount(request.getExpectedMemberCount())
                .activityObjectives(request.getActivityObjectives())
                .expectedActivities(request.getExpectedActivities())
                .description(request.getDescription())
                .confirmationDeadline(request.getConfirmationDeadline())
                .receivedAt(request.getReceivedAt())
                .confirmedAt(request.getConfirmedAt())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt());

        if (request.getCreatedBy() != null) {
            builder.createdByUserId(request.getCreatedBy().getId())
                    .createdByFullName(request.getCreatedBy().getFullName())
                    .createdByEmail(request.getCreatedBy().getEmail())
                    .createdByStudentCode(request.getCreatedBy().getStudentCode())
                    .createdByAvatarUrl(request.getCreatedBy().getAvatarUrl());
        }

        if (request.getAssignedStaff() != null) {
            builder.assignedStaffId(request.getAssignedStaff().getId())
                    .assignedStaffFullName(request.getAssignedStaff().getFullName())
                    .assignedStaffEmail(request.getAssignedStaff().getEmail());
        }

        return builder.build();
    }


    @Transactional(readOnly = true)
    public Page<WorkflowHistoryResponse> getWorkflowHistory(Long requestId, Pageable pageable) throws AppException {
        // Check if request exists
        RequestEstablishment request = requestEstablishmentRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        Page<ClubCreationWorkFlowHistory> histories = workflowHistoryRepository.findByRequestEstablishmentId(requestId, pageable);
        return histories.map(this::mapToWorkflowHistoryResponse);
    }

    private WorkflowHistoryResponse mapToWorkflowHistoryResponse(ClubCreationWorkFlowHistory history) {
        WorkflowHistoryResponse.WorkflowHistoryResponseBuilder builder = WorkflowHistoryResponse.builder()
                .id(history.getId())
                .actionDate(history.getActionDate())
                .comments(history.getComments())
                .createdAt(history.getCreatedAt());

        if (history.getClubCreationStep() != null) {
            builder.stepId(history.getClubCreationStep().getId())
                    .stepCode(history.getClubCreationStep().getCode())
                    .stepName(history.getClubCreationStep().getName())
                    .stepDescription(history.getClubCreationStep().getDescription());
        }

        if (history.getActedBy() != null) {
            builder.actedById(history.getActedBy().getId())
                    .actedByFullName(history.getActedBy().getFullName())
                    .actedByEmail(history.getActedBy().getEmail())
                    .actedByStudentCode(history.getActedBy().getStudentCode())
                    .actedByAvatarUrl(history.getActedBy().getAvatarUrl());
        }

        return builder.build();
    }
}

