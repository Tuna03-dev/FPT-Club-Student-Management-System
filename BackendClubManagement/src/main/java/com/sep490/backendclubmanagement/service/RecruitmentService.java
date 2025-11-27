package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.*;
import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.mapper.RecruitmentApplicationMapper;
import com.sep490.backendclubmanagement.mapper.RecruitmentMapper;
import com.sep490.backendclubmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecruitmentService implements RecruitmentServiceInterface {

    private final RecruitmentRepository recruitmentRepository;
    private final RecruitmentApplicationRepository applicationRepository;
    private final RecruitmentFormQuestionRepository questionRepository;
    private final RecruitmentFormAnswerRepository answerRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final TeamOptionRepository teamOptionRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final RecruitmentMapper recruitmentMapper;
    private final RecruitmentApplicationMapper recruitmentApplicationMapper;
    private final CloudinaryService cloudinaryService;
    private final ClubMemberShipRepository clubMemberShipRepository;
    private final RoleMemberShipRepository roleMembershipRepository;
    private final SemesterRepository semesterRepository;
    private final ClubRoleRepository clubRoleRepository;
    private final ClubRepository clubRepository;
    private final NotificationService notificationService;

    /**
     * Get list of Club Officer user IDs in current semester for a specific club
     * @param clubId Club ID
     * @return List of user IDs who are Club Officers
     */
    private List<Long> getClubOfficersInCurrentSemester(Long clubId) {
        Semester currentSemester = semesterRepository.findByIsCurrentTrue()
                .orElse(null);

        if (currentSemester == null) {
            return Collections.emptyList();
        }

        return roleMembershipRepository.findClubOfficerUserIdsByClubIdAndSemesterId(
                clubId, currentSemester.getId());
    }

    @Override
    public PagedResponse<RecruitmentData> listRecruitments(Long userId,Long clubId, RecruitmentStatus status,String keyword, Pageable pageable) throws AppException {
        checkClubOfficerPermission(userId, clubId);
        return listRecruitments(clubId, status, keyword, pageable);
    }

    @Override
    public PagedResponse<RecruitmentData> listRecruitmentsForGuest(Long clubId, RecruitmentStatus status, Pageable pageable) {
        return listRecruitments(clubId, status, null, pageable);
    }
    
    public PagedResponse<RecruitmentData> listRecruitments(Long clubId, RecruitmentStatus status, String keyword, Pageable pageable){
        Page<Recruitment> page;

        // If keyword is provided, use client-side filtering with Vietnamese normalization
        if (keyword != null && !keyword.trim().isEmpty()) {
            String trimmedKeyword = keyword.trim();
            // Get all recruitments without keyword filter
            page = (status == null)
                    ? recruitmentRepository.findByClub_Id(clubId, PageRequest.of(0, Integer.MAX_VALUE))
                    : recruitmentRepository.findByClub_IdAndStatus(clubId, status, PageRequest.of(0, Integer.MAX_VALUE));

            // Filter using Vietnamese normalization
            List<Recruitment> filteredList = page.getContent().stream()
                    .filter(recruitment -> {
                        String title = normalizeVietnamese(recruitment.getTitle() != null ? recruitment.getTitle() : "");
                        String desc = normalizeVietnamese(recruitment.getDescription() != null ? recruitment.getDescription() : "");

                        // Split keyword into individual words for better matching
                        String[] keywords = trimmedKeyword.split("\\s+");
                        for (String kw : keywords) {
                            String normalizedKw = normalizeVietnamese(kw);
                            if (title.contains(normalizedKw) || desc.contains(normalizedKw)) {
                                return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());

            // Apply pagination manually
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), filteredList.size());
            List<Recruitment> paginatedList = start >= filteredList.size() ?
                    Collections.emptyList() : filteredList.subList(start, end);
            page = new PageImpl<>(paginatedList, pageable, filteredList.size());
        } else {
            // Otherwise use normal query
            page = (status == null)
                    ? recruitmentRepository.findByClub_Id(clubId, pageable)
                    : recruitmentRepository.findByClub_IdAndStatus(clubId, status, pageable);
        }
        
        Page<RecruitmentData> dataPage = page.map(recruitmentMapper::toDto);
        return PagedResponse.of(dataPage);
    }

    @Override
    public RecruitmentData getRecruitment(Long id) throws AppException {
        Recruitment r = recruitmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Load questions with options to include in the response
        List<RecruitmentFormQuestion> questions = questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(r.getId());
        
        // Load options for each question
        for (RecruitmentFormQuestion question : questions) {
            List<QuestionOption> options = questionOptionRepository.findByQuestion_IdOrderByOptionOrderAsc(question.getId());
            question.setOptions(new HashSet<>(options));
        }
        
        r.setFormQuestions(new HashSet<>(questions));
        
        // Load team options
        List<TeamOption> teamOptions = teamOptionRepository.findByRecruitment_Id(r.getId());
        r.setTeamOptions(new HashSet<>(teamOptions));
        
        return recruitmentMapper.toDto(r);
    }

    @Override
    @Transactional
    public RecruitmentData createRecruitment(Long userId, Long clubId, RecruitmentCreateRequest req) throws AppException {
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        checkClubOfficerPermission(userId, clubId);

        // Validate club exists and is active
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));

        if (!"ACTIVE".equalsIgnoreCase(club.getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        Recruitment r = recruitmentMapper.toEntity(req, clubId);
        r = recruitmentRepository.save(r);
        
        // If new recruitment has status OPEN, close all other OPEN recruitments of the club
        if (r.getStatus() == RecruitmentStatus.OPEN) {
            closeOtherOpenRecruitments(clubId, r.getId());
        }
        
        upsertQuestions(r, req.questions);
        upsertTeamOptions(r, req.teamOptionIds);
        
        List<RecruitmentFormQuestion> questions = questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(r.getId());
        // Load options for each question
        for (RecruitmentFormQuestion question : questions) {
            List<QuestionOption> options = questionOptionRepository.findByQuestion_IdOrderByOptionOrderAsc(question.getId());
            question.setOptions(new HashSet<>(options));
        }
        r.setFormQuestions(new HashSet<>(questions));
        
        // Load team options
        List<TeamOption> teamOptions = teamOptionRepository.findByRecruitment_Id(r.getId());
        r.setTeamOptions(new HashSet<>(teamOptions));
        
        // Send notification to Club Officers if recruitment status is OPEN
        if (r.getStatus() == RecruitmentStatus.OPEN) {
            try {
                // Get Club Officers in current semester
                List<Long> officerIds = getClubOfficersInCurrentSemester(clubId);
                List<Long> recipientIds = officerIds.stream()
                        .filter(memberId -> !memberId.equals(userId)) // Don't notify the creator
                        .collect(Collectors.toList());

                if (!recipientIds.isEmpty()) {
                    String actionUrl = "/recruitments/" + r.getId();
                    String title = "Đợt tuyển thành viên mới đã mở";
                    String message = "CLB " + club.getClubName() + " đã mở đợt tuyển thành viên: \"" + r.getTitle() + "\"";

                    notificationService.sendToUsers(
                            recipientIds,
                            userId,
                            title,
                            message,
                            NotificationType.RECRUITMENT_OPENED,
                            NotificationPriority.NORMAL,
                            actionUrl,
                            clubId,
                            null,
                            null,
                            null
                    );
                }
            } catch (Exception e) {
                // Log error but don't fail the operation
                System.err.println("Failed to send recruitment notification: " + e.getMessage());
            }
        }

        return recruitmentMapper.toDto(r);
    }

    @Override
    @Transactional
    public RecruitmentData updateRecruitment(Long userId, Long id, RecruitmentUpdateRequest req) throws AppException {
        Recruitment r = recruitmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        checkClubOfficerPermission(userId, r.getClub().getId());
        
        // Check if club is active
        if (!"ACTIVE".equalsIgnoreCase(r.getClub().getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        // Check if recruitment is closed
        if (r.getStatus() == RecruitmentStatus.CLOSED) {
            throw new AppException(ErrorCode.RECRUITMENT_CLOSED);
        }
        
        // Check if recruitment end date has passed
        if (r.getEndDate() != null && LocalDateTime.now().isAfter(r.getEndDate())) {
            throw new AppException(ErrorCode.RECRUITMENT_ENDED);
        }

        recruitmentMapper.updateEntity(r, req);
        
        // If recruitment is updated to OPEN, close all other OPEN recruitments of the club
        if (r.getStatus() == RecruitmentStatus.OPEN) {
            closeOtherOpenRecruitments(r.getClub().getId(), r.getId());
        }
        
        recruitmentRepository.save(r);
        upsertQuestions(r, req.questions);
        upsertTeamOptions(r, req.teamOptionIds);
        
        List<RecruitmentFormQuestion> questions = questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(r.getId());
        // Load options for each question
        for (RecruitmentFormQuestion question : questions) {
            List<QuestionOption> options = questionOptionRepository.findByQuestion_IdOrderByOptionOrderAsc(question.getId());
            question.setOptions(new HashSet<>(options));
        }
        r.setFormQuestions(new HashSet<>(questions));
        
        // Load team options
        List<TeamOption> teamOptions = teamOptionRepository.findByRecruitment_Id(r.getId());
        r.setTeamOptions(new HashSet<>(teamOptions));
        
        return recruitmentMapper.toDto(r);
    }

    @Override
    @Transactional
    public void changeRecruitmentStatus(Long userId, Long id, RecruitmentStatus status) throws AppException {
        Recruitment r = recruitmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        checkClubOfficerPermission(userId, r.getClub().getId());
        
        // Check if club is active
        if (!"ACTIVE".equalsIgnoreCase(r.getClub().getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        // Store old status to check if status changed to OPEN
        RecruitmentStatus oldStatus = r.getStatus();

        // If new status is OPEN, close all other OPEN recruitments of the club
        if (status == RecruitmentStatus.OPEN) {
            closeOtherOpenRecruitments(r.getClub().getId(), r.getId());
        }
        
        r.setStatus(status);
        recruitmentRepository.save(r);

        // Send notification to Club Officers if status changed to OPEN
        if (status == RecruitmentStatus.OPEN && oldStatus != RecruitmentStatus.OPEN) {
            try {
                Club club = r.getClub();
                Long clubId = club.getId();

                // Get Club Officers in current semester
                List<Long> officerIds = getClubOfficersInCurrentSemester(clubId);
                List<Long> recipientIds = officerIds.stream()
                        .filter(memberId -> !memberId.equals(userId)) // Don't notify the creator
                        .collect(Collectors.toList());

                if (!recipientIds.isEmpty()) {
                    String actionUrl = "/recruitments/" + r.getId();
                    String title = "Đợt tuyển thành viên mới đã mở";
                    String message = "CLB " + club.getClubName() + " đã mở đợt tuyển thành viên: \"" + r.getTitle() + "\"";

                    notificationService.sendToUsers(
                            recipientIds,
                            userId,
                            title,
                            message,
                            NotificationType.RECRUITMENT_OPENED,
                            NotificationPriority.NORMAL,
                            actionUrl,
                            clubId,
                            null,
                            null,
                            null
                    );
                }
            } catch (Exception e) {
                // Log error but don't fail the operation
                System.err.println("Failed to send recruitment status change notification: " + e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void deleteRecruitment(Long userId, Long id) throws AppException {
        Recruitment r = recruitmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        checkClubOfficerPermission(userId, r.getClub().getId());
        
        // Check if club is active
        if (!"ACTIVE".equalsIgnoreCase(r.getClub().getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        recruitmentRepository.deleteById(id);
    }

    
    public PagedResponse<RecruitmentApplicationData> listApplications(Long userId, Long recruitmentId, RecruitmentApplicationStatus status, String keyword, Pageable pageable) throws AppException {
        // Get recruitment to determine clubId
        Recruitment recruitment = recruitmentRepository.findById(recruitmentId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        checkClubOfficerPermission(userId, recruitment.getClub().getId());
        
        Page<RecruitmentApplication> page;

        // If keyword is provided, use client-side filtering with Vietnamese normalization
        if (keyword != null && !keyword.trim().isEmpty()) {
            String trimmedKeyword = keyword.trim();
            // Get all applications without keyword filter
            page = (status == null)
                    ? applicationRepository.findByRecruitment_Id(recruitmentId, PageRequest.of(0, Integer.MAX_VALUE))
                    : applicationRepository.findByRecruitment_IdAndStatus(recruitmentId, status, PageRequest.of(0, Integer.MAX_VALUE));

            // Filter using Vietnamese normalization
            List<RecruitmentApplication> filteredList = page.getContent().stream()
                    .filter(app -> {
                        String fullName = normalizeVietnamese(app.getApplicant().getFullName() != null ? app.getApplicant().getFullName() : "");
                        String email = normalizeVietnamese(app.getApplicant().getEmail() != null ? app.getApplicant().getEmail() : "");
                        String studentCode = normalizeVietnamese(app.getApplicant().getStudentCode() != null ? app.getApplicant().getStudentCode() : "");

                        // Split keyword into individual words for better matching
                        String[] keywords = trimmedKeyword.split("\\s+");
                        for (String kw : keywords) {
                            String normalizedKw = normalizeVietnamese(kw);
                            if (fullName.contains(normalizedKw) || email.contains(normalizedKw) || studentCode.contains(normalizedKw)) {
                                return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());

            // Apply pagination manually
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), filteredList.size());
            List<RecruitmentApplication> paginatedList = start >= filteredList.size() ?
                    Collections.emptyList() : filteredList.subList(start, end);
            page = new PageImpl<>(paginatedList, pageable, filteredList.size());
        } else {
            // Use single dynamic query that handles all parameter combinations
            page = applicationRepository.findApplicationsByRecruitment(recruitmentId, status, keyword, pageable);
        }

        Page<RecruitmentApplicationData> dataPage = page.map(app -> {
            RecruitmentApplicationData data = recruitmentApplicationMapper.toDto(app);
            setTeamName(data, app.getTeamId());
            return data;
        });
        return PagedResponse.of(dataPage);
    }

    @Override
    public PagedResponse<RecruitmentApplicationData> listMyApplications(Long applicantId, RecruitmentApplicationStatus status, String keyword, Pageable pageable) {
        Page<RecruitmentApplication> page;

        // If keyword is provided, use client-side filtering with Vietnamese normalization
        if (keyword != null && !keyword.trim().isEmpty()) {
            String trimmedKeyword = keyword.trim();
            // Get all applications without keyword filter
            page = (status == null)
                    ? applicationRepository.findMyApplications(applicantId, null, null, PageRequest.of(0, Integer.MAX_VALUE))
                    : applicationRepository.findMyApplications(applicantId, status, null, PageRequest.of(0, Integer.MAX_VALUE));

            // Filter using Vietnamese normalization
            List<RecruitmentApplication> filteredList = page.getContent().stream()
                    .filter(app -> {
                        String recruitmentTitle = normalizeVietnamese(app.getRecruitment().getTitle() != null ? app.getRecruitment().getTitle() : "");
                        String clubName = normalizeVietnamese(app.getRecruitment().getClub().getClubName() != null ? app.getRecruitment().getClub().getClubName() : "");

                        // Split keyword into individual words for better matching
                        String[] keywords = trimmedKeyword.split("\\s+");
                        for (String kw : keywords) {
                            String normalizedKw = normalizeVietnamese(kw);
                            if (recruitmentTitle.contains(normalizedKw) || clubName.contains(normalizedKw)) {
                                return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());

            // Apply pagination manually
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), filteredList.size());
            List<RecruitmentApplication> paginatedList = start >= filteredList.size() ?
                    Collections.emptyList() : filteredList.subList(start, end);
            page = new PageImpl<>(paginatedList, pageable, filteredList.size());
        } else {
            // Use single dynamic query that handles all parameter combinations
            page = applicationRepository.findMyApplications(applicantId, status, keyword, pageable);
        }

        Page<RecruitmentApplicationData> dataPage = page.map(app -> {
            RecruitmentApplicationData data = recruitmentApplicationMapper.toDto(app);
            setTeamName(data, app.getTeamId());
            return data;
        });
        return PagedResponse.of(dataPage);
    }


    /**
     * Submit application with file upload support
     * @param applicantId User ID of the applicant
     * @param req Application submit request
     * @param allFiles MultiValueMap containing files with keys like "file_<questionId>"
     * @return Submitted application data
     * @throws AppException if submission fails
     */
    @Transactional
    public RecruitmentApplicationData submitApplication(Long applicantId, ApplicationSubmitRequest req, MultiValueMap<String, MultipartFile> allFiles) throws AppException {
        Recruitment recruitment = recruitmentRepository.findById(req.recruitmentId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));

        // Check if club is active (only active clubs can receive applications)
        Club club = recruitment.getClub();
        if (!"ACTIVE".equalsIgnoreCase(club.getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        User applicant = userRepository.findById(applicantId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        // Check if user is already an active member of the club
        Long clubId = club.getId();
        boolean isAlreadyMember = clubMemberShipRepository.existsByUserIdAndClubIdAndStatus(
                applicantId, clubId, ClubMemberShipStatus.ACTIVE);
        if (isAlreadyMember) {
            throw new AppException(ErrorCode.ALREADY_CLUB_MEMBER);
        }

        // Check if user has already submitted an application for this recruitment period
        if (applicationRepository.findByApplicant_IdAndRecruitment_Id(applicantId, recruitment.getId()).isPresent()) {
            throw new AppException(ErrorCode.ALREADY_APPLIED);
        }

        // Validate required questions are answered
        List<RecruitmentFormQuestion> questions = questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(recruitment.getId());
        for (RecruitmentFormQuestion question : questions) {
            if (question.getIsRequired() != null && question.getIsRequired() == 1) {
                boolean isAnswered = req.answers.stream()
                        .anyMatch(ans -> ans.questionId.equals(question.getId()) && 
                                       (ans.answerText != null && !ans.answerText.trim().isEmpty() || 
                                        ans.fileUrl != null && !ans.fileUrl.trim().isEmpty()));
                
                // Check if file is uploaded for this question
                if (!isAnswered && allFiles != null) {
                    String fileKey = "file_" + question.getId();
                    if (allFiles.containsKey(fileKey)) {
                        List<MultipartFile> files = allFiles.get(fileKey);
                        if (files != null && !files.isEmpty() && files.getFirst() != null && !files.getFirst().isEmpty()) {
                            isAnswered = true;
                        }
                    }
                }
                
                if (!isAnswered) {
                    throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
                }
            }
        }

        RecruitmentApplication app = RecruitmentApplication.builder()
                .recruitment(recruitment)
                .applicant(applicant)
                .teamId(req.teamId)
                .status(RecruitmentApplicationStatus.UNDER_REVIEW)
                .submittedDate(LocalDateTime.now())
                .build();
        app = applicationRepository.save(app);

        // Build a map of questionId -> uploaded file URL
        Map<Long, String> uploadedFileUrls = new HashMap<>();
        if (allFiles != null && !allFiles.isEmpty()) {
            // Parse files with format "file_<questionId>"
            for (Map.Entry<String, List<MultipartFile>> entry : allFiles.entrySet()) {
                String key = entry.getKey();
                
                // Skip non-file fields (like "request")
                if (!key.startsWith("file_")) {
                    continue;
                }
                
                try {
                    // Extract questionId from key "file_<questionId>"
                    Long questionId = Long.parseLong(key.substring(5));
                    List<MultipartFile> files = entry.getValue();
                    
                    if (files != null && !files.isEmpty()) {
                        MultipartFile file = files.getFirst(); // Take first file
                        if (file != null && !file.isEmpty()) {
                            // Upload to Cloudinary
                            CloudinaryService.UploadResult uploadResult = cloudinaryService.uploadFile(file);
                            uploadedFileUrls.put(questionId, uploadResult.url());
                        }
                    }
                } catch (NumberFormatException e) {
                    // Invalid questionId format, skip
                } catch (Exception e) {
                    throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
                }
            }
        }

        List<RecruitmentFormAnswer> answers = new ArrayList<>();
        for (ApplicationSubmitRequest.FormAnswerRequest a : req.answers) {
            String fileUrl = a.fileUrl;
            
            // If file was uploaded for this question, use the uploaded URL
            if (uploadedFileUrls.containsKey(a.questionId)) {
                fileUrl = uploadedFileUrls.get(a.questionId);
            }
            
            RecruitmentFormAnswer ans = RecruitmentFormAnswer.builder()
                    .application(app)
                    .question(RecruitmentFormQuestion.builder().id(a.questionId).build())
                    .answerText(a.answerText)
                    .fileUrl(fileUrl)
                    .build();
            answers.add(ans);
        }
        answerRepository.saveAll(answers);

        // Send notification to Club Officers about new application
        try {
            List<Long> officerIds = getClubOfficersInCurrentSemester(clubId);

            if (!officerIds.isEmpty()) {
                String actionUrl = "/recruitments/" + recruitment.getId() + "/applications/" + app.getId();
                String title = "Có đơn ứng tuyển mới";
                String message = applicant.getFullName() + " đã nộp đơn ứng tuyển vào đợt tuyển thành viên: \""
                        + recruitment.getTitle() + "\"";

                notificationService.sendToUsers(
                        officerIds,
                        applicantId,
                        title,
                        message,
                        NotificationType.RECRUITMENT_APPLICATION_SUBMITTED,
                        NotificationPriority.NORMAL,
                        actionUrl,
                        clubId,
                        null,
                        null,
                        null
                );
            }
        } catch (Exception e) {
            // Log error but don't fail the operation
            System.err.println("Failed to send application submitted notification: " + e.getMessage());
        }

        return getApplicationInternal(app.getId());
    }

    @Override
    public RecruitmentApplicationData getApplication(Long userId, Long applicationId) throws AppException {
        RecruitmentApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_OFFICER
        Long clubId = app.getRecruitment().getClub().getId();
        checkClubOfficerPermission(userId, clubId);
        
        List<RecruitmentFormAnswer> answers = answerRepository.findByApplication_Id(applicationId);
        app.setAnswers(new HashSet<>(answers));
        
        RecruitmentApplicationData data = recruitmentApplicationMapper.toDto(app);
        setTeamName(data, app.getTeamId());

        return data;
    }

    @Override
    public RecruitmentApplicationData getMyApplication(Long applicantId, Long applicationId) throws AppException {
        RecruitmentApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check: application must belong to the applicant
        if (!app.getApplicant().getId().equals(applicantId)) {
            throw new AppException(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
        
        List<RecruitmentFormAnswer> answers = answerRepository.findByApplication_Id(applicationId);
        app.setAnswers(new HashSet<>(answers));
        
        RecruitmentApplicationData data = recruitmentApplicationMapper.toDto(app);
        setTeamName(data, app.getTeamId());

        return data;
    }

    @Override
    @Transactional
    public RecruitmentApplicationData reviewApplication(Long userId, ApplicationReviewRequest req) throws AppException {
        RecruitmentApplication app = applicationRepository.findById(req.applicationId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        Long clubId = app.getRecruitment().getClub().getId();
        checkClubOfficerPermission(userId, clubId);
        
        // Check if club is active
        Club club = app.getRecruitment().getClub();
        if (!"ACTIVE".equalsIgnoreCase(club.getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        // Check if current status is INTERVIEW and interview time hasn't passed yet
        if (app.getStatus() == RecruitmentApplicationStatus.INTERVIEW
            && app.getInterviewTime() != null
            && LocalDateTime.now().isBefore(app.getInterviewTime())) {
            throw new AppException(ErrorCode.INTERVIEW_NOT_YET);
        }

        app.setStatus(req.status);
        app.setReviewNotes(req.reviewNotes);
        app.setReviewedDate(LocalDateTime.now());
        app.setInterviewTime(req.interviewTime);
        app.setInterviewAddress(req.interviewAddress);
        app.setInterviewPreparationRequirements(req.interviewPreparationRequirements);
        applicationRepository.save(app);
        
        // If status is ACCEPTED, add user to the registered team
        if (req.status == RecruitmentApplicationStatus.ACCEPTED && app.getTeamId() != null) {
            addMemberToTeam(app);
        }
        
        // Send notification to applicant about application review result
        try {
            Long applicantId = app.getApplicant().getId();
            String actionUrl = "/myRecruitmentApplications";
            String title = "";
            String message = "";
            NotificationType notificationType = null;
            NotificationPriority priority = NotificationPriority.NORMAL;

            if (req.status == RecruitmentApplicationStatus.ACCEPTED) {
                title = "Đơn ứng tuyển được chấp nhận";
                message = "Đơn ứng tuyển của bạn vào đợt tuyển \"" + app.getRecruitment().getTitle()
                        + "\" đã được chấp nhận. Chào mừng bạn đến với CLB " + club.getClubName() + "!";
                notificationType = NotificationType.RECRUITMENT_APPLICATION_APPROVED;
                priority = NotificationPriority.HIGH;
            } else if (req.status == RecruitmentApplicationStatus.REJECTED) {
                title = "Đơn ứng tuyển không được chấp nhận";
                message = "Đơn ứng tuyển của bạn vào đợt tuyển \"" + app.getRecruitment().getTitle()
                        + "\" không được chấp nhận.";
                if (req.reviewNotes != null && !req.reviewNotes.trim().isEmpty()) {
                    message += " Lý do: " + req.reviewNotes;
                }
                notificationType = NotificationType.RECRUITMENT_APPLICATION_REJECTED;
            } else if (req.interviewTime != null) {
                // If interview time is scheduled (regardless of status)
                title = "Thông báo lịch phỏng vấn";
                message = "Bạn đã được mời phỏng vấn cho đợt tuyển \"" + app.getRecruitment().getTitle() + "\".";
                if (req.interviewAddress != null && !req.interviewAddress.trim().isEmpty()) {
                    message += " Địa điểm: " + req.interviewAddress + ".";
                }
                if (req.interviewPreparationRequirements != null && !req.interviewPreparationRequirements.trim().isEmpty()) {
                    message += " Yêu cầu chuẩn bị: " + req.interviewPreparationRequirements;
                }
                notificationType = NotificationType.RECRUITMENT_APPLICATION_REVIEWED;
                priority = NotificationPriority.HIGH;
            }

            if (notificationType != null) {
                notificationService.sendToUser(
                        applicantId,
                        userId,
                        title,
                        message,
                        notificationType,
                        priority,
                        actionUrl,
                        clubId,
                        null,
                        null,
                        null,
                        null
                );
            }
        } catch (Exception e) {
            // Log error but don't fail the operation
            System.err.println("Failed to send application review notification: " + e.getMessage());
        }

        return getApplicationInternal(app.getId());
    }

    @Override
    @Transactional
    public RecruitmentApplicationData updateInterviewSchedule(Long userId, InterviewUpdateRequest req) throws AppException {
        RecruitmentApplication app = applicationRepository.findById(req.applicationId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));

        // Check permission: must be CLUB_PRESIDENT and a member of the club
        Long clubId = app.getRecruitment().getClub().getId();
        checkClubOfficerPermission(userId, clubId);

        // Check if club is active
        Club club = app.getRecruitment().getClub();
        if (!"ACTIVE".equalsIgnoreCase(club.getStatus())) {
            throw new AppException(ErrorCode.CLUB_NOT_ACTIVE);
        }

        // Check if current interview time hasn't passed yet (can only update before interview time)
        if (app.getInterviewTime() != null && LocalDateTime.now().isAfter(app.getInterviewTime())) {
            throw new AppException(ErrorCode.INTERVIEW_TIME_PASSED);
        }

        // Update interview schedule
        app.setInterviewTime(req.interviewTime);
        app.setInterviewAddress(req.interviewAddress);
        app.setInterviewPreparationRequirements(req.interviewPreparationRequirements);
        applicationRepository.save(app);

        // Send notification to applicant about interview schedule update
        try {
            Long applicantId = app.getApplicant().getId();
            String actionUrl = "/myRecruitmentApplications";
            String title = "Cập nhật lịch phỏng vấn";
            String message = "Lịch phỏng vấn cho đợt tuyển \"" + app.getRecruitment().getTitle() + "\" đã được cập nhật.";

            if (req.interviewTime != null) {
                message += " Thời gian: " + req.interviewTime + ".";
            }
            if (req.interviewAddress != null && !req.interviewAddress.trim().isEmpty()) {
                message += " Địa điểm: " + req.interviewAddress + ".";
            }
            if (req.interviewPreparationRequirements != null && !req.interviewPreparationRequirements.trim().isEmpty()) {
                message += " Yêu cầu chuẩn bị: " + req.interviewPreparationRequirements;
            }

            notificationService.sendToUser(
                    applicantId,
                    userId,
                    title,
                    message,
                    NotificationType.RECRUITMENT_APPLICATION_REVIEWED,
                    NotificationPriority.HIGH,
                    actionUrl,
                    clubId,
                    null,
                    null,
                    null,
                    null
            );
        } catch (Exception e) {
            // Log error but don't fail the operation
            System.err.println("Failed to send interview schedule update notification: " + e.getMessage());
        }

        return getApplicationInternal(app.getId());
    }
    
    /**
     * Get application information without permission check (for internal use)
     */
    private RecruitmentApplicationData getApplicationInternal(Long applicationId) throws AppException {
        RecruitmentApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        List<RecruitmentFormAnswer> answers = answerRepository.findByApplication_Id(applicationId);
        app.setAnswers(new HashSet<>(answers));
        
        RecruitmentApplicationData data = recruitmentApplicationMapper.toDto(app);
        setTeamName(data, app.getTeamId());

        return data;
    }

    /**
     * Helper method to set team name in application data
     */
    private void setTeamName(RecruitmentApplicationData data, Long teamId) {
        if (teamId != null) {
            teamRepository.findById(teamId).ifPresent(team -> data.setTeamName(team.getTeamName()));
        }
    }
    
    /**
     * Add member to team after application is accepted
     */
    private void addMemberToTeam(RecruitmentApplication app) throws AppException {
        Long applicantId = app.getApplicant().getId();
        Long clubId = app.getRecruitment().getClub().getId();
        Long teamId = app.getTeamId();
        
        // Check if user is already a member of the club
        ClubMemberShip clubMembership = clubMemberShipRepository
                .findByUserIdAndClubIdAndStatus(applicantId, clubId, ClubMemberShipStatus.ACTIVE)
                .orElse(null);
        
        // If not a member yet, create new ClubMemberShip
        if (clubMembership == null) {
            Club club = app.getRecruitment().getClub();
            User applicant = app.getApplicant();
            
            clubMembership = ClubMemberShip.builder()
                    .user(applicant)
                    .club(club)
                    .joinDate(LocalDate.now())
                    .status(ClubMemberShipStatus.ACTIVE)
                    .build();
            clubMembership = clubMemberShipRepository.save(clubMembership);
        }
        
        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Get team
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Find ClubRole with role code MEMBER
        ClubRole memberRole = clubRoleRepository.findByClubIdAndRoleCode(clubId, "MEMBER")
                .orElse(null); // If not found, set to null (keep original behavior)
        
        // Create RoleMemberShip to assign user to team
        RoleMemberShip roleMembership = RoleMemberShip.builder()
                .clubMemberShip(clubMembership)
                .team(team)
                .clubRole(memberRole) // Assign MEMBER role if found
                .semester(currentSemester)
                .isActive(true)
                .build();
        roleMembershipRepository.save(roleMembership);
    }


    private void upsertQuestions(Recruitment recruitment, List<RecruitmentQuestionRequest> reqs) {
        if (reqs == null) return;
        
        // Get existing questions
        List<RecruitmentFormQuestion> existingQuestions = questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(recruitment.getId());
        
        // Collect IDs of questions that should be kept
        Set<Long> requestedQuestionIds = reqs.stream()
                .map(q -> q.id)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        
        // Delete questions that are not in the request (orphaned questions)
        for (RecruitmentFormQuestion existingQuestion : existingQuestions) {
            if (!requestedQuestionIds.contains(existingQuestion.getId())) {
                // Delete options first
                questionOptionRepository.findByQuestion_IdOrderByOptionOrderAsc(existingQuestion.getId())
                        .forEach(option -> questionOptionRepository.deleteById(option.getId()));
                // Then delete question
                questionRepository.deleteById(existingQuestion.getId());
            }
        }

        // Create or update questions
        for (RecruitmentQuestionRequest q : reqs) {
            RecruitmentFormQuestion entity;
            
            if (q.id != null) {
                // UPDATE existing question
                entity = questionRepository.findById(q.id)
                        .orElseThrow(() -> new RuntimeException("Question not found: " + q.id));
                entity.setQuestionText(q.questionText);
                entity.setQuestionType(q.questionType);
                entity.setQuestionOrder(q.questionOrder);
                entity.setIsRequired(q.isRequired);
                entity = questionRepository.save(entity);
                
                // Delete old options and create new ones
                questionOptionRepository.findByQuestion_IdOrderByOptionOrderAsc(entity.getId())
                        .forEach(option -> questionOptionRepository.deleteById(option.getId()));
            } else {
                // CREATE new question
                entity = RecruitmentFormQuestion.builder()
                        .questionText(q.questionText)
                        .questionType(q.questionType)
                        .questionOrder(q.questionOrder)
                        .isRequired(q.isRequired)
                        .recruitment(recruitment)
                        .build();
                entity = questionRepository.save(entity);
            }
            
            // Save question options if provided
            if (q.options != null && !q.options.isEmpty()) {
                saveQuestionOptions(entity, q.options);
            }
        }
    }

    private void saveQuestionOptions(RecruitmentFormQuestion question, List<String> options) {
        for (int i = 0; i < options.size(); i++) {
            QuestionOption option = QuestionOption.builder()
                    .optionText(options.get(i))
                    .optionOrder(i + 1)
                    .question(question)
                    .build();
            questionOptionRepository.save(option);
        }
    }

    private void upsertTeamOptions(Recruitment recruitment, List<Long> teamIds) {
        // Validate teamIds is not null or empty (should be enforced by validation, but double-check)
        if (teamIds == null || teamIds.isEmpty()) {
            throw new RuntimeException("teamOptionIds cannot be empty. Must select at least one team.");
        }
        
        // Get existing team options
        List<TeamOption> existingTeamOptions = teamOptionRepository.findByRecruitment_Id(recruitment.getId());
        
        // Extract existing team IDs
        Set<Long> existingTeamIds = existingTeamOptions.stream()
                .map(teamOption -> teamOption.getTeam().getId())
                .collect(java.util.stream.Collectors.toSet());
        
        // Convert request team IDs to set
        Set<Long> requestedTeamIds = new java.util.HashSet<>(teamIds);
        
        // Delete team options that are not in the request (orphaned team options)
        for (TeamOption existingTeamOption : existingTeamOptions) {
            if (!requestedTeamIds.contains(existingTeamOption.getTeam().getId())) {
                teamOptionRepository.deleteById(existingTeamOption.getId());
            }
        }
        
        // Create new team options that are not in existing
        for (Long teamId : requestedTeamIds) {
            if (!existingTeamIds.contains(teamId)) {
                // Verify team exists
                Team team = teamRepository.findById(teamId)
                        .orElseThrow(() -> new RuntimeException("Team not found: " + teamId));
                
                TeamOption teamOption = TeamOption.builder()
                        .recruitment(recruitment)
                        .team(team)
                        .build();
                teamOptionRepository.save(teamOption);
            }
        }
    }

    /**
     * Close all other OPEN recruitments of the club (except current recruitment)
     * to ensure only one recruitment is OPEN at a time
     */
    private void closeOtherOpenRecruitments(Long clubId, Long currentRecruitmentId) {
        List<Recruitment> openRecruitments = recruitmentRepository.findByClub_IdAndStatusAndIdNot(
                clubId, RecruitmentStatus.OPEN, currentRecruitmentId
        );
        
        for (Recruitment recruitment : openRecruitments) {
            recruitment.setStatus(RecruitmentStatus.CLOSED);
            recruitmentRepository.save(recruitment);
        }
    }

    /**
     * Check if user has permission to manage recruitment of the club
     * Requirement: must be an ACTIVE member of the club AND have club role CLUB_PRESIDENT in the current semester
     */
    private void checkClubOfficerPermission(Long userId, Long clubId) throws AppException {
        // Get current semester
        Semester currentSemester = semesterRepository.findCurrentSemester()
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check if user is CLUB_PRESIDENT of the club in the current semester
        boolean isClubPresident = roleMembershipRepository.isClubOfficerInCurrentSemester(
                userId, clubId, currentSemester.getId()
        );
        
        if (!isClubPresident) {
            throw new AppException(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
    }

    /**
     * Close expired recruitments whose endDate is before the provided time.
     * Returns the number of recruitments updated.
     */
    @Transactional
    public int closeExpiredRecruitments(java.time.LocalDateTime now) {
        // Only close recruitments that are currently OPEN
        return recruitmentRepository.closeExpiredRecruitments(RecruitmentStatus.CLOSED, RecruitmentStatus.OPEN, now);
    }

    private String normalizeVietnamese(String text) {
        if (text == null || text.isBlank()) return "";
        String normalized = text.replace("đ", "d").replace("Đ", "d");
        normalized = java.text.Normalizer.normalize(normalized, java.text.Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.toLowerCase();
    }

}
