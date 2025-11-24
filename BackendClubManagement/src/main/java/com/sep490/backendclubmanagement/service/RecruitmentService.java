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
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

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
    private final EventRepository eventRepository; // placeholder if needed later
    private final RecruitmentMapper recruitmentMapper;
    private final RecruitmentApplicationMapper recruitmentApplicationMapper;
    private final CloudinaryService cloudinaryService;
    private final ClubMemberShipRepository clubMemberShipRepository;
    private final RoleMemberShipRepository roleMembershipRepository;
    private final SemesterRepository semesterRepository;
    private final ClubRoleRepository clubRoleRepository;

    @Override
    public PagedResponse<RecruitmentData> listRecruitments(Long clubId, RecruitmentStatus status, Pageable pageable) {
        return listRecruitments(clubId, status, null, pageable);
    }
    
    public PagedResponse<RecruitmentData> listRecruitments(Long clubId, RecruitmentStatus status, String keyword, Pageable pageable) {
        Page<Recruitment> page;
        
        // If keyword is provided, use search query
        if (keyword != null && !keyword.trim().isEmpty()) {
            String trimmedKeyword = keyword.trim();
            page = (status == null)
                    ? recruitmentRepository.searchByClubIdAndKeyword(clubId, trimmedKeyword, pageable)
                    : recruitmentRepository.searchByClubIdAndStatusAndKeyword(clubId, status, trimmedKeyword, pageable);
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
        checkClubPresidentPermission(userId, clubId);
        
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
        
        return recruitmentMapper.toDto(r);
    }

    @Override
    @Transactional
    public RecruitmentData updateRecruitment(Long userId, Long id, RecruitmentUpdateRequest req) throws AppException {
        Recruitment r = recruitmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        checkClubPresidentPermission(userId, r.getClub().getId());
        
        // Check if recruitment is closed
        if (r.getStatus() == RecruitmentStatus.CLOSED) {
            throw new AppException(ErrorCode.RECRUITMENT_CLOSED);
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
        checkClubPresidentPermission(userId, r.getClub().getId());
        
        // If new status is OPEN, close all other OPEN recruitments of the club
        if (status == RecruitmentStatus.OPEN) {
            closeOtherOpenRecruitments(r.getClub().getId(), r.getId());
        }
        
        r.setStatus(status);
        recruitmentRepository.save(r);
    }

    @Override
    @Transactional
    public void deleteRecruitment(Long userId, Long id) throws AppException {
        Recruitment r = recruitmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        checkClubPresidentPermission(userId, r.getClub().getId());
        
        recruitmentRepository.deleteById(id);
    }

    @Override
    public PagedResponse<RecruitmentApplicationData> listApplications(Long userId, Long recruitmentId, RecruitmentApplicationStatus status, Pageable pageable) throws AppException {
        return listApplications(userId, recruitmentId, status, null, pageable);
    }
    
    public PagedResponse<RecruitmentApplicationData> listApplications(Long userId, Long recruitmentId, RecruitmentApplicationStatus status, String keyword, Pageable pageable) throws AppException {
        // Get recruitment to determine clubId
        Recruitment recruitment = recruitmentRepository.findById(recruitmentId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        checkClubPresidentPermission(userId, recruitment.getClub().getId());
        
        // Use single dynamic query that handles all parameter combinations
        Page<RecruitmentApplication> page = applicationRepository.findApplicationsByRecruitment(recruitmentId, status, keyword, pageable);
        Page<RecruitmentApplicationData> dataPage = page.map(recruitmentApplicationMapper::toDto);
        return PagedResponse.of(dataPage);
    }

    @Override
    public PagedResponse<RecruitmentApplicationData> listMyApplications(Long applicantId, RecruitmentApplicationStatus status, String keyword, Pageable pageable) {
        // Use single dynamic query that handles all parameter combinations
        Page<RecruitmentApplication> page = applicationRepository.findMyApplications(applicantId, status, keyword, pageable);
        Page<RecruitmentApplicationData> dataPage = page.map(recruitmentApplicationMapper::toDto);
        return PagedResponse.of(dataPage);
    }

    @Override
    @Transactional
    public RecruitmentApplicationData submitApplication(Long applicantId, ApplicationSubmitRequest req) throws AppException {
        return submitApplication(applicantId, req, null);
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
        User applicant = userRepository.findById(applicantId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        // Check if user is already an active member of the club
        Long clubId = recruitment.getClub().getId();
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
                    continue;
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

        return getApplicationInternal(app.getId());
    }

    @Override
    public RecruitmentApplicationData getApplication(Long userId, Long applicationId) throws AppException {
        RecruitmentApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        Long clubId = app.getRecruitment().getClub().getId();
        checkClubPresidentPermission(userId, clubId);
        
        List<RecruitmentFormAnswer> answers = answerRepository.findByApplication_Id(applicationId);
        app.setAnswers(new HashSet<>(answers));
        
        return recruitmentApplicationMapper.toDto(app);
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
        
        return recruitmentApplicationMapper.toDto(app);
    }

    @Override
    @Transactional
    public RecruitmentApplicationData reviewApplication(Long userId, ApplicationReviewRequest req) throws AppException {
        RecruitmentApplication app = applicationRepository.findById(req.applicationId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check permission: must be CLUB_PRESIDENT and a member of the club
        Long clubId = app.getRecruitment().getClub().getId();
        checkClubPresidentPermission(userId, clubId);
        
        app.setStatus(req.status);
        app.setReviewNotes(req.reviewNotes);
        app.setReviewedDate(LocalDateTime.now());
        applicationRepository.save(app);
        
        // If status is ACCEPTED, add user to the registered team
        if (req.status == RecruitmentApplicationStatus.ACCEPTED && app.getTeamId() != null) {
            addMemberToTeam(app);
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
        
        return recruitmentApplicationMapper.toDto(app);
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
                .filter(id -> id != null)
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
    private void checkClubPresidentPermission(Long userId, Long clubId) throws AppException {
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

}
