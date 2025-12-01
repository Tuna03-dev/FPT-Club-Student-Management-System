package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.AssignRequestEstablishmentRequest;
import com.sep490.backendclubmanagement.dto.request.CreateRequestEstablishmentRequest;
import com.sep490.backendclubmanagement.dto.request.CompleteDefenseRequest;
import com.sep490.backendclubmanagement.dto.request.ProposeDefenseScheduleRequest;
import com.sep490.backendclubmanagement.dto.request.RequestProposalRequest;
import com.sep490.backendclubmanagement.dto.request.RejectContactRequest;
import com.sep490.backendclubmanagement.dto.request.RejectDefenseScheduleRequest;
import com.sep490.backendclubmanagement.dto.request.RejectProposalRequest;
import com.sep490.backendclubmanagement.dto.request.RenameClubRequest;
import com.sep490.backendclubmanagement.dto.request.RequestNameRevisionRequest;
import com.sep490.backendclubmanagement.dto.request.SubmitFinalFormRequest;
import com.sep490.backendclubmanagement.dto.request.SubmitProposalRequest;
import com.sep490.backendclubmanagement.dto.request.UpdateRequestEstablishmentRequest;
import com.sep490.backendclubmanagement.dto.response.ClubCreationFinalFormResponse;
import com.sep490.backendclubmanagement.dto.response.ClubCreationStepResponse;
import com.sep490.backendclubmanagement.dto.response.ClubProposalResponse;
import com.sep490.backendclubmanagement.dto.response.DefenseScheduleResponse;
import com.sep490.backendclubmanagement.dto.response.RequestEstablishmentResponse;
import com.sep490.backendclubmanagement.dto.response.WorkflowHistoryResponse;
import com.sep490.backendclubmanagement.dto.websocket.ClubCreationWebSocketPayload;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.repository.ClubCreationFinalFormRepository;
import com.sep490.backendclubmanagement.repository.ClubCreationWorkFlowHistoryRepository;
import com.sep490.backendclubmanagement.repository.ClubCategoryRepository;
import com.sep490.backendclubmanagement.repository.ClubCreationStepRepository;
import com.sep490.backendclubmanagement.repository.ClubMemberShipRepository;
import com.sep490.backendclubmanagement.repository.ClubProposalRepository;
import com.sep490.backendclubmanagement.repository.ClubRepository;
import com.sep490.backendclubmanagement.repository.ClubRoleRepository;
import com.sep490.backendclubmanagement.repository.DefenseScheduleRepository;
import com.sep490.backendclubmanagement.repository.RequestEstablishmentRepository;
import com.sep490.backendclubmanagement.repository.RoleMemberShipRepository;
import com.sep490.backendclubmanagement.repository.SemesterRepository;
import com.sep490.backendclubmanagement.repository.SystemRoleRepository;
import com.sep490.backendclubmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

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
    private final ClubRepository clubRepository;
    private final ClubRoleRepository clubRoleRepository;
    private final SystemRoleRepository systemRoleRepository;
    private final ClubMemberShipRepository clubMemberShipRepository;
    private final RoleMemberShipRepository roleMemberShipRepository;
    private final SemesterRepository semesterRepository;
    private final ClubCategoryRepository clubCategoryRepository;
    private final ClubCreationStepRepository clubCreationStepRepository;
    private final WebSocketService webSocketService;
    private final NotificationService notificationService;

    @Transactional
    public RequestEstablishmentResponse createRequest(Long userId, CreateRequestEstablishmentRequest request) throws AppException {
        String clubName = request.getClubName() != null ? request.getClubName().trim() : null;
        String clubCategory = request.getClubCategory() != null ? request.getClubCategory().trim() : null;
        String clubCode = request.getClubCode() != null && !request.getClubCode().trim().isEmpty()
                ? request.getClubCode().trim()
                : null;

        if (clubName == null || clubName.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Tên CLB không được để trống");
        }
        if (clubCategory == null || clubCategory.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Danh mục CLB không được để trống");
        }
        if (request.getExpectedMemberCount() == null || request.getExpectedMemberCount() <= 0) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Số lượng thành viên dự kiến phải lớn hơn 0");
        }

        validateClubNameUniqueness(clubName, null);

        if (clubCode != null) {
            // Chỉ check trong bảng Club (các CLB đã được tạo), không check trong RequestEstablishment
            if (clubRepository.existsByClubCodeIgnoreCase(clubCode)) {
                throw new AppException(ErrorCode.INVALID_INPUT, "Mã CLB này đã tồn tại trong hệ thống");
            }
        }

        // Validate email and phone if provided
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            validateEmail(request.getEmail());
        }
        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            validatePhone(request.getPhone());
        }

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        RequestEstablishmentStatus status = Boolean.TRUE.equals(request.getIsDraft())
                ? RequestEstablishmentStatus.DRAFT
                : RequestEstablishmentStatus.SUBMITTED;

        RequestEstablishment requestEstablishment = RequestEstablishment.builder()
                .clubName(clubName)
                .clubCategory(clubCategory)
                .clubCode(clubCode)
                .expectedMemberCount(request.getExpectedMemberCount())
                .activityObjectives(request.getActivityObjectives())
                .expectedActivities(request.getExpectedActivities())
                .description(request.getDescription())
                .email(request.getEmail() != null ? request.getEmail().trim() : null)
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .facebookLink(request.getFacebookLink() != null ? request.getFacebookLink().trim() : null)
                .instagramLink(request.getInstagramLink() != null ? request.getInstagramLink().trim() : null)
                .tiktokLink(request.getTiktokLink() != null ? request.getTiktokLink().trim() : null)
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

        // Prepare values for validation and update
        String clubName = request.getClubName() != null ? request.getClubName().trim() : null;
        String clubCategory = request.getClubCategory() != null ? request.getClubCategory().trim() : null;
        String clubCode = request.getClubCode() != null && !request.getClubCode().trim().isEmpty()
                ? request.getClubCode().trim()
                : null;

        // Validate clubName if provided
        if (request.getClubName() != null) {
            if (clubName == null || clubName.isEmpty()) {
                throw new AppException(ErrorCode.INVALID_INPUT, "Tên CLB không được để trống");
            }
            // Validate uniqueness (exclude current request)
            validateClubNameUniqueness(clubName, requestId);
        } else {
            // If not provided, keep existing value (trim if not null)
            clubName = requestEstablishment.getClubName() != null 
                    ? requestEstablishment.getClubName().trim() 
                    : null;
        }

        // Validate clubCategory if provided
        if (request.getClubCategory() != null) {
            if (clubCategory == null || clubCategory.isEmpty()) {
                throw new AppException(ErrorCode.INVALID_INPUT, "Danh mục CLB không được để trống");
            }
        } else {
            // If not provided, keep existing value (trim if not null)
            clubCategory = requestEstablishment.getClubCategory() != null 
                    ? requestEstablishment.getClubCategory().trim() 
                    : null;
        }

        // Validate expectedMemberCount if provided
        Integer expectedMemberCount = request.getExpectedMemberCount();
        if (expectedMemberCount != null) {
            if (expectedMemberCount <= 0) {
                throw new AppException(ErrorCode.INVALID_INPUT, "Số lượng thành viên dự kiến phải lớn hơn 0");
            }
        } else {
            // If not provided, keep existing value
            expectedMemberCount = requestEstablishment.getExpectedMemberCount();
        }

        // Validate clubCode uniqueness if provided
        if (clubCode != null) {
            // Chỉ check trong bảng Club (các CLB đã được tạo), không check trong RequestEstablishment
            if (clubRepository.existsByClubCodeIgnoreCase(clubCode)) {
                throw new AppException(ErrorCode.INVALID_INPUT, "Mã CLB này đã tồn tại trong hệ thống");
            }
        }

        // Update fields
        requestEstablishment.setClubName(clubName);
        requestEstablishment.setClubCategory(clubCategory);
        if (clubCode != null) {
            requestEstablishment.setClubCode(clubCode);
        } else if (request.getClubCode() != null && request.getClubCode().trim().isEmpty()) {
            // If empty string is provided, set to null
            requestEstablishment.setClubCode(null);
        }
        requestEstablishment.setExpectedMemberCount(expectedMemberCount);
        
        if (request.getActivityObjectives() != null) {
            requestEstablishment.setActivityObjectives(request.getActivityObjectives());
        }
        if (request.getExpectedActivities() != null) {
            requestEstablishment.setExpectedActivities(request.getExpectedActivities());
        }
        if (request.getDescription() != null) {
            requestEstablishment.setDescription(request.getDescription());
        }
        
        // Validate and update email if provided
        if (request.getEmail() != null) {
            if (request.getEmail().trim().isEmpty()) {
                // Allow setting email to null/empty
                requestEstablishment.setEmail(null);
            } else {
                validateEmail(request.getEmail());
                requestEstablishment.setEmail(request.getEmail().trim());
            }
        }
        
        // Validate and update phone if provided
        if (request.getPhone() != null) {
            if (request.getPhone().trim().isEmpty()) {
                // Allow setting phone to null/empty
                requestEstablishment.setPhone(null);
            } else {
                validatePhone(request.getPhone());
                requestEstablishment.setPhone(request.getPhone().trim());
            }
        }
        if (request.getFacebookLink() != null) {
            requestEstablishment.setFacebookLink(request.getFacebookLink().trim());
        }
        if (request.getInstagramLink() != null) {
            requestEstablishment.setInstagramLink(request.getInstagramLink().trim());
        }
        if (request.getTiktokLink() != null) {
            requestEstablishment.setTiktokLink(request.getTiktokLink().trim());
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

        // 🔔 WebSocket: Broadcast to STAFF role
        try {
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .creatorId(requestEstablishment.getCreatedBy().getId())
                    .creatorName(requestEstablishment.getCreatedBy().getFullName())
                    .creatorEmail(requestEstablishment.getCreatedBy().getEmail())
                    .message("Yêu cầu thành lập CLB mới đã được gửi")
                    .build();

            webSocketService.broadcastToSystemRole("STAFF", "CLUB_CREATION", "REQUEST_SUBMITTED", payload);
            log.info("Sent WebSocket notification to STAFF for request submission: {}", requestEstablishment.getId());
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for request submission: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho tất cả STAFF
        try {
            List<User> staffUsers = userRepository.findBySystemRole_RoleNameIgnoreCase("STAFF");
            if (!staffUsers.isEmpty()) {
                String title = "Yêu cầu thành lập CLB mới";
                String message = String.format("Sinh viên %s đã gửi yêu cầu thành lập CLB: %s",
                        requestEstablishment.getCreatedBy().getFullName(),
                        requestEstablishment.getClubName());
                // FE route: /staff/club-creation (danh sách yêu cầu cho staff)
                String actionUrl = "/staff/club-creation";

                List<Long> staffIds = staffUsers.stream().map(User::getId).toList();
                notificationService.sendToUsers(
                        staffIds,
                        userId,
                        title,
                        message,
                        NotificationType.CLUB_CREATION_REQUEST_SUBMITTED,
                        NotificationPriority.HIGH,
                        actionUrl,
                        null, // relatedClubId
                        null, // relatedNewsId
                        null, // relatedTeamId
                        requestEstablishment.getId() // relatedRequestId
                );
                log.info("Sent notification to {} staff members for request submission: {}", staffIds.size(), requestEstablishment.getId());
            }
        } catch (Exception e) {
            log.error("Failed to send notification for request submission: {}", e.getMessage(), e);
        }

        return mapToResponse(requestEstablishment);
    }

    //  STAFF

    public Page<RequestEstablishmentResponse> getPendingRequests(Pageable pageable) throws AppException {
        // Trả về tất cả các status đang xử lý (không phải APPROVED, REJECTED, CONTACT_REJECTED)
        List<RequestEstablishmentStatus> pendingStatuses = List.of(
                RequestEstablishmentStatus.SUBMITTED,
                RequestEstablishmentStatus.CONTACT_CONFIRMATION_PENDING,
                RequestEstablishmentStatus.CONTACT_CONFIRMED,
                RequestEstablishmentStatus.NAME_REVISION_REQUIRED,
                RequestEstablishmentStatus.PROPOSAL_REQUIRED,
                RequestEstablishmentStatus.PROPOSAL_SUBMITTED,
                RequestEstablishmentStatus.PROPOSAL_REJECTED,
                RequestEstablishmentStatus.PROPOSAL_APPROVED,
                RequestEstablishmentStatus.DEFENSE_SCHEDULE_PROPOSED,
                RequestEstablishmentStatus.DEFENSE_SCHEDULE_APPROVED,
                RequestEstablishmentStatus.DEFENSE_SCHEDULE_REJECTED,
                RequestEstablishmentStatus.DEFENSE_SCHEDULED,
                RequestEstablishmentStatus.DEFENSE_COMPLETED,
                RequestEstablishmentStatus.FEEDBACK_PROVIDED,
                RequestEstablishmentStatus.FINAL_FORM_SUBMITTED,
                RequestEstablishmentStatus.FINAL_FORM_REVIEWED,
                RequestEstablishmentStatus.APPROVED,
                RequestEstablishmentStatus.REJECTED,
                RequestEstablishmentStatus.CONTACT_REJECTED
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
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND, "Không tìm thấy Nhân viên phòng IC-PDP được gán"));

        requestEstablishment.setAssignedStaff(assignedStaff);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);

        log.info("Assigned request establishment {} to staff: {} by staff: {}", requestId, assignedStaffId, staffId);

        return mapToResponse(requestEstablishment);
    }

    @Transactional
    public RequestEstablishmentResponse receiveRequest(Long requestId, Long staffId) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.SUBMITTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể nhận yêu cầu ở trạng thái SUBMITTED");
        }

        // Nếu chưa được gán, tự động gán cho Nhân viên phòng IC-PDP đang nhận
        if (requestEstablishment.getAssignedStaff() == null) {
            User staff = userRepository.findById(staffId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND, "Không tìm thấy Nhân viên phòng IC-PDP"));
            requestEstablishment.setAssignedStaff(staff);
        } else if (!requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            // Nếu đã được gán cho Nhân viên phòng IC-PDP khác, không cho phép nhận
            throw new AppException(ErrorCode.FORBIDDEN, "Yêu cầu này đã được gán cho Nhân viên phòng IC-PDP khác");
        }

        LocalDateTime now = LocalDateTime.now();
        requestEstablishment.setReceivedAt(now);
        requestEstablishment.setConfirmationDeadline(now.plusDays(5));
        requestEstablishment.setStatus(RequestEstablishmentStatus.CONTACT_CONFIRMATION_PENDING);

        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        try {
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "REQUEST_REVIEW", "Nhân viên phòng IC-PDP đã nhận yêu cầu và bắt đầu xem xét");
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        // 🔔 WebSocket: Gửi cho student (creator)
        try {
            User staff = requestEstablishment.getAssignedStaff();
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .assignedStaffId(staff != null ? staff.getId() : null)
                    .assignedStaffName(staff != null ? staff.getFullName() : null)
                    .assignedStaffEmail(staff != null ? staff.getEmail() : null)
                    .deadline(requestEstablishment.getConfirmationDeadline())
                    .message("Nhân viên phòng IC-PDP đã nhận yêu cầu của bạn. Hạn xác nhận: " + requestEstablishment.getConfirmationDeadline())
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "REQUEST_ASSIGNED",
                    payload
            );
            log.info("Sent WebSocket notification to student for request assignment: {}", requestEstablishment.getId());
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for request assignment: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho student
        try {
            String title = "Yêu cầu của bạn đã được nhận";
            String message = String.format("Nhân viên phòng IC-PDP %s đã nhận yêu cầu thành lập CLB \"%s\". Hạn xác nhận: %s",
                    requestEstablishment.getAssignedStaff() != null ? requestEstablishment.getAssignedStaff().getFullName() : "Nhân viên phòng IC-PDP",
                    requestEstablishment.getClubName(),
                    requestEstablishment.getConfirmationDeadline() != null ? requestEstablishment.getConfirmationDeadline().toString() : "N/A");
            // FE route: /create-club (trang theo dõi yêu cầu của student)
            String actionUrl = "/create-club";

            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    message,
                    NotificationType.CLUB_CREATION_REQUEST_ASSIGNED,
                    NotificationPriority.NORMAL,
                    actionUrl,
                    null, // relatedClubId
                    null, // relatedNewsId
                    null, // relatedTeamId
                    requestEstablishment.getId(), // relatedRequestId
                    null  // relatedEventId
            );
            log.info("Sent notification to student for request assignment: {}", requestEstablishment.getId());
        } catch (Exception e) {
            log.error("Failed to send notification for request assignment: {}", e.getMessage(), e);
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
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "REQUEST_REVIEW", "Nhân viên phòng IC-PDP đã xác nhận liên hệ với sinh viên");
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        // 🔔 WebSocket: Gửi cho student
        try {
            User staff = requestEstablishment.getAssignedStaff();
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .assignedStaffId(staff != null ? staff.getId() : null)
                    .assignedStaffName(staff != null ? staff.getFullName() : null)
                    .message("Nhân viên phòng IC-PDP đã xác nhận liên hệ với bạn")
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "CONTACT_CONFIRMED",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for contact confirmation: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho student
        try {
            String title = "Liên hệ đã được xác nhận";
            String message = String.format("Nhân viên phòng IC-PDP đã xác nhận liên hệ cho yêu cầu thành lập CLB \"%s\"", requestEstablishment.getClubName());
            // FE route: /create-club (trang theo dõi yêu cầu của student)
            String actionUrl = "/create-club";

            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    message,
                    NotificationType.CLUB_CREATION_CONTACT_CONFIRMED,
                    NotificationPriority.NORMAL,
                    actionUrl,
                    null, null, null, requestEstablishment.getId(), null
            );
        } catch (Exception e) {
            log.error("Failed to send notification for contact confirmation: {}", e.getMessage(), e);
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
            String comment = "Nhân viên phòng IC-PDP từ chối xác nhận liên hệ. Lý do: " + (request.getReason() != null ? request.getReason() : "Không có lý do");
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "REQUEST_REVIEW", comment);
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Rejected contact for request establishment {} by staff: {}, reason: {}", 
                requestId, staffId, request.getReason());

        // 🔔 WebSocket: Gửi cho student
        try {
            User staff = requestEstablishment.getAssignedStaff();
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .assignedStaffId(staff != null ? staff.getId() : null)
                    .assignedStaffName(staff != null ? staff.getFullName() : null)
                    .reason(request.getReason())
                    .message("Yêu cầu của bạn đã bị từ chối. Lý do: " + (request.getReason() != null ? request.getReason() : "Không có lý do"))
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "CONTACT_REJECTED",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for contact rejection: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho student (HIGH priority)
        try {
            String title = "Yêu cầu thành lập CLB bị từ chối";
            String message = String.format("Yêu cầu thành lập CLB \"%s\" đã bị từ chối. Lý do: %s",
                    requestEstablishment.getClubName(),
                    request.getReason() != null ? request.getReason() : "Không có lý do");
            // FE route: /create-club (trang theo dõi yêu cầu của student)
            String actionUrl = "/create-club";

            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    message,
                    NotificationType.CLUB_CREATION_CONTACT_REJECTED,
                    NotificationPriority.HIGH,
                    actionUrl,
                    null, null, null, requestEstablishment.getId(), null
            );
        } catch (Exception e) {
            log.error("Failed to send notification for contact rejection: {}", e.getMessage(), e);
        }

        return mapToResponse(requestEstablishment);
    }

    @Transactional
    public RequestEstablishmentResponse requestProposal(Long requestId, Long staffId, RequestProposalRequest request) throws AppException {
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
            String comment = (request != null && request.getComment() != null && !request.getComment().trim().isEmpty())
                    ? request.getComment().trim()
                    : "Nhân viên phòng IC-PDP đã yêu cầu sinh viên nộp đề án chi tiết";
            // Tạo history với step code PROPOSAL_REQUIRED để đánh dấu Nhân viên phòng IC-PDP đã yêu cầu nộp đề án
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "PROPOSAL_REQUIRED", comment);
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        // 🔔 WebSocket: Gửi cho student
        try {
            User staff = requestEstablishment.getAssignedStaff();
            String commentText = (request != null && request.getComment() != null && !request.getComment().trim().isEmpty())
                    ? request.getComment().trim()
                    : "Nhân viên phòng IC-PDP đã yêu cầu bạn nộp đề án chi tiết";
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .assignedStaffId(staff != null ? staff.getId() : null)
                    .assignedStaffName(staff != null ? staff.getFullName() : null)
                    .comment(commentText)
                    .message(commentText)
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "PROPOSAL_REQUIRED",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for proposal request: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho student
        try {
            String commentText = (request != null && request.getComment() != null && !request.getComment().trim().isEmpty())
                    ? request.getComment().trim()
                    : "Nhân viên phòng IC-PDP đã yêu cầu bạn nộp đề án chi tiết";
            String title = "Yêu cầu nộp đề án";
            String message = String.format("Nhân viên phòng IC-PDP yêu cầu bạn nộp đề án chi tiết cho yêu cầu thành lập CLB \"%s\". %s",
                    requestEstablishment.getClubName(), commentText);
            // FE route: /create-club (student vào tab tạo CLB, xem/nộp đề án từ dialog)
            String actionUrl = "/create-club";

            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    message,
                    NotificationType.CLUB_CREATION_PROPOSAL_REQUIRED,
                    NotificationPriority.NORMAL,
                    actionUrl,
                    null, null, null, requestEstablishment.getId(), null
            );
        } catch (Exception e) {
            log.error("Failed to send notification for proposal request: {}", e.getMessage(), e);
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

        // Check status: allow submit when Nhân viên phòng IC-PDP already requested proposal, student is resubmitting after rejection,
        // or student wants to update proposal while waiting for approval
        RequestEstablishmentStatus previousStatus = requestEstablishment.getStatus();
        if (previousStatus != RequestEstablishmentStatus.PROPOSAL_REQUIRED &&
            previousStatus != RequestEstablishmentStatus.PROPOSAL_REJECTED &&
            previousStatus != RequestEstablishmentStatus.PROPOSAL_SUBMITTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể nộp đề án khi trạng thái là PROPOSAL_REQUIRED, PROPOSAL_REJECTED hoặc PROPOSAL_SUBMITTED (chờ Nhân viên phòng IC-PDP duyệt)");
        }

        // Validate: phải có file hoặc fileUrl
        String fileUrl = request.getFileUrl();
        if ((file == null || file.isEmpty()) && (fileUrl == null || fileUrl.trim().isEmpty())) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Vui lòng upload file đề án hoặc cung cấp fileUrl");
        }

        // Upload file nếu có
        if (file != null && !file.isEmpty()) {
            try {
                // Validate file size (max 20MB)
                long maxFileSize = 20 * 1024 * 1024; // 20MB in bytes
                if (file.getSize() > maxFileSize) {
                    throw new AppException(ErrorCode.INVALID_INPUT, 
                        String.format("Dung lượng file quá lớn. Kích thước tối đa cho phép là 20MB. File của bạn: %.2f MB", 
                            file.getSize() / (1024.0 * 1024.0)));
                }

                // Validate file type (Word, Excel, PDF, ZIP)
                String originalFilename = file.getOriginalFilename();
                if (originalFilename != null) {
                    String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
                    if (!extension.matches("pdf|doc|docx|xls|xlsx|ppt|pptx|zip")) {
                        throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ chấp nhận file Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), PDF (.pdf) hoặc ZIP (.zip)");
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
            String comments = request.getComment();
            if (comments == null || comments.trim().isEmpty()) {
                // Phân biệt nộp mới vs nộp lại để hiển thị rõ hơn trên workflow
                if (previousStatus == RequestEstablishmentStatus.PROPOSAL_REJECTED) {
                    comments = "Sinh viên đã nộp lại đề án chi tiết";
                } else if (previousStatus == RequestEstablishmentStatus.PROPOSAL_SUBMITTED) {
                    comments = "Sinh viên đã cập nhật đề án chi tiết";
                } else {
                    comments = "Sinh viên đã nộp đề án chi tiết";
                }
            }
            workflowHistoryService.createWorkflowHistory(
                    requestEstablishment.getId(),
                    userId,
                    "PROPOSAL_SUBMITTED",
                    comments
            );
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Submitted proposal for request establishment {} by user: {}", requestId, userId);

        // 🔔 WebSocket: Gửi cho assigned staff
        try {
            User staff = requestEstablishment.getAssignedStaff();
            if (staff != null) {
                ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                        .requestId(requestEstablishment.getId())
                        .clubName(requestEstablishment.getClubName())
                        .status(requestEstablishment.getStatus())
                        .proposalId(proposal.getId())
                        .proposalTitle(proposal.getTitle())
                        .creatorId(requestEstablishment.getCreatedBy().getId())
                        .creatorName(requestEstablishment.getCreatedBy().getFullName())
                        .message("Sinh viên đã nộp đề án: " + proposal.getTitle())
                        .build();

                webSocketService.sendToUser(
                        staff.getEmail(),
                        "CLUB_CREATION",
                        "PROPOSAL_SUBMITTED",
                        payload
                );
            }
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for proposal submission: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho assigned staff
        try {
            User staff = requestEstablishment.getAssignedStaff();
            if (staff != null) {
                String title = "Đề án mới đã được nộp";
                String message = String.format("Sinh viên %s đã nộp đề án \"%s\" cho yêu cầu thành lập CLB \"%s\"",
                        requestEstablishment.getCreatedBy().getFullName(),
                        proposal.getTitle(),
                        requestEstablishment.getClubName());
                // FE route: /staff/club-creation (staff xem danh sách và chi tiết đề án trong trang này)
                String actionUrl = "/staff/club-creation";

                notificationService.sendToUser(
                        staff.getId(),
                        userId,
                        title,
                        message,
                        NotificationType.CLUB_CREATION_PROPOSAL_SUBMITTED,
                        NotificationPriority.NORMAL,
                        actionUrl,
                        null, null, null, requestEstablishment.getId(), null
                );
            }
        } catch (Exception e) {
            log.error("Failed to send notification for proposal submission: {}", e.getMessage(), e);
        }

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
     * Nhân viên phòng IC-PDP xem danh sách đề án đã nộp (status = PROPOSAL_SUBMITTED)
     * Chỉ hiển thị các proposals từ requests được assign cho Nhân viên phòng IC-PDP đó
     */
    public Page<ClubProposalResponse> getSubmittedProposals(Long staffId, Pageable pageable) throws AppException {
        // Get all requests with PROPOSAL_SUBMITTED status assigned to this Nhân viên phòng IC-PDP (without pagination first)
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
     * Nhân viên phòng IC-PDP xem danh sách đề án của một request
     */
    public List<ClubProposalResponse> getProposalsForStaff(Long requestId, Long staffId) throws AppException {
        // Get request to check permission
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission: only assigned Nhân viên phòng IC-PDP can view
        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem đề án của yêu cầu này");
        }

        // Get all proposals for this request
        List<ClubProposal> proposals = clubProposalRepository.findAllByRequestEstablishmentIdOrderByCreatedAtDesc(requestId);

        return proposals.stream()
                .map(this::mapToProposalResponse)
                .toList();
    }

    /**
     * Nhân viên phòng IC-PDP xem chi tiết đề án
     */
    public ClubProposalResponse getProposalDetailForStaff(Long requestId, Long proposalId, Long staffId) throws AppException {
        // Get request to check permission
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission: only assigned Nhân viên phòng IC-PDP can view
        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem đề án này");
        }

        // Get proposal
        ClubProposal proposal = clubProposalRepository.findByIdAndRequestEstablishmentId(proposalId, requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy đề án"));

        return mapToProposalResponse(proposal);
    }

    /**
     * Nhân viên phòng IC-PDP duyệt đề án
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
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "PROPOSAL_REVIEW", "Nhân viên phòng IC-PDP đã duyệt đề án: " + proposal.getTitle());
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Approved proposal for request establishment {} by staff: {}", requestId, staffId);

        // 🔔 WebSocket: Gửi cho student
        try {
            User staff = requestEstablishment.getAssignedStaff();
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .proposalId(proposal.getId())
                    .proposalTitle(proposal.getTitle())
                    .assignedStaffId(staff != null ? staff.getId() : null)
                    .assignedStaffName(staff != null ? staff.getFullName() : null)
                    .message("Đề án của bạn đã được duyệt: " + proposal.getTitle())
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "PROPOSAL_APPROVED",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for proposal approval: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho student
        try {
            String title = "Đề án của bạn đã được duyệt";
            String message = String.format("Đề án \"%s\" cho yêu cầu thành lập CLB \"%s\" đã được Nhân viên phòng IC-PDP duyệt",
                    proposal.getTitle(),
                    requestEstablishment.getClubName());
            // FE route: /create-club (trang theo dõi yêu cầu của student)
            String actionUrl = "/create-club";

            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    message,
                    NotificationType.CLUB_CREATION_PROPOSAL_APPROVED,
                    NotificationPriority.NORMAL,
                    actionUrl,
                    null, null, null, requestEstablishment.getId(), null
            );
        } catch (Exception e) {
            log.error("Failed to send notification for proposal approval: {}", e.getMessage(), e);
        }

        return mapToResponse(requestEstablishment);
    }

    /**
     * Nhân viên phòng IC-PDP từ chối đề án
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
            String comment = "Nhân viên phòng IC-PDP từ chối đề án: " + proposal.getTitle();
            if (request.getReason() != null && !request.getReason().trim().isEmpty()) {
                comment += ". Lý do: " + request.getReason();
            }
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "PROPOSAL_REVIEW", comment);
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Rejected proposal for request establishment {} by staff: {}, reason: {}", 
                requestId, staffId, request.getReason());

        // 🔔 WebSocket: Gửi cho student
        try {
            User staff = requestEstablishment.getAssignedStaff();
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .proposalId(proposal.getId())
                    .proposalTitle(proposal.getTitle())
                    .assignedStaffId(staff != null ? staff.getId() : null)
                    .assignedStaffName(staff != null ? staff.getFullName() : null)
                    .reason(request.getReason())
                    .message("Đề án của bạn đã bị từ chối. Lý do: " + (request.getReason() != null ? request.getReason() : "Không có lý do"))
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "PROPOSAL_REJECTED",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for proposal rejection: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho student (HIGH priority)
        try {
            String title = "Đề án của bạn đã bị từ chối";
            String message = String.format("Đề án \"%s\" cho yêu cầu thành lập CLB \"%s\" đã bị từ chối. Lý do: %s",
                    proposal.getTitle(),
                    requestEstablishment.getClubName(),
                    request.getReason() != null ? request.getReason() : "Không có lý do");
            // FE route: /create-club (student mở trang tạo CLB để nộp lại / xem lý do từ chối đề án)
            String actionUrl = "/create-club";

            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    message,
                    NotificationType.CLUB_CREATION_PROPOSAL_REJECTED,
                    NotificationPriority.HIGH,
                    actionUrl,
                    null, null, null, requestEstablishment.getId(), null
            );
        } catch (Exception e) {
            log.error("Failed to send notification for proposal rejection: {}", e.getMessage(), e);
        }

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

        if (request.getDefenseEndDate() == null || !request.getDefenseEndDate().isAfter(request.getDefenseDate())) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Thời gian kết thúc bảo vệ phải sau thời gian bắt đầu");
        }

        // Check if defense schedule already exists
        DefenseSchedule existingSchedule = defenseScheduleRepository.findByRequestEstablishmentId(requestId).orElse(null);
        
        DefenseSchedule schedule;
        if (existingSchedule != null) {
            // Update existing schedule
            existingSchedule.setDefenseDate(request.getDefenseDate());
            existingSchedule.setDefenseEndDate(request.getDefenseEndDate());
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
                    .defenseEndDate(request.getDefenseEndDate())
                    .location(request.getLocation())
                    .meetingLink(request.getMeetingLink())
                    .notes(request.getNotes())
                    .result(null)
                    .requestEstablishment(requestEstablishment)
                    .build();
            schedule = defenseScheduleRepository.save(schedule);
        }

        // Update request status
        requestEstablishment.setStatus(RequestEstablishmentStatus.DEFENSE_SCHEDULE_PROPOSED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history
        try {
            String comments = request.getNotes();
            if (comments == null || comments.trim().isEmpty()) {
                comments = "Sinh viên đã đề xuất lịch bảo vệ: " + request.getDefenseDate();
            }
            workflowHistoryService.createWorkflowHistory(
                    requestEstablishment.getId(),
                    userId,
                    "PROPOSE_DEFENSE_TIME",
                    comments
            );
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Proposed defense schedule for request establishment {} by user: {}", requestId, userId);

        // 🔔 WebSocket: Gửi cho assigned staff
        try {
            User staff = requestEstablishment.getAssignedStaff();
            if (staff != null) {
                ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                        .requestId(requestEstablishment.getId())
                        .clubName(requestEstablishment.getClubName())
                        .status(requestEstablishment.getStatus())
                        .defenseScheduleId(schedule.getId())
                        .defenseDate(schedule.getDefenseDate())
                        .defenseEndDate(schedule.getDefenseEndDate())
                        .location(schedule.getLocation())
                        .meetingLink(schedule.getMeetingLink())
                        .creatorId(requestEstablishment.getCreatedBy().getId())
                        .creatorName(requestEstablishment.getCreatedBy().getFullName())
                        .message("Sinh viên đã đề xuất lịch bảo vệ: " + schedule.getDefenseDate())
                        .build();

                webSocketService.sendToUser(
                        staff.getEmail(),
                        "CLUB_CREATION",
                        "DEFENSE_SCHEDULE_PROPOSED",
                        payload
                );
            }
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for defense schedule proposal: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho assigned staff
        try {
            User staff = requestEstablishment.getAssignedStaff();
            if (staff != null) {
                String title = "Lịch bảo vệ mới đã được đề xuất";
                String message = String.format("Sinh viên %s đã đề xuất lịch bảo vệ cho yêu cầu thành lập CLB \"%s\". Thời gian: %s",
                        requestEstablishment.getCreatedBy().getFullName(),
                        requestEstablishment.getClubName(),
                        schedule.getDefenseDate());
                // FE route: /staff/club-creation (staff xem và duyệt lịch bảo vệ trong trang này)
                String actionUrl = "/staff/club-creation";

                notificationService.sendToUser(
                        staff.getId(),
                        userId,
                        title,
                        message,
                        NotificationType.CLUB_CREATION_DEFENSE_SCHEDULE_PROPOSED,
                        NotificationPriority.NORMAL,
                        actionUrl,
                        null, null, null, requestEstablishment.getId(), null
                );
            }
        } catch (Exception e) {
            log.error("Failed to send notification for defense schedule proposal: {}", e.getMessage(), e);
        }

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

        if (request.getDefenseEndDate() == null || !request.getDefenseEndDate().isAfter(request.getDefenseDate())) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Thời gian kết thúc bảo vệ phải sau thời gian bắt đầu");
        }

        // Update schedule
        schedule.setDefenseDate(request.getDefenseDate());
        schedule.setDefenseEndDate(request.getDefenseEndDate());
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
     * Nhân viên phòng IC-PDP xem danh sách lịch bảo vệ đã đề xuất (status = DEFENSE_SCHEDULE_PROPOSED)
     * Chỉ hiển thị các defense schedules từ requests được assign cho Nhân viên phòng IC-PDP đó
     */
    public Page<DefenseScheduleResponse> getProposedDefenseSchedules(Long staffId, Pageable pageable) throws AppException {
        // Get all requests with DEFENSE_SCHEDULE_PROPOSED status assigned to this Nhân viên phòng IC-PDP (without pagination first)
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
     * Nhân viên phòng IC-PDP xem chi tiết lịch bảo vệ
     */
    public DefenseScheduleResponse getDefenseScheduleForStaff(Long requestId, Long staffId) throws AppException {
        // Get request to check permission
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        // Check permission: only assigned Nhân viên phòng IC-PDP can view
        if (requestEstablishment.getAssignedStaff() == null || !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem lịch bảo vệ này");
        }

        // Get defense schedule
        DefenseSchedule schedule = defenseScheduleRepository.findByRequestEstablishmentId(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy lịch bảo vệ"));

        return mapToDefenseScheduleResponse(schedule);
    }

    /**
     * Nhân viên phòng IC-PDP duyệt lịch bảo vệ
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
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "DEFENSE_SCHEDULE_CONFIRMED", "Nhân viên phòng IC-PDP đã duyệt lịch bảo vệ: " + schedule.getDefenseDate());
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Approved defense schedule for request establishment {} by staff: {}", requestId, staffId);

        // 🔔 WebSocket: Gửi cho student (HIGH priority)
        try {
            User staff = requestEstablishment.getAssignedStaff();
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .defenseScheduleId(schedule.getId())
                    .defenseDate(schedule.getDefenseDate())
                    .defenseEndDate(schedule.getDefenseEndDate())
                    .location(schedule.getLocation())
                    .meetingLink(schedule.getMeetingLink())
                    .assignedStaffId(staff != null ? staff.getId() : null)
                    .assignedStaffName(staff != null ? staff.getFullName() : null)
                    .message("Lịch bảo vệ của bạn đã được duyệt: " + schedule.getDefenseDate())
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "DEFENSE_SCHEDULE_APPROVED",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for defense schedule approval: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho student (HIGH priority)
        try {
            String title = "Lịch bảo vệ của bạn đã được duyệt";
            String message = String.format("Lịch bảo vệ cho yêu cầu thành lập CLB \"%s\" đã được duyệt. Thời gian: %s, Địa điểm: %s",
                    requestEstablishment.getClubName(),
                    schedule.getDefenseDate(),
                    schedule.getLocation() != null ? schedule.getLocation() : "Chưa có");
            // FE route: /create-club (student xem lịch bảo vệ trong trang tạo CLB)
            String actionUrl = "/create-club";

            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    message,
                    NotificationType.CLUB_CREATION_DEFENSE_SCHEDULE_APPROVED,
                    NotificationPriority.HIGH,
                    actionUrl,
                    null, null, null, requestEstablishment.getId(), null
            );
        } catch (Exception e) {
            log.error("Failed to send notification for defense schedule approval: {}", e.getMessage(), e);
        }

        return mapToResponse(requestEstablishment);
    }

    /**
     * Nhân viên phòng IC-PDP từ chối lịch bảo vệ
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
            String comment = "Nhân viên phòng IC-PDP từ chối lịch bảo vệ: " + schedule.getDefenseDate();
            if (request.getReason() != null && !request.getReason().trim().isEmpty()) {
                comment += ". Lý do: " + request.getReason();
            }
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "PROPOSE_DEFENSE_TIME", comment);
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Rejected defense schedule for request establishment {} by staff: {}, reason: {}", 
                requestId, staffId, request.getReason());

        // 🔔 WebSocket: Gửi cho student
        try {
            User staff = requestEstablishment.getAssignedStaff();
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .defenseScheduleId(schedule.getId())
                    .defenseDate(schedule.getDefenseDate())
                    .assignedStaffId(staff != null ? staff.getId() : null)
                    .assignedStaffName(staff != null ? staff.getFullName() : null)
                    .reason(request.getReason())
                    .message("Lịch bảo vệ của bạn đã bị từ chối. Lý do: " + (request.getReason() != null ? request.getReason() : "Không có lý do"))
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "DEFENSE_SCHEDULE_REJECTED",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for defense schedule rejection: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho student
        try {
            String title = "Lịch bảo vệ của bạn đã bị từ chối";
            String message = String.format("Lịch bảo vệ cho yêu cầu thành lập CLB \"%s\" đã bị từ chối. Lý do: %s",
                    requestEstablishment.getClubName(),
                    request.getReason() != null ? request.getReason() : "Không có lý do");
            // FE route: /create-club (student xem / cập nhật lịch bảo vệ trong trang tạo CLB)
            String actionUrl = "/create-club";

            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    message,
                    NotificationType.CLUB_CREATION_DEFENSE_SCHEDULE_REJECTED,
                    NotificationPriority.NORMAL,
                    actionUrl,
                    null, null, null, requestEstablishment.getId(), null
            );
        } catch (Exception e) {
            log.error("Failed to send notification for defense schedule rejection: {}", e.getMessage(), e);
        }

        return mapToResponse(requestEstablishment);
    }

    /**
     * Nhân viên phòng IC-PDP nhập kết quả bảo vệ (PASSED/FAILED) + feedback
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

        // Check if defense date has passed
        LocalDateTime now = LocalDateTime.now();
        if (schedule.getDefenseDate().isAfter(now)) {
            throw new AppException(ErrorCode.INVALID_INPUT, 
                    "Chưa đến thời gian bảo vệ. Chỉ có thể nhập kết quả sau khi thời gian bảo vệ đã qua. " +
                    "Thời gian bảo vệ: " + schedule.getDefenseDate());
        }

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
            String comment = "Nhân viên phòng IC-PDP đã nhập kết quả bảo vệ: " + request.getResult();
            if (request.getFeedback() != null && !request.getFeedback().trim().isEmpty()) {
                comment += ". Feedback: " + request.getFeedback();
            }
            workflowHistoryService.createWorkflowHistory(requestEstablishment.getId(), staffId, "DEFENSE_COMPLETED", comment);
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Completed defense for request establishment {} by staff: {}, result: {}", 
                requestId, staffId, request.getResult());

        // 🔔 WebSocket: Gửi cho student (HIGH priority)
        try {
            User staff = requestEstablishment.getAssignedStaff();
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .defenseScheduleId(schedule.getId())
                    .defenseDate(schedule.getDefenseDate())
                    .defenseResult(request.getResult() != null ? request.getResult().name() : null)
                    .feedback(request.getFeedback())
                    .assignedStaffId(staff != null ? staff.getId() : null)
                    .assignedStaffName(staff != null ? staff.getFullName() : null)
                    .message("Kết quả bảo vệ: " + request.getResult() + (request.getFeedback() != null ? ". " + request.getFeedback() : ""))
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "DEFENSE_COMPLETED",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for defense completion: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho student (HIGH priority)
        try {
            String title = request.getResult() == DefenseScheduleStatus.PASSED 
                    ? "Bảo vệ thành công!" 
                    : "Bảo vệ không đạt";
            String message = String.format("Kết quả bảo vệ cho yêu cầu thành lập CLB \"%s\": %s",
                    requestEstablishment.getClubName(),
                    request.getResult() == DefenseScheduleStatus.PASSED ? "ĐẠT" : "KHÔNG ĐẠT");
            if (request.getFeedback() != null && !request.getFeedback().trim().isEmpty()) {
                message += ". Feedback: " + request.getFeedback();
            }
            // FE route: /create-club (student xem yêu cầu sau khi nhập kết quả bảo vệ)
            String actionUrl = "/create-club";

            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    message,
                    NotificationType.CLUB_CREATION_DEFENSE_COMPLETED,
                    NotificationPriority.HIGH,
                    actionUrl,
                    null, null, null, requestEstablishment.getId(), null
            );
        } catch (Exception e) {
            log.error("Failed to send notification for defense completion: {}", e.getMessage(), e);
        }

        return mapToResponse(requestEstablishment);
    }

    /**
     * Student nộp Hồ sơ hoàn thiện
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
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền nộp Hồ sơ hoàn thiện cho yêu cầu này");
        }

        RequestEstablishmentStatus previousStatus = requestEstablishment.getStatus();
        // Check status: DEFENSE_COMPLETED (first submission) or FINAL_FORM_SUBMITTED (update before approval)
        if (previousStatus != RequestEstablishmentStatus.DEFENSE_COMPLETED &&
            previousStatus != RequestEstablishmentStatus.FINAL_FORM_SUBMITTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể nộp Hồ sơ hoàn thiện khi trạng thái là DEFENSE_COMPLETED hoặc FINAL_FORM_SUBMITTED");
        }

        // Validate: phải có file hoặc fileUrl
        String fileUrl = request.getFileUrl();
        if ((file == null || file.isEmpty()) && (fileUrl == null || fileUrl.trim().isEmpty())) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Vui lòng upload file Hồ sơ hoàn thiện hoặc cung cấp fileUrl");
        }

        // Upload file nếu có
        if (file != null && !file.isEmpty()) {
            try {
                // Validate file size (max 20MB)
                long maxFileSize = 20 * 1024 * 1024; // 20MB in bytes
                if (file.getSize() > maxFileSize) {
                    throw new AppException(ErrorCode.INVALID_INPUT, 
                        String.format("Dung lượng file quá lớn. Kích thước tối đa cho phép là 20MB. File của bạn: %.2f MB", 
                            file.getSize() / (1024.0 * 1024.0)));
                }

                // Validate file type (Word, Excel, PDF, ZIP)
                String originalFilename = file.getOriginalFilename();
                if (originalFilename != null) {
                    String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
                    if (!extension.matches("pdf|doc|docx|xls|xlsx|ppt|pptx|zip")) {
                        throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ chấp nhận file Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), PDF (.pdf) hoặc ZIP (.zip)");
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
                throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể upload file Hồ sơ hoàn thiện: " + e.getMessage());
            }
        }

        // Get submitted by user
        User submittedBy = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND, "Không tìm thấy người dùng"));

        // Create formData JSON: {"title": "...", "fileUrl": "..."}
        String formDataJson = String.format("{\"title\":\"%s\",\"fileUrl\":\"%s\"}",
                request.getTitle().replace("\"", "\\\""),
                fileUrl != null ? fileUrl.replace("\"", "\\\"") : "");

        ClubCreationFinalForm finalForm = clubCreationFinalFormRepository.findByRequestEstablishmentId(requestId).orElse(null);
        if (finalForm == null) {
            finalForm = ClubCreationFinalForm.builder()
                    .requestEstablishment(requestEstablishment)
                    .build();
        }
        finalForm.setFormData(formDataJson);
        finalForm.setStatus("SUBMITTED");
        finalForm.setSubmittedAt(LocalDateTime.now());
        finalForm.setSubmittedBy(submittedBy);
        finalForm.setReviewedAt(null);
        finalForm.setReviewedBy(null);
        finalForm = clubCreationFinalFormRepository.save(finalForm);
        log.info("{} final form for request {}", previousStatus == RequestEstablishmentStatus.FINAL_FORM_SUBMITTED ? "Updated" : "Created new", requestId);

        // Update request status
        requestEstablishment.setStatus(RequestEstablishmentStatus.FINAL_FORM_SUBMITTED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history
        try {
            String comments = request.getComment();
            if (comments == null || comments.trim().isEmpty()) {
                if (previousStatus == RequestEstablishmentStatus.FINAL_FORM_SUBMITTED) {
                    comments = "Sinh viên đã cập nhật Hồ sơ hoàn thiện: " + request.getTitle();
                } else {
                    comments = "Sinh viên đã nộp Hồ sơ hoàn thiện: " + request.getTitle();
                }
            }
            workflowHistoryService.createWorkflowHistory(
                    requestEstablishment.getId(),
                    userId,
                    "FINAL_FORM",
                    comments
            );
        } catch (Exception e) {
            log.error("Failed to create workflow history, but continuing: {}", e.getMessage());
        }

        log.info("Submitted final form for request establishment {} by user: {}", requestId, userId);

        // 🔔 WebSocket: Gửi cho assigned staff
        try {
            User staff = requestEstablishment.getAssignedStaff();
            if (staff != null) {
                ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                        .requestId(requestEstablishment.getId())
                        .clubName(requestEstablishment.getClubName())
                        .status(requestEstablishment.getStatus())
                        .finalFormId(finalForm.getId())
                        .finalFormTitle(request.getTitle())
                        .creatorId(requestEstablishment.getCreatedBy().getId())
                        .creatorName(requestEstablishment.getCreatedBy().getFullName())
                        .message("Sinh viên đã nộp Hồ sơ hoàn thiện: " + request.getTitle())
                        .build();

                webSocketService.sendToUser(
                        staff.getEmail(),
                        "CLUB_CREATION",
                        "FINAL_FORM_SUBMITTED",
                        payload
                );
            }
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for final form submission: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho assigned staff
        try {
            User staff = requestEstablishment.getAssignedStaff();
            if (staff != null) {
                String title = "Hồ sơ hoàn thiện đã được nộp";
                String message = String.format("Sinh viên %s đã nộp Hồ sơ hoàn thiện \"%s\" cho yêu cầu thành lập CLB \"%s\"",
                        requestEstablishment.getCreatedBy().getFullName(),
                        request.getTitle(),
                        requestEstablishment.getClubName());
                // FE route: /staff/club-creation (staff xem lịch sử Hồ sơ hoàn thiện trong trang này)
                String actionUrl = "/staff/club-creation";

                notificationService.sendToUser(
                        staff.getId(),
                        userId,
                        title,
                        message,
                        NotificationType.CLUB_CREATION_FINAL_FORM_SUBMITTED,
                        NotificationPriority.NORMAL,
                        actionUrl,
                        null, null, null, requestEstablishment.getId(), null
                );
            }
        } catch (Exception e) {
            log.error("Failed to send notification for final form submission: {}", e.getMessage(), e);
        }

        return mapToFinalFormResponse(finalForm);
    }

    /**
     * Student xem danh sách Hồ sơ hoàn thiện (tất cả version) của yêu cầu
     */
    public List<ClubCreationFinalFormResponse> getFinalFormsForStudent(Long requestId, Long userId) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem Hồ sơ hoàn thiện của yêu cầu này");
        }

        List<ClubCreationFinalForm> finalForms = clubCreationFinalFormRepository
                .findAllByRequestEstablishmentIdOrderByCreatedAtDesc(requestId);

        return finalForms.stream()
                .map(this::mapToFinalFormResponse)
                .toList();
    }

    /**
     * Nhân viên phòng IC-PDP xem danh sách Hồ sơ hoàn thiện (tất cả version) của yêu cầu được giao
     */
    public List<ClubCreationFinalFormResponse> getFinalFormsForStaff(Long requestId, Long staffId) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (requestEstablishment.getAssignedStaff() == null ||
                !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem Hồ sơ hoàn thiện của yêu cầu này");
        }

        List<ClubCreationFinalForm> finalForms = clubCreationFinalFormRepository
                .findAllByRequestEstablishmentIdOrderByCreatedAtDesc(requestId);

        return finalForms.stream()
                .map(this::mapToFinalFormResponse)
                .toList();
    }

    /**
     * Nhân viên phòng IC-PDP duyệt Hồ sơ hoàn thiện và tự động tạo CLB + vai trò mặc định
     */
    @Transactional
    public RequestEstablishmentResponse approveFinalForm(Long requestId, Long staffId) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (requestEstablishment.getAssignedStaff() == null ||
                !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền duyệt Hồ sơ hoàn thiện của yêu cầu này");
        }

        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.FINAL_FORM_SUBMITTED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Yêu cầu chưa ở trạng thái nộp Hồ sơ hoàn thiện");
        }

        ClubCreationFinalForm latestFinalForm = clubCreationFinalFormRepository
                .findFirstByRequestEstablishmentIdOrderByCreatedAtDesc(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy Hồ sơ hoàn thiện để duyệt"));

        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND, "Không tìm thấy thông tin Nhân viên phòng IC-PDP"));

        latestFinalForm.setStatus("APPROVED");
        latestFinalForm.setReviewedAt(LocalDateTime.now());
        latestFinalForm.setReviewedBy(staff);
        clubCreationFinalFormRepository.save(latestFinalForm);

        Club club = createClubFromRequest(requestEstablishment);
        List<ClubRole> defaultRoles = createDefaultClubRoles(club);

        ClubRole presidentRole = defaultRoles.stream()
                .filter(role -> "CLUB_PRESIDENT".equalsIgnoreCase(role.getRoleCode()))
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Không tạo được vai trò Chủ nhiệm"));

        ClubMemberShip founderMembership = createFounderMembership(club, requestEstablishment.getCreatedBy());
        assignRoleToMembership(founderMembership, presidentRole);

        requestEstablishment.setStatus(RequestEstablishmentStatus.APPROVED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        
        requestEstablishmentRepository.flush();

        // Create workflow history: FINAL_FORM_APPROVED
        try {
            workflowHistoryService.createWorkflowHistory(
                    requestEstablishment.getId(),
                    staffId,
                    "FINAL_FORM_APPROVED",
                    "Nhân viên phòng IC-PDP đã duyệt Hồ sơ hoàn thiện"
            );
        } catch (Exception e) {
            log.error("Failed to create workflow history for FINAL_FORM_APPROVED, but continuing: {}", e.getMessage());
        }

        // Create workflow history: CLUB_CREATED
        try {
            workflowHistoryService.createWorkflowHistory(
                    requestEstablishment.getId(),
                    staffId,
                    "CLUB_CREATED",
                    "Nhân viên phòng IC-PDP đã thành lập CLB"
            );
        } catch (Exception e) {
            log.error("Failed to create workflow history for CLUB_CREATED, but continuing: {}", e.getMessage());
        }

        log.info("Approved final form and created club {} for request {}", club.getId(), requestId);

        // 🔔 WebSocket: Gửi cho student (creator) - HIGH priority
        try {
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .clubCode(club.getClubCode())
                    .status(requestEstablishment.getStatus())
                    .clubId(club.getId())
                    .finalFormId(latestFinalForm.getId())
                    .finalFormTitle(latestFinalForm.getFormData() != null ? latestFinalForm.getFormData() : "Hồ sơ hoàn thiện")
                    .assignedStaffId(staff != null ? staff.getId() : null)
                    .assignedStaffName(staff != null ? staff.getFullName() : null)
                    .message("Chúc mừng! CLB \"" + requestEstablishment.getClubName() + "\" đã được thành lập thành công!")
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "CLUB_CREATED",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for club creation: {}", e.getMessage(), e);
        }

        // 🔔 Notification: Gửi cho student (creator) - HIGH priority
        try {
            String title = "🎉 Chúc mừng! CLB của bạn đã được thành lập";
            String message = String.format("CLB \"%s\" đã được thành lập thành công! Bạn đã trở thành Chủ nhiệm CLB.",
                    requestEstablishment.getClubName());
            String actionUrl = "/myclub/" + club.getId();

            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    message,
                    NotificationType.CLUB_CREATION_CLUB_CREATED,
                    NotificationPriority.HIGH,
                    actionUrl,
                    club.getId(), // relatedClubId - CLB mới được tạo
                    null, // relatedNewsId
                    null, // relatedTeamId
                    requestEstablishment.getId(), // relatedRequestId
                    null  // relatedEventId
            );
        } catch (Exception e) {
            log.error("Failed to send notification for club creation: {}", e.getMessage(), e);
        }

        return mapToResponse(requestEstablishment);
    }

    private Club createClubFromRequest(RequestEstablishment requestEstablishment) throws AppException {
        if (requestEstablishment.getClubCode() != null &&
                clubRepository.findByClubCode(requestEstablishment.getClubCode()).isPresent()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Mã CLB đã tồn tại, vui lòng cập nhật mã khác");
        }

        Club club = Club.builder()
                .clubName(requestEstablishment.getClubName())
                .clubCode(requestEstablishment.getClubCode())
                .description(requestEstablishment.getDescription())
                .email(requestEstablishment.getEmail())
                .phone(requestEstablishment.getPhone())
                .fbUrl(requestEstablishment.getFacebookLink())
                .igUrl(requestEstablishment.getInstagramLink())
                .ttUrl(requestEstablishment.getTiktokLink())
                .status("ACTIVE")
                .build();

        Optional<ClubCategory> categoryOpt = Optional.ofNullable(requestEstablishment.getClubCategory())
                .flatMap(name -> clubCategoryRepository.findByCategoryNameIgnoreCase(name));
        categoryOpt.ifPresent(club::setClubCategory);

        return clubRepository.save(club);
    }

    private List<ClubRole> createDefaultClubRoles(Club club) {
        List<ClubRole> roles = new ArrayList<>();
        for (DefaultRoleDefinition def : DEFAULT_ROLE_DEFINITIONS) {
            SystemRole systemRole = null;
            if (def.systemRoleName != null) {
                systemRole = systemRoleRepository.findByRoleName(def.systemRoleName)
                        .orElse(null);
            }
            ClubRole role = ClubRole.builder()
                    .club(club)
                    .roleCode(def.roleCode)
                    .roleName(def.roleName)
                    .description(def.description)
                    .roleLevel(def.roleLevel)
                    .systemRole(systemRole)
                    .build();
            roles.add(role);
        }
        return clubRoleRepository.saveAll(roles);
    }

    private ClubMemberShip createFounderMembership(Club club, User founder) {
        ClubMemberShip membership = ClubMemberShip.builder()
                .club(club)
                .user(founder)
                .joinDate(LocalDate.now())
                .status(ClubMemberShipStatus.ACTIVE)
                .build();
        return clubMemberShipRepository.save(membership);
    }

    private void assignRoleToMembership(ClubMemberShip membership, ClubRole role) throws AppException {
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Không tìm thấy học kỳ hiện tại"));

        RoleMemberShip roleMemberShip = RoleMemberShip.builder()
                .clubMemberShip(membership)
                .clubRole(role)
                .semester(currentSemester)
                .isActive(true)
                .build();
        roleMemberShipRepository.save(roleMemberShip);
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
                .defenseEndDate(schedule.getDefenseEndDate())
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
                .email(request.getEmail())
                .phone(request.getPhone())
                .facebookLink(request.getFacebookLink())
                .instagramLink(request.getInstagramLink())
                .tiktokLink(request.getTiktokLink())
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

    @Transactional
    public RequestEstablishmentResponse requestNameRevision(Long requestId, Long staffId, RequestNameRevisionRequest request) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (requestEstablishment.getAssignedStaff() == null ||
                !requestEstablishment.getAssignedStaff().getId().equals(staffId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền yêu cầu chỉnh sửa tên cho yêu cầu này");
        }

        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.CONTACT_CONFIRMED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Chỉ có thể yêu cầu chỉnh sửa tên sau khi đã xác nhận liên hệ");
        }

        requestEstablishment.setStatus(RequestEstablishmentStatus.NAME_REVISION_REQUIRED);
        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        requestEstablishmentRepository.flush();

        String comment = (request != null && request.getComment() != null && !request.getComment().trim().isEmpty())
                ? request.getComment().trim()
                : "Nhân viên phòng IC-PDP yêu cầu bạn cập nhật lại tên CLB để rõ ràng hơn";

        try {
            workflowHistoryService.createWorkflowHistory(
                    requestEstablishment.getId(),
                    staffId,
                    "REQUEST_REVIEW",
                    comment
            );
        } catch (Exception e) {
            log.error("Failed to create workflow history for name revision request: {}", e.getMessage(), e);
        }

        try {
            ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                    .requestId(requestEstablishment.getId())
                    .clubName(requestEstablishment.getClubName())
                    .status(requestEstablishment.getStatus())
                    .assignedStaffId(requestEstablishment.getAssignedStaff() != null
                            ? requestEstablishment.getAssignedStaff().getId()
                            : null)
                    .assignedStaffName(requestEstablishment.getAssignedStaff() != null
                            ? requestEstablishment.getAssignedStaff().getFullName()
                            : null)
                    .comment(comment)
                    .message(comment)
                    .build();

            webSocketService.sendToUser(
                    requestEstablishment.getCreatedBy().getEmail(),
                    "CLUB_CREATION",
                    "NAME_REVISION_REQUIRED",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for name revision request: {}", e.getMessage(), e);
        }

        try {
            String title = "Yêu cầu cập nhật tên CLB";
            // FE route: /create-club (student xem lại yêu cầu sau khi staff yêu cầu đổi tên)
            String actionUrl = "/create-club";
            notificationService.sendToUser(
                    requestEstablishment.getCreatedBy().getId(),
                    staffId,
                    title,
                    comment,
                    NotificationType.CLUB_CREATION_NAME_REVISION_REQUESTED,
                    NotificationPriority.NORMAL,
                    actionUrl,
                    null, null, null,
                    requestEstablishment.getId(),
                    null
            );
        } catch (Exception e) {
            log.error("Failed to send notification for name revision request: {}", e.getMessage(), e);
        }

        return mapToResponse(requestEstablishment);
    }

    @Transactional
    public RequestEstablishmentResponse submitNameRevision(Long requestId, Long userId, RenameClubRequest request) throws AppException {
        RequestEstablishment requestEstablishment = requestEstablishmentRepository.findDetailById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu thành lập CLB"));

        if (!requestEstablishment.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền cập nhật tên CLB cho yêu cầu này");
        }

        if (requestEstablishment.getStatus() != RequestEstablishmentStatus.NAME_REVISION_REQUIRED) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Yêu cầu này không cần cập nhật tên");
        }

        String newClubName = request.getNewClubName().trim();
        validateClubNameUniqueness(newClubName, requestEstablishment.getId());

        requestEstablishment.setClubName(newClubName);
        requestEstablishment.setStatus(RequestEstablishmentStatus.CONTACT_CONFIRMED);

        requestEstablishment = requestEstablishmentRepository.save(requestEstablishment);
        requestEstablishmentRepository.flush();

        try {
            workflowHistoryService.createWorkflowHistory(
                    requestEstablishment.getId(),
                    userId,
                    "REQUEST_REVIEW",
                    "Sinh viên đã cập nhật tên CLB thành: " + newClubName
            );
        } catch (Exception e) {
            log.error("Failed to create workflow history for name revision submission: {}", e.getMessage(), e);
        }

        try {
            User staff = requestEstablishment.getAssignedStaff();
            if (staff != null) {
                ClubCreationWebSocketPayload payload = ClubCreationWebSocketPayload.builder()
                        .requestId(requestEstablishment.getId())
                        .clubName(requestEstablishment.getClubName())
                        .status(requestEstablishment.getStatus())
                        .assignedStaffId(staff.getId())
                        .assignedStaffName(staff.getFullName())
                        .creatorId(requestEstablishment.getCreatedBy().getId())
                        .creatorName(requestEstablishment.getCreatedBy().getFullName())
                        .message("Sinh viên đã cập nhật lại tên CLB: " + newClubName)
                        .build();

                webSocketService.sendToUser(
                        staff.getEmail(),
                        "CLUB_CREATION",
                        "NAME_REVISION_SUBMITTED",
                        payload
                );
            }
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification for name revision submission: {}", e.getMessage(), e);
        }

        try {
            User staff = requestEstablishment.getAssignedStaff();
            if (staff != null) {
                String title = "Sinh viên đã cập nhật tên CLB";
                String message = String.format("Yêu cầu #%d đã được cập nhật tên thành \"%s\"",
                        requestEstablishment.getId(), newClubName);
                // FE route: /staff/club-creation (staff xem yêu cầu sau khi student cập nhật tên)
                String actionUrl = "/staff/club-creation";
                notificationService.sendToUser(
                        staff.getId(),
                        userId,
                        title,
                        message,
                        NotificationType.CLUB_CREATION_NAME_UPDATED,
                        NotificationPriority.NORMAL,
                        actionUrl,
                        null, null, null,
                        requestEstablishment.getId(),
                        null
                );
            }
        } catch (Exception e) {
            log.error("Failed to send notification for name revision submission: {}", e.getMessage(), e);
        }

        return mapToResponse(requestEstablishment);
    }

    private void validateClubNameUniqueness(String clubName, Long currentRequestId) throws AppException {
        // Chỉ check trong bảng Club (các CLB đã được tạo), không check trong RequestEstablishment
        if (clubRepository.existsByClubNameIgnoreCase(clubName)) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Tên CLB này đã tồn tại trong hệ thống");
        }
    }

    private void validateEmail(String email) throws AppException {
        if (email == null || email.trim().isEmpty()) {
            return; // Email is optional, so null or empty is allowed
        }
        
        // Email regex pattern
        String emailPattern = "^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})$";
        if (!Pattern.matches(emailPattern, email.trim())) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Email không hợp lệ");
        }
    }

    private void validatePhone(String phone) throws AppException {
        if (phone == null || phone.trim().isEmpty()) {
            return; // Phone is optional, so null or empty is allowed
        }
        
        // Vietnamese phone number pattern:
        // - 10 digits starting with 0 (e.g., 0987654321)
        // - 11 digits starting with 84 (e.g., 84987654321)
        // - 12 characters starting with +84 (e.g., +84987654321)
        String trimmedPhone = phone.trim().replaceAll("[\\s-]", ""); // Remove spaces and dashes
        
        // Pattern: starts with 0 (10 digits) or 84/+84 (11-12 digits)
        String phonePattern = "^(0[0-9]{9}|84[0-9]{9}|\\+84[0-9]{9})$";
        
        if (!Pattern.matches(phonePattern, trimmedPhone)) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (bắt đầu bằng 0, 84 hoặc +84)");
        }
    }

    private static final List<DefaultRoleDefinition> DEFAULT_ROLE_DEFINITIONS = List.of(
            new DefaultRoleDefinition(
                    "CLUB_PRESIDENT",
                    "Chủ nhiệm",
                    "Người đứng đầu câu lạc bộ, quản lý toàn bộ hoạt động.",
                    1,
                    "CLUB_OFFICER"
            ),
            new DefaultRoleDefinition(
                    "CLUB_VICE_PRESIDENT",
                    "Phó Chủ nhiệm",
                    "Phó Chủ nhiệm - trợ giúp Chủ nhiệm.",
                    2,
                    "CLUB_OFFICER"
            ),
            new DefaultRoleDefinition(
                    "CLUB_TEAM_HEAD",
                    "Trưởng ban",
                    "Trưởng ban - phụ trách 1 ban chuyên môn.",
                    3,
                    "TEAM_OFFICER"
            ),
            new DefaultRoleDefinition(
                    "CLUB_TEAM_DEPUTY",
                    "Phó ban",
                    "Phó ban - trợ giúp Trưởng ban.",
                    4,
                    "TEAM_OFFICER"
            ),
            new DefaultRoleDefinition(
                    "CLUB_TREASURER",
                    "Thủ quỹ",
                    "Người quản lý tài chính cho CLB.",
                    5,
                    "CLUB_TREASURE"
            ),
            new DefaultRoleDefinition(
                    "CLUB_MEMBER",
                    "Thành viên",
                    "Thành viên chung của CLB.",
                    6,
                    "MEMBER"
            )
    );

    private static class DefaultRoleDefinition {
        private final String roleCode;
        private final String roleName;
        private final String description;
        private final int roleLevel;
        private final String systemRoleName;

        private DefaultRoleDefinition(String roleCode, String roleName, String description, int roleLevel, String systemRoleName) {
            this.roleCode = roleCode;
            this.roleName = roleName;
            this.description = description;
            this.roleLevel = roleLevel;
            this.systemRoleName = systemRoleName;
        }
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

    /**
     * Lấy danh sách tất cả các bước trong quy trình tạo CLB (sắp xếp theo orderIndex)
     */
    @Transactional(readOnly = true)
    public List<ClubCreationStepResponse> getAllSteps() {
        List<ClubCreationStep> steps = clubCreationStepRepository.findByActiveTrueOrderByOrderIndexAsc();
        return steps.stream()
                .map(this::mapToStepResponse)
                .toList();
    }

    private ClubCreationStepResponse mapToStepResponse(ClubCreationStep step) {
        return ClubCreationStepResponse.builder()
                .id(step.getId())
                .code(step.getCode())
                .name(step.getName())
                .description(step.getDescription())
                .orderIndex(step.getOrderIndex())
                .active(step.getActive())
                .build();
    }
}

