import { axiosClient } from "@/api/axiosClient";

export type StaffSummary = {
	id: number;
	email: string;
	fullName: string;
	phoneNumber?: string;
	isActive: boolean;
	avatarUrl?: string;
	gender?: string;
};

export type StaffListResponse = {
	total: number;
	count: number;
	data: StaffSummary[];
};

export type StaffFilterRequest = {
	page?: number;
	size?: number;
	sort?: string[];
	keyword?: string;
	isActive?: boolean;
};

export type StaffActiveRequest = {
	isActive: boolean;
};

export type UpdateStaffProfileRequest = {
	fullName?: string;
	phoneNumber?: string;
	studentCode?: string;
	dateOfBirth?: string; // yyyy-MM-dd
	gender?: string;
	avatarFile?: File; // optional
};

export type CreateStaffPayload = {
	email: string;
	fullName: string;
	phoneNumber?: string;
	gender?: string;
	studentCode?: string;
	isActive?: boolean;
};

const baseUrl = "/admin";

export const staffManagementService = {
	async getAllByFilter(body: StaffFilterRequest): Promise<StaffListResponse> {
		const res = await axiosClient.post<StaffListResponse>(
			`${baseUrl}/staff/get-all-by-filter`,
			body
		);
		if (res.code !== 200 || !res.data) throw new Error(res.message || "Failed to fetch staff");
		return res.data;
	},

	async setActive(staffId: number, body: StaffActiveRequest): Promise<void> {
		const res = await axiosClient.post<void>(
			`${baseUrl}/staff/${staffId}/active`,
			body
		);
		if (res.code !== 200) throw new Error(res.message || "Failed to set active");
	},

	async updateProfile(staffId: number, req: UpdateStaffProfileRequest): Promise<StaffSummary> {
		const form = new FormData();
		if (req.fullName !== undefined) form.append("fullName", req.fullName);
		if (req.phoneNumber !== undefined) form.append("phoneNumber", req.phoneNumber);
		if (req.studentCode !== undefined) form.append("studentCode", req.studentCode);
		if (req.dateOfBirth !== undefined) form.append("dateOfBirth", req.dateOfBirth);
		if (req.gender !== undefined) form.append("gender", req.gender);
		if (req.avatarFile) form.append("avatarFile", req.avatarFile);

		const res = await axiosClient.post<StaffSummary>(
			`${baseUrl}/staff/${staffId}/profile`,
			form,
			{
				headers: {
					"Content-Type": "multipart/form-data",
				},
			}
		);
		if (res.code !== 200 || !res.data) throw new Error(res.message || "Failed to update profile");
		return res.data;
	},

	async create(payload: CreateStaffPayload): Promise<StaffSummary> {
		const res = await axiosClient.post<StaffSummary>(`${baseUrl}/staff/create`, payload);
		if (res.code !== 200 || !res.data) {
			throw new Error(res.message || "Không thể tạo staff");
		}
		return res.data;
	},

	async getProfile(staffId: number) {
		const res = await axiosClient.get<{
			id: number;
			email: string;
			fullName: string;
			phoneNumber?: string;
			studentCode?: string;
			dateOfBirth?: string;
			gender?: string;
			avatarUrl?: string;
			isActive: boolean;
			systemRoleId?: number;
			systemRoleName?: string;
			clubMemberships?: any[];
		}>(`${baseUrl}/staff/${staffId}`);
		if (res.code !== 200 || !res.data) throw new Error(res.message || "Failed to fetch profile");
		return res.data;
	},

	// NEW: chỉ lấy thông tin cơ bản
	async getBasicProfile(staffId: number) {
		const res = await axiosClient.get<{
			id: number;
			email: string;
			fullName: string;
			phoneNumber?: string;
			gender?: string;
			avatarUrl?: string;
			isActive: boolean;
		}>(`${baseUrl}/staff/${staffId}`);
		if (res.code !== 200 || !res.data) throw new Error(res.message || "Failed to fetch profile");
		const { id, email, fullName, phoneNumber, gender, avatarUrl, isActive } = res.data;
		return { id, email, fullName, phoneNumber, gender, avatarUrl, isActive };
	},
};

export default staffManagementService;


