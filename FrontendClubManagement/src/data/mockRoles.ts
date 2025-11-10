// Mock System Roles
export const mockSystemRoles = [
  { id: 1, roleName: "Admin", description: "Quản trị viên hệ thống" },
  { id: 2, roleName: "Staff", description: "Nhân viên quản lý" },
  { id: 3, roleName: "Club Officer", description: "Cán bộ câu lạc bộ" },
  { id: 4, roleName: "Team Officer", description: "Trưởng ban" },
  { id: 5, roleName: "Club Treasure", description: "Thủ quỹ CLB" },
  { id: 6, roleName: "Member", description: "Thành viên" },
  { id: 7, roleName: "Student", description: "Sinh viên" },
];

// Mock Club Roles
export interface ClubRole {
  id: number;
  roleName: string;
  roleCode?: string;
  description?: string;
  roleLevel: number;
  systemRoleId: number;
  systemRoleName?: string;
}

export const mockClubRoles: ClubRole[] = [
  {
    id: 1,
    roleName: "Chủ tịch CLB",
    roleCode: "club_president",
    description: "Lãnh đạo và điều hành toàn bộ hoạt động của CLB",
    roleLevel: 1,
    systemRoleId: 3,
    systemRoleName: "Club Officer",
  },
  {
    id: 2,
    roleName: "Phó chủ tịch",
    roleCode: "vice_president",
    description: "Hỗ trợ chủ tịch điều hành CLB",
    roleLevel: 2,
    systemRoleId: 3,
    systemRoleName: "Club Officer",
  },
  {
    id: 3,
    roleName: "Trưởng ban Truyền thông",
    roleCode: "head_pr",
    description: "Quản lý hoạt động truyền thông và marketing",
    roleLevel: 3,
    systemRoleId: 4,
    systemRoleName: "Team Officer",
  },
  {
    id: 4,
    roleName: "Trưởng ban Tổ chức",
    roleCode: "head_event",
    description: "Quản lý và tổ chức các sự kiện",
    roleLevel: 3,
    systemRoleId: 4,
    systemRoleName: "Team Officer",
  },
  {
    id: 5,
    roleName: "Trưởng ban",
    roleCode: "team_head",
    description: "Quản lý một ban trong CLB",
    roleLevel: 3,
    systemRoleId: 4,
    systemRoleName: "Team Officer",
  },
  {
    id: 6,
    roleName: "Thành viên cốt cán",
    roleCode: "core_member",
    description: "Thành viên tích cực tham gia hoạt động",
    roleLevel: 4,
    systemRoleId: 6,
    systemRoleName: "Member",
  },
  {
    id: 7,
    roleName: "Thành viên",
    roleCode: "member",
    description: "Thành viên thường của CLB",
    roleLevel: 5,
    systemRoleId: 6,
    systemRoleName: "Member",
  },
];
