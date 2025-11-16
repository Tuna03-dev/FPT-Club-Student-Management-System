import { axiosClient } from "@/api/axiosClient";
import type { ApiResponse } from "@/api/axiosClient";

export interface RoleMembership {
  roleMembershipId: number;
  clubRoleId: number;
  clubRoleName: string;
  clubRoleCode: string;
  clubRoleLevel: number;
  teamId: number;
  teamName: string;
  semesterId: number;
  semesterName: string;
  semesterIsCurrent: boolean;
  isActive: boolean;
}

export interface ClubMembership {
  clubMembershipId: number;
  clubId: number;
  clubName: string;
  clubCode: string;
  clubLogoUrl: string;
  clubStatus: string;
  clubFeatured: boolean;
  joinDate: string;
  endDate: string | null;
  membershipStatus: string;
  roles: RoleMembership[];
}

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  studentCode: string;
  dateOfBirth: string | null;
  gender: string | null;
  avatarUrl: string;
  isActive: boolean;
  systemRoleId: number;
  systemRoleName: string;
  clubMemberships: ClubMembership[];
}

export const userService = {
  /**
   * Get current user's profile with club memberships and role history
   */
  getMyProfile: async (): Promise<ApiResponse<UserProfile>> => {
    return axiosClient.get<UserProfile>("/profile/me");
  },

  /**
   * Update current user's profile info
   */
  updateMyProfile: async (
    data: Partial<
      Pick<UserProfile, "fullName" | "phoneNumber" | "dateOfBirth" | "gender">
    >
  ): Promise<ApiResponse<UserProfile>> => {
    return axiosClient.put<UserProfile>("/profile/me/info", data);
  },

  /**
   * Upload avatar for current user
   */
  uploadAvatar: async (file: File): Promise<ApiResponse<UserProfile>> => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosClient.put<UserProfile>("/profile/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
