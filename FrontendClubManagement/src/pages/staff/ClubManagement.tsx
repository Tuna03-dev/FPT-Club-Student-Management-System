import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Plus,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Mail,
  Phone,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ClubManagementResponse,
  CreateClubRequest,
  UpdateClubRequest,
  // Campus,
  ClubCategory as ClubCategoryType,
} from "@/types/staffClub";
import {
  getStaffClubs,
  getStaffClubDetail,
  createStaffClub,
  updateStaffClub,
  // getAllCampuses,
  getAllClubCategories,
  deActiveStaffClub,
  activateStaffClub,
} from "@/api/staffClubs";

interface ClubCategory {
  id: string;
  clubs: number;
  name: string;
}

export function StaffClubsManagement() {
  const [activeTab, setActiveTab] = useState("all-clubs");
  const [searchTerm, setSearchTerm] = useState("");
  // Local input for live search with debounce; `searchTerm` is the effective value used for requests
  const [searchInput, setSearchInput] = useState("");
  const mainSearchDebounceRef = useRef<number | null>(null);
  const [selectedClub, setSelectedClub] =
    useState<ClubManagementResponse | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [editingClub, setEditingClub] = useState<ClubManagementResponse | null>(
    null
  );
  const [editFieldErrors, setEditFieldErrors] = useState<
    Record<string, string>
  >({});
  const [showCreateClubDialog, setShowCreateClubDialog] = useState(false);
  const [showCreateClubConfirm, setShowCreateClubConfirm] = useState(false);
  const [showUpdateClubConfirm, setShowUpdateClubConfirm] = useState(false);
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] =
    useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClubCategory | null>(
    null
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showCreateCategoryConfirm, setShowCreateCategoryConfirm] =
    useState(false);
  const [showUpdateCategoryConfirm, setShowUpdateCategoryConfirm] =
    useState(false);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] =
    useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null
  );
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  // Local input state so we only apply search on blur or Enter
  const [categorySearchInput, setCategorySearchInput] = useState("");
  const searchDebounceRef = useRef<number | null>(null);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryPageSize] = useState(10);
  const [categoryTotalPages, setCategoryTotalPages] = useState(0);
  const [categoryTotalElements, setCategoryTotalElements] = useState(0);

  // Staff Club Management States
  const [clubs, setClubs] = useState<ClubManagementResponse[]>([]);
  const [loading, setLoading] = useState(false);
  // Use 1-indexed `page` in the UI (default page 1). We'll convert to 0-index when calling backend.
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedCampus] = useState<number | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<
    number | undefined
  >();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  // const [campuses] = useState<Campus[]>([]);
  const [clubCategories, setClubCategories] = useState<ClubCategoryType[]>([]);

  const [newClubData, setNewClubData] = useState<CreateClubRequest>({
    clubName: "",
    clubCode: "",
    description: "",
    status: "ACTIVE",
    campusId: 1,
    categoryId: 0,
    presidentEmail: "",
  });

  // Validation state for create dialog
  const [newClubEmailError, setNewClubEmailError] = useState<string | null>(
    null
  );

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const [categories, setCategories] = useState<ClubCategory[]>([]);

  // Fetch clubs from API. If `silent` is true, do not toggle the global loading flag
  const fetchClubs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getStaffClubs({
        keyword: searchTerm,
        campusId: selectedCampus,
        categoryId: selectedCategory,
        status: selectedStatus,
        page: page,
        size: pageSize,
      });

      setClubs(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error: any) {
      console.error("Error fetching clubs:", error);
      toast.error(error.message || "Không thể tải danh sách câu lạc bộ");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch campuses on mount. Club categories are loaded lazily when user opens Create dialog.
  // useEffect(() => {
  //   const fetchInitialData = async () => {
  //     try {
  //       const campusesData = await getAllCampuses();
  //       setCampuses(campusesData);
  //     } catch (error: any) {
  //       console.error("Error fetching initial data:", error);
  //       toast.error("Không thể tải dữ liệu khởi tạo");
  //     }
  //   };
  //   fetchInitialData();
  // }, []);

  // Lazy-load club categories only when needed (e.g., when opening the Create dialog)
  const loadClubCategories = async (force = false) => {
    try {
      if (!force && clubCategories && clubCategories.length > 0) return; // already loaded
      const categoriesData = await getAllClubCategories();
      setClubCategories(categoriesData);
    } catch (err) {
      console.error("Error loading club categories:", err);
      toast.error("Không thể tải thể loại câu lạc bộ");
    }
  };

  // Ensure categories are available for the search filter dropdown.
  // Load once on mount so the category select in the filter has values.
  useEffect(() => {
    void loadClubCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch clubs when filters change
  useEffect(() => {
    if (activeTab === "all-clubs") {
      fetchClubs();
    }
  }, [
    activeTab,
    page,
    searchTerm,
    selectedCampus,
    selectedCategory,
    selectedStatus,
  ]);

  // Function to fetch categories from API
  const fetchCategories = async (search?: string, page?: number) => {
    try {
      setCategoriesLoading(true);
      const resp = await import("@/services/clubCategoryService").then(
        (m) => m.default || m.clubCategoryService
      );
      const result = await resp.getAllForStaff({
        q: search || categorySearchTerm,
        page: page !== undefined ? page : categoryPage,
        size: categoryPageSize,
      });
      if (result && result.code === 200 && result.data) {
        const items = result.data.content || [];
        setCategories(
          items.map((it: any) => ({
            id: String(it.id),
            name: it.categoryName,
            clubs: it.clubCount || 0,
          }))
        );
        setCategoryTotalPages(result.data.totalPages || 0);
        setCategoryTotalElements(result.data.totalElements || 0);
      } else {
        console.error("Failed to load categories:", result?.message);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Load categories for staff from backend when the user switches to the Categories tab
  useEffect(() => {
    let mounted = true;
    if (activeTab !== "categories") {
      return () => {
        mounted = false;
      };
    }

    if (mounted) {
      void fetchCategories();
    }

    return () => {
      mounted = false;
    };
  }, [activeTab, categorySearchTerm, categoryPage]);

  // Handle category search
  const handleCategorySearch = (value: string) => {
    setCategorySearchTerm(value);
    setCategoryPage(1); // Reset to first page on search
  };

  // Handle page change
  const handleCategoryPageChange = (newPage: number) => {
    setCategoryPage(newPage);
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status?.toUpperCase();
    const configs: Record<string, { color: string; label: string; icon: any }> =
      {
        ACTIVE: {
          color: "bg-green-100 text-green-800",
          label: "Hoạt động",
          icon: CheckCircle,
        },
        FORMING: {
          color: "bg-yellow-100 text-yellow-800",
          label: "Đang thành lập",
          icon: AlertCircle,
        },
        UNACTIVE: {
          color: "bg-gray-100 text-gray-800",
          label: "Không hoạt động",
          icon: AlertCircle,
        },
        SUSPENDED: {
          color: "bg-red-100 text-red-800",
          label: "Tạm dừng",
          icon: XCircle,
        },
      };
    const config = configs[statusUpper] || configs.UNACTIVE;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleCreateClub = async () => {
    if (
      !newClubData.clubName ||
      !newClubData.clubCode ||
      !newClubData.categoryId ||
      !newClubData.campusId ||
      !newClubData.presidentEmail
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    // Client-side email format validation
    if (!isValidEmail(newClubData.presidentEmail)) {
      setNewClubEmailError("Email không hợp lệ");
      return;
    }

    try {
      await createStaffClub(newClubData);
      toast.success("Tạo câu lạc bộ thành công");
      setNewClubData({
        clubName: "",
        clubCode: "",
        description: "",
        status: "ACTIVE",
        campusId: 1,
        categoryId: 0,
        presidentEmail: "",
      });
      setShowCreateClubDialog(false);
      setShowViewDialog(false);
      // After creating a club, refresh the list so the new club appears without showing global loader.
      setPage(1);
      try {
        await fetchClubs();
      } catch (err) {
        console.error("Error refreshing clubs after create:", err);
      }
    } catch (error: any) {
      console.error("Error creating club:", error);
      // Extract error message from various possible error structures
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tạo câu lạc bộ";
      toast.error(errorMessage);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const svc = await import("@/services/clubCategoryService").then(
        (m) => m.default || m.clubCategoryService
      );
      const resp = await svc.create({ categoryName: newCategoryName.trim() });
      if (resp.code === 200 && resp.data) {
        setNewCategoryName("");
        setShowCreateCategoryDialog(false);
        setShowCreateCategoryConfirm(false);
        toast.success("Tạo thể loại thành công");
        // Refetch to get correct order from backend
        await fetchCategories();
        // Also update categories used in Clubs tab and refresh clubs list
        try {
          await loadClubCategories(true);
        } catch (e) {
          console.error("Error loading club categories after create:", e);
        }
        try {
          await fetchClubs();
        } catch (e) {
          console.error("Error refreshing clubs after category create:", e);
        }
      } else {
        console.error("Create category failed:", resp.message);
        // show API message and close confirm dialog
        toast.error(resp.message || "Tạo thể loại thất bại");
        setShowCreateCategoryConfirm(false);
      }
    } catch (err) {
      console.error("Error creating category:", err);
      // try to surface API message if available
      // @ts-ignore
      const apiMessage = err?.response?.data?.message || (err && err.message);
      toast.error(apiMessage || "Lỗi khi tạo thể loại");
      setShowCreateCategoryConfirm(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    try {
      const svc = await import("@/services/clubCategoryService").then(
        (m) => m.default || m.clubCategoryService
      );
      const idNum = Number(editingCategory.id);
      const resp = await svc.update(idNum, {
        categoryName: editingCategory.name.trim(),
      });
      if (resp.code === 200 && resp.data) {
        setEditingCategory(null);
        setShowEditCategoryDialog(false);
        setShowUpdateCategoryConfirm(false);
        toast.success("Cập nhật thể loại thành công");
        // Refetch to get correct order from backend
        await fetchCategories();
        // Also update categories used in Clubs tab and refresh clubs list
        try {
          await loadClubCategories(true);
        } catch (e) {
          console.error("Error loading club categories after update:", e);
        }
        try {
          await fetchClubs();
        } catch (e) {
          console.error("Error refreshing clubs after category update:", e);
        }
      } else {
        console.error("Update failed:", resp.message);
        // surface API message and close update confirm
        toast.error(resp.message || "Cập nhật thất bại");
        setShowUpdateCategoryConfirm(false);
      }
    } catch (err) {
      console.error("Error updating category:", err);
      // @ts-ignore
      const apiMessage = err?.response?.data?.message || (err && err.message);
      toast.error(apiMessage || "Lỗi khi cập nhật thể loại");
      setShowUpdateCategoryConfirm(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const svc = await import("@/services/clubCategoryService").then(
        (m) => m.default || m.clubCategoryService
      );
      const resp = await svc.delete(Number(categoryId));
      if (resp.code === 200) {
        setShowDeleteCategoryConfirm(false);
        setDeletingCategoryId(null);
        toast.success("Xóa thể loại thành công");
        // Refetch to get correct order from backend
        await fetchCategories();
        // Also update categories used in Clubs tab and refresh clubs list
        try {
          await loadClubCategories(true);
        } catch (e) {
          console.error("Error loading club categories after delete:", e);
        }
        try {
          await fetchClubs();
        } catch (e) {
          console.error("Error refreshing clubs after category delete:", e);
        }
      } else {
        console.error("Delete failed:", resp.message);
        // show API message and close delete confirm
        toast.error(resp.message || "Xóa thất bại");
        setShowDeleteCategoryConfirm(false);
      }
    } catch (err) {
      console.error("Error deleting category:", err);
      // @ts-ignore
      const apiMessage = err?.response?.data?.message || (err && err.message);
      toast.error(apiMessage || "Lỗi khi xóa thể loại");
      setShowDeleteCategoryConfirm(false);
    }
  };

  const handleUpdateClub = async () => {
    if (!editingClub) return;
    // client-side validation: clubName and clubCode must not be empty
    setEditFieldErrors({});
    const errors: Record<string, string> = {};
    if (!editingClub.clubName || !editingClub.clubName.trim()) {
      errors.clubName = "Tên câu lạc bộ không được để trống";
    }
    if (!editingClub.clubCode || !editingClub.clubCode.trim()) {
      errors.clubCode = "Mã câu lạc bộ không được để trống";
    }
    if (Object.keys(errors).length > 0) {
      setEditFieldErrors(errors);
      toast.error("Vui lòng sửa các lỗi trong biểu mẫu");
      return;
    }

    try {
      const updateData: UpdateClubRequest = {
        clubName: editingClub.clubName,
        clubCode: editingClub.clubCode,
        description: editingClub.description,
        status: editingClub.status,
        campusId: editingClub.campusId,
        categoryId: editingClub.categoryId,
      };
      await updateStaffClub(editingClub.id, updateData);
      toast.success("Cập nhật câu lạc bộ thành công");
      setEditingClub(null);
      setShowEditDialog(false);
      setSelectedClub(null);
      setShowViewDialog(false);
      await fetchClubs(); // Refresh list (show skeleton)
    } catch (error: any) {
      console.error("Error updating club:", error);
      // Extract error message from various possible error structures
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể cập nhật câu lạc bộ";
      toast.error(errorMessage);
    }
  };

  const handleDeactivateClub = async (clubId: number) => {
    try {
      await deActiveStaffClub(clubId);
      toast.success("Đã chuyển câu lạc bộ sang trạng thái không hoạt động");
      setShowDeleteConfirm(false);
      setSelectedClub(null);
      setShowViewDialog(false);
      await fetchClubs(); // Refresh list (show skeleton)
    } catch (error: any) {
      console.error("Error deactivating club:", error);
      // Extract error message from various possible error structures
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể thay đổi trạng thái câu lạc bộ";
      toast.error(errorMessage);
    }
  };

  const handleActivateClub = async (clubId: number) => {
    try {
      await activateStaffClub(clubId);
      toast.success("Đã chuyển câu lạc bộ sang trạng thái hoạt động");
      setShowActivateConfirm(false);
      setSelectedClub(null);
      setShowViewDialog(false);
      await fetchClubs(); // Refresh list (show skeleton)
    } catch (error: any) {
      console.error("Error activating club:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể thay đổi trạng thái câu lạc bộ";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              Quản lý Câu Lạc Bộ
            </h1>
          </div>
          <p className="text-muted-foreground">
            Quản lý tất cả câu lạc bộ tại trường
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all-clubs">Tất cả câu lạc bộ</TabsTrigger>
            <TabsTrigger value="categories">Thể loại câu lạc bộ</TabsTrigger>
          </TabsList>

          {/* All Clubs Tab */}
          <TabsContent value="all-clubs" className="space-y-4">
            <div className="space-y-4 mb-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Tìm câu lạc bộ theo tên hoặc mã..."
                    value={searchInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSearchInput(v);
                      // debounce updating the effective searchTerm
                      if (mainSearchDebounceRef.current) {
                        window.clearTimeout(mainSearchDebounceRef.current);
                      }
                      mainSearchDebounceRef.current = window.setTimeout(() => {
                        setSearchTerm(v);
                        setPage(1);
                        mainSearchDebounceRef.current = null;
                      }, 300);
                    }}
                    onBlur={() => {
                      // apply immediately on blur
                      if (mainSearchDebounceRef.current) {
                        window.clearTimeout(mainSearchDebounceRef.current);
                        mainSearchDebounceRef.current = null;
                      }
                      setSearchTerm(searchInput);
                      setPage(1);
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e as React.KeyboardEvent<HTMLInputElement>).key ===
                        "Enter"
                      ) {
                        if (mainSearchDebounceRef.current) {
                          window.clearTimeout(mainSearchDebounceRef.current);
                          mainSearchDebounceRef.current = null;
                        }
                        setSearchTerm(searchInput);
                        setPage(1);
                      }
                    }}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={selectedCategory?.toString() || "all"}
                  onValueChange={(value) => {
                    setSelectedCategory(
                      value === "all" ? undefined : Number(value)
                    );
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Chọn thể loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả thể loại</SelectItem>
                    {clubCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedStatus || "all"}
                  onValueChange={(value) => {
                    setSelectedStatus(value === "all" ? undefined : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                    <SelectItem value="UNACTIVE">Không hoạt động</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog
                  open={showCreateClubDialog}
                  onOpenChange={(open) => {
                    setShowCreateClubDialog(open);
                    if (open) {
                      void loadClubCategories();
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Tạo câu lạc bộ mới
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Tạo câu lạc bộ mới</DialogTitle>
                      <DialogDescription>
                        Nhập thông tin để tạo câu lạc bộ mới
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-name">Tên câu lạc bộ *</Label>
                          <Input
                            id="new-name"
                            value={newClubData.clubName}
                            onChange={(e) =>
                              setNewClubData({
                                ...newClubData,
                                clubName: e.target.value,
                              })
                            }
                            placeholder="VD: CLB Lập trình"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-code">Mã câu lạc bộ *</Label>
                          <Input
                            id="new-code"
                            value={newClubData.clubCode}
                            onChange={(e) =>
                              setNewClubData({
                                ...newClubData,
                                clubCode: e.target.value,
                              })
                            }
                            placeholder="VD: CLB_IT"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-category">Thể loại *</Label>
                          <Select
                            value={
                              newClubData.categoryId > 0
                                ? newClubData.categoryId.toString()
                                : ""
                            }
                            onValueChange={(value) =>
                              setNewClubData({
                                ...newClubData,
                                categoryId: Number(value),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn thể loại" />
                            </SelectTrigger>
                            <SelectContent>
                              {clubCategories.map((cat) => (
                                <SelectItem
                                  key={cat.id}
                                  value={cat.id.toString()}
                                >
                                  {cat.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-description">Mô tả</Label>
                        <Textarea
                          id="new-description"
                          value={newClubData.description}
                          onChange={(e) =>
                            setNewClubData({
                              ...newClubData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Mô tả về câu lạc bộ"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-president-email">
                          Email chủ tịch *
                        </Label>
                        <Input
                          id="new-president-email"
                          value={newClubData.presidentEmail}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewClubData({
                              ...newClubData,
                              presidentEmail: val,
                            });
                            // live-validate email format
                            if (val && !isValidEmail(val)) {
                              setNewClubEmailError("Email không hợp lệ");
                            } else {
                              setNewClubEmailError(null);
                            }
                          }}
                          type="email"
                          placeholder="president@fpt.edu.vn"
                        />
                        <p className="text-sm text-muted-foreground">
                          Hãy điền email có tồn tại trong hệ thống FAP
                        </p>
                        {newClubEmailError && (
                          <p className="text-sm text-red-600 mt-1">
                            {newClubEmailError}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setShowCreateClubConfirm(true)}
                          className="flex-1"
                          disabled={loading}
                        >
                          Tạo câu lạc bộ
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowCreateClubDialog(false)}
                          className="flex-1"
                        >
                          Hủy
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Deactivate club confirmation dialog */}
                <Dialog
                  open={showDeleteConfirm}
                  onOpenChange={setShowDeleteConfirm}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Xác nhận dừng hoạt động câu lạc bộ
                      </DialogTitle>
                      <DialogDescription>
                        Bạn có chắc muốn chuyển câu lạc bộ "
                        {selectedClub?.clubName}" sang trạng thái không hoạt
                        động?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <div className="flex gap-2 w-full">
                        <Button
                          className="flex-1"
                          onClick={() => {
                            if (selectedClub)
                              void handleDeactivateClub(selectedClub.id);
                          }}
                        >
                          Dừng hoạt động
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Hủy
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Activate club confirmation dialog */}
                <Dialog
                  open={showActivateConfirm}
                  onOpenChange={setShowActivateConfirm}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Chuyển câu lạc bộ sang hoạt động
                      </DialogTitle>
                      <DialogDescription>
                        Bạn có chắc muốn chuyển câu lạc bộ "
                        {selectedClub?.clubName}" sang trạng thái hoạt động?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <div className="flex gap-2 w-full">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            if (selectedClub)
                              void handleActivateClub(selectedClub.id);
                          }}
                          disabled={loading}
                        >
                          Chuyển sang hoạt động
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowActivateConfirm(false)}
                        >
                          Hủy
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Activate club confirmation dialog */}
                <Dialog
                  open={showActivateConfirm}
                  onOpenChange={setShowActivateConfirm}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Chuyển câu lạc bộ sang hoạt động
                      </DialogTitle>
                      <DialogDescription>
                        Bạn có chắc muốn chuyển câu lạc bộ "
                        {selectedClub?.clubName}" sang trạng thái hoạt động?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <div className="flex gap-2 w-full">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            if (selectedClub)
                              void handleActivateClub(selectedClub.id);
                          }}
                          disabled={loading}
                        >
                          Chuyển sang hoạt động
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowActivateConfirm(false)}
                        >
                          Hủy
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Update confirmation dialog */}
                <Dialog
                  open={showUpdateClubConfirm}
                  onOpenChange={setShowUpdateClubConfirm}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Xác nhận cập nhật câu lạc bộ</DialogTitle>
                      <DialogDescription>
                        Bạn có chắc muốn lưu thay đổi cho câu lạc bộ "
                        {editingClub?.clubName}"?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 w-full mt-4">
                      <Button
                        className="flex-1"
                        onClick={async () => {
                          setShowUpdateClubConfirm(false);
                          await handleUpdateClub();
                        }}
                      >
                        Xác nhận
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowUpdateClubConfirm(false)}
                      >
                        Hủy
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Danh sách câu lạc bộ</CardTitle>
                <CardDescription>
                  Tất cả câu lạc bộ tại trường ({totalElements})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên câu lạc bộ</TableHead>
                          <TableHead>Mã CLB</TableHead>
                          {/* <TableHead>Campus</TableHead> */}
                          <TableHead>Thể loại</TableHead>
                          <TableHead>Thành viên</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead className="text-right">
                            Hành động
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: pageSize }).map((_, index) => (
                          <TableRow key={`skeleton-${index}`}>
                            <TableCell>
                              <Skeleton className="h-5 w-48" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-32" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-24" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên câu lạc bộ</TableHead>
                            <TableHead>Mã CLB</TableHead>
                            {/* <TableHead>Campus</TableHead> */}
                            <TableHead>Thể loại</TableHead>
                            <TableHead>Thành viên</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">
                              Hành động
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clubs.length > 0 ? (
                            clubs.map((club) => (
                              <TableRow key={club.id}>
                                <TableCell className="font-medium">
                                  {club.clubName}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {club.clubCode}
                                  </Badge>
                                </TableCell>
                                {/* <TableCell>{club.campusName}</TableCell> */}
                                <TableCell>
                                  <Badge variant="outline">
                                    {club.categoryName}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {club.totalMembers}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(club.status)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Dialog
                                      open={
                                        showViewDialog &&
                                        selectedClub?.id === club.id
                                      }
                                      onOpenChange={(open) => {
                                        if (!open) {
                                          setShowViewDialog(false);
                                          setSelectedClub(null);
                                        }
                                      }}
                                    >
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={async () => {
                                            // Open dialog with the list item first, then fetch fresh details
                                            setSelectedClub(club);
                                            setShowViewDialog(true);
                                            try {
                                              setDetailLoading(true);
                                              const detail =
                                                await getStaffClubDetail(
                                                  club.id
                                                );
                                              setSelectedClub(detail);
                                            } catch (err: any) {
                                              console.error(
                                                "Error fetching club detail:",
                                                err
                                              );
                                              const msg =
                                                err?.response?.data?.message ||
                                                err?.message ||
                                                "Không thể tải chi tiết câu lạc bộ";
                                              toast.error(msg);
                                            } finally {
                                              setDetailLoading(false);
                                            }
                                          }}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                          <DialogTitle>
                                            {selectedClub?.clubName}
                                          </DialogTitle>
                                          <DialogDescription>
                                            {selectedClub?.description}
                                          </DialogDescription>
                                        </DialogHeader>
                                        {detailLoading ? (
                                          <div className="space-y-6">
                                            <div className="flex gap-4 items-start">
                                              <div>
                                                <Skeleton className="h-16 w-16 rounded-full" />
                                              </div>
                                              <div className="flex-1">
                                                <Skeleton className="h-6 w-3/4 mb-2" />
                                                <div className="flex gap-2">
                                                  <Skeleton className="h-6 w-24" />
                                                  <Skeleton className="h-6 w-32" />
                                                </div>
                                              </div>
                                            </div>

                                            <Separator />

                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Skeleton className="h-4 w-40 mb-3" />
                                                <div className="space-y-2">
                                                  <Skeleton className="h-4 w-32" />
                                                  <Skeleton className="h-4 w-28" />
                                                  <Skeleton className="h-4 w-20" />
                                                </div>
                                              </div>
                                              <div>
                                                <Skeleton className="h-4 w-24 mb-3" />
                                                <div className="space-y-2">
                                                  <Skeleton className="h-4 w-40" />
                                                  <Skeleton className="h-4 w-36" />
                                                </div>
                                              </div>
                                            </div>

                                            <Separator />

                                            <div>
                                              <Skeleton className="h-4 w-52 mb-3" />
                                              <div className="space-y-3">
                                                <div className="p-3 bg-muted rounded-lg">
                                                  <div className="flex items-center gap-2">
                                                    <Skeleton className="h-8 w-8 rounded-full" />
                                                    <div>
                                                      <Skeleton className="h-4 w-40 mb-2" />
                                                      <Skeleton className="h-4 w-32" />
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            <Separator />

                                            <div className="flex gap-2">
                                              <Skeleton className="h-10 w-full" />
                                              <Skeleton className="h-10 w-full" />
                                            </div>
                                          </div>
                                        ) : selectedClub ? (
                                          <div className="space-y-6">
                                            <div className="flex gap-4 items-start">
                                              <Avatar className="h-16 w-16">
                                                <AvatarImage
                                                  src={
                                                    selectedClub.logoUrl ||
                                                    "/placeholder.svg"
                                                  }
                                                />
                                                <AvatarFallback>
                                                  {selectedClub.clubName.charAt(
                                                    0
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1">
                                                <h3 className="font-semibold text-lg">
                                                  {selectedClub.clubName}
                                                </h3>
                                                <div className="flex gap-2 mt-2">
                                                  {getStatusBadge(
                                                    selectedClub.status
                                                  )}
                                                  <Badge variant="outline">
                                                    {selectedClub.categoryName}
                                                  </Badge>
                                                </div>
                                              </div>
                                            </div>

                                            <Separator />

                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <h4 className="font-medium mb-2 text-sm">
                                                  Thông tin chung
                                                </h4>
                                                <div className="space-y-2 text-sm">
                                                  {/* <div>
                                                    <span className="text-muted-foreground">
                                                      Campus:
                                                    </span>{" "}
                                                    {selectedClub.campusName}
                                                  </div> */}
                                                  <div>
                                                    <span className="text-muted-foreground">
                                                      Thành viên:
                                                    </span>{" "}
                                                    {selectedClub.totalMembers}
                                                  </div>
                                                  <div>
                                                    <span className="text-muted-foreground">
                                                      Sự kiện:
                                                    </span>{" "}
                                                    {selectedClub.totalEvents}
                                                  </div>
                                                  <div>
                                                    <span className="text-muted-foreground">
                                                      Bài viết:
                                                    </span>{" "}
                                                    {selectedClub.totalPosts}
                                                  </div>
                                                </div>
                                              </div>

                                              <div>
                                                <h4 className="font-medium mb-2 text-sm">
                                                  Liên hệ
                                                </h4>
                                                <div className="space-y-2 text-sm">
                                                  {selectedClub.email && (
                                                    <div className="flex items-center gap-2">
                                                      <Mail className="h-3 w-3 text-muted-foreground" />
                                                      <a
                                                        href={`mailto:${selectedClub.email}`}
                                                        className="text-primary hover:underline"
                                                      >
                                                        {selectedClub.email}
                                                      </a>
                                                    </div>
                                                  )}
                                                  {selectedClub.phone && (
                                                    <div className="flex items-center gap-2">
                                                      <Phone className="h-3 w-3 text-muted-foreground" />
                                                      <a
                                                        href={`tel:${selectedClub.phone}`}
                                                        className="text-primary hover:underline"
                                                      >
                                                        {selectedClub.phone}
                                                      </a>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            <Separator />

                                            <div>
                                              <h4 className="font-medium mb-3 text-sm">
                                                Chủ nhiệm câu lạc bộ
                                              </h4>
                                              {selectedClub.presidents &&
                                              selectedClub.presidents.length >
                                                0 ? (
                                                <div className="space-y-3">
                                                  {selectedClub.presidents.map(
                                                    (president, index) => (
                                                      <div
                                                        key={index}
                                                        className="p-3 bg-muted rounded-lg space-y-2 text-sm"
                                                      >
                                                        <div className="flex items-center gap-2">
                                                          {president.avatarUrl && (
                                                            <Avatar className="h-8 w-8">
                                                              <AvatarImage
                                                                src={
                                                                  president.avatarUrl
                                                                }
                                                              />
                                                              <AvatarFallback>
                                                                {president.fullName.charAt(
                                                                  0
                                                                )}
                                                              </AvatarFallback>
                                                            </Avatar>
                                                          )}
                                                          <div>
                                                            <div className="font-medium">
                                                              {
                                                                president.fullName
                                                              }
                                                            </div>
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                              <Mail className="h-3 w-3" />
                                                              <a
                                                                href={`mailto:${president.email}`}
                                                                className="text-primary hover:underline"
                                                              >
                                                                {
                                                                  president.email
                                                                }
                                                              </a>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                                                  Chưa có thông tin chủ nhiệm
                                                </div>
                                              )}
                                            </div>

                                            <Separator />

                                            <div className="flex gap-2">
                                              <Button
                                                onClick={() => {
                                                  setEditingClub(selectedClub);
                                                  setShowEditDialog(true);
                                                }}
                                                className="flex-1"
                                              >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Chỉnh sửa
                                              </Button>
                                              {selectedClub.status ===
                                              "UNACTIVE" ? (
                                                <Button
                                                  onClick={() =>
                                                    setShowActivateConfirm(true)
                                                  }
                                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                  <CheckCircle className="h-4 w-4 mr-2" />
                                                  Chuyển sang hoạt động
                                                </Button>
                                              ) : (
                                                <Button
                                                  variant="destructive"
                                                  onClick={() =>
                                                    setShowDeleteConfirm(true)
                                                  }
                                                  className="flex-1"
                                                >
                                                  Dừng hoạt động
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        ) : null}
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center py-8 text-muted-foreground"
                              >
                                Không tìm thấy câu lạc bộ
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-2 py-4">
                        <div className="text-sm text-muted-foreground">
                          Hiển thị{" "}
                          {clubs.length > 0 ? (page - 1) * pageSize + 1 : 0} -{" "}
                          {Math.min(page * pageSize, totalElements)} trong tổng
                          số {totalElements} câu lạc bộ
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            Trước
                          </Button>
                          <div className="flex items-center gap-1">
                            <span className="text-sm">
                              Trang {page} / {totalPages}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={page >= totalPages}
                          >
                            Sau
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm thể loại theo tên..."
                  value={categorySearchInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCategorySearchInput(v);
                    // debounce immediate search while typing
                    if (searchDebounceRef.current) {
                      window.clearTimeout(searchDebounceRef.current);
                    }
                    searchDebounceRef.current = window.setTimeout(() => {
                      handleCategorySearch(v);
                    }, 300);
                  }}
                  onBlur={() => {
                    if (searchDebounceRef.current) {
                      window.clearTimeout(searchDebounceRef.current);
                      searchDebounceRef.current = null;
                    }
                    handleCategorySearch(categorySearchInput);
                  }}
                  onKeyDown={(e) => {
                    if (
                      (e as React.KeyboardEvent<HTMLInputElement>).key ===
                      "Enter"
                    ) {
                      if (searchDebounceRef.current) {
                        window.clearTimeout(searchDebounceRef.current);
                        searchDebounceRef.current = null;
                      }
                      handleCategorySearch(categorySearchInput);
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Dialog
                open={showCreateCategoryDialog}
                onOpenChange={setShowCreateCategoryDialog}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Thêm thể loại mới
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tạo thể loại mới</DialogTitle>
                    <DialogDescription>
                      Nhập tên thể loại câu lạc bộ
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-name">Tên thể loại</Label>
                      <Input
                        id="category-name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="VD: Thể thao, Âm nhạc, ..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowCreateCategoryConfirm(true)}
                        className="flex-1"
                      >
                        Tạo thể loại
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateCategoryDialog(false)}
                        className="flex-1"
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {/* Activate club confirmation dialog */}
              <Dialog
                open={showActivateConfirm}
                onOpenChange={setShowActivateConfirm}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Chuyển câu lạc bộ sang hoạt động</DialogTitle>
                    <DialogDescription>
                      Bạn có chắc muốn chuyển câu lạc bộ "
                      {selectedClub?.clubName}" sang trạng thái hoạt động?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <div className="flex gap-2 w-full">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          if (selectedClub)
                            void handleActivateClub(selectedClub.id);
                        }}
                        disabled={loading}
                      >
                        Chuyển sang hoạt động
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowActivateConfirm(false)}
                      >
                        Hủy
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {/* Create confirmation dialog (moved to global dialogs) */}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Thể loại câu lạc bộ</CardTitle>
                <CardDescription>
                  Danh sách các thể loại câu lạc bộ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên thể loại</TableHead>
                        <TableHead>Số lượng câu lạc bộ</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoriesLoading ? (
                        Array.from({ length: categoryPageSize }).map((_, i) => (
                          <TableRow key={`cat-skel-${i}`}>
                            <TableCell>
                              <Skeleton className="h-5 w-48" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-20" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : categories.length > 0 ? (
                        categories.map((category) => {
                          return (
                            <TableRow key={category.id}>
                              <TableCell className="font-medium">
                                {category.name}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {category.clubs}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Dialog
                                    open={
                                      showEditCategoryDialog &&
                                      editingCategory?.id === category.id
                                    }
                                    onOpenChange={(open) => {
                                      if (open) {
                                        setEditingCategory({ ...category });
                                        setShowEditCategoryDialog(true);
                                      } else {
                                        setShowEditCategoryDialog(false);
                                      }
                                    }}
                                  >
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          setEditingCategory(category)
                                        }
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Chỉnh sửa thể loại
                                        </DialogTitle>
                                        <DialogDescription>
                                          Cập nhật tên thể loại câu lạc bộ
                                        </DialogDescription>
                                      </DialogHeader>
                                      {editingCategory && (
                                        <div className="space-y-4">
                                          <div className="space-y-2">
                                            <Label htmlFor="edit-category-name">
                                              Tên thể loại
                                            </Label>
                                            <Input
                                              id="edit-category-name"
                                              value={editingCategory.name}
                                              onChange={(e) =>
                                                setEditingCategory({
                                                  ...editingCategory,
                                                  name: e.target.value,
                                                })
                                              }
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              onClick={() =>
                                                setShowUpdateCategoryConfirm(
                                                  true
                                                )
                                              }
                                              className="flex-1"
                                            >
                                              Lưu thay đổi
                                            </Button>
                                            <Button
                                              variant="outline"
                                              onClick={() =>
                                                setShowEditCategoryDialog(false)
                                              }
                                              className="flex-1"
                                            >
                                              Hủy
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setDeletingCategoryId(category.id);
                                      setShowDeleteCategoryConfirm(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center py-8 text-muted-foreground"
                          >
                            Không có thể loại nào
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {categoryTotalPages > 1 && (
                  <div className="flex items-center justify-between px-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      Hiển thị{" "}
                      {categories.length > 0
                        ? (categoryPage - 1) * categoryPageSize + 1
                        : 0}{" "}
                      -{" "}
                      {Math.min(
                        categoryPage * categoryPageSize,
                        categoryTotalElements
                      )}{" "}
                      trong tổng số {categoryTotalElements} thể loại
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCategoryPageChange(categoryPage - 1)
                        }
                        disabled={categoryPage === 1}
                      >
                        Trước
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.min(5, categoryTotalPages) },
                          (_, i) => {
                            let pageNum;
                            if (categoryTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (categoryPage < 4) {
                              pageNum = i + 1;
                            } else if (categoryPage > categoryTotalPages - 3) {
                              pageNum = categoryTotalPages - 4 + i;
                            } else {
                              pageNum = categoryPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  categoryPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  handleCategoryPageChange(pageNum)
                                }
                                className="w-9"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCategoryPageChange(categoryPage + 1)
                        }
                        disabled={categoryPage >= categoryTotalPages}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Category Confirmation Dialogs - Outside Tabs */}
      <Dialog
        open={showCreateCategoryConfirm}
        onOpenChange={setShowCreateCategoryConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận tạo thể loại</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn tạo thể loại "{newCategoryName}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex gap-2 w-full">
              <Button
                className="flex-1"
                onClick={() => void handleCreateCategory()}
              >
                Xác nhận
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateCategoryConfirm(false)}
              >
                Hủy
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Club Confirmation Dialog - global so it shows regardless of active tab */}
      <Dialog
        open={showCreateClubConfirm}
        onOpenChange={setShowCreateClubConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận tạo câu lạc bộ</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn tạo câu lạc bộ "{newClubData.clubName}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex gap-2 w-full mt-4">
              <Button
                className="flex-1"
                onClick={async () => {
                  setShowCreateClubConfirm(false);
                  await handleCreateClub();
                }}
              >
                Xác nhận
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateClubConfirm(false)}
              >
                Hủy
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUpdateCategoryConfirm}
        onOpenChange={setShowUpdateCategoryConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận cập nhật thể loại</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn cập nhật thể loại "{editingCategory?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex gap-2 w-full">
              <Button
                className="flex-1"
                onClick={() => void handleUpdateCategory()}
              >
                Xác nhận
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowUpdateCategoryConfirm(false)}
              >
                Hủy
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeleteCategoryConfirm}
        onOpenChange={setShowDeleteCategoryConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa thể loại</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa thể loại "
              {categories.find((c) => c.id === deletingCategoryId)?.name}"? Hành
              động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex gap-2 w-full">
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => {
                  if (deletingCategoryId)
                    handleDeleteCategory(deletingCategoryId);
                }}
              >
                Xóa
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteCategoryConfirm(false)}
              >
                Hủy
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin câu lạc bộ</DialogTitle>
            <DialogDescription>Cập nhật thông tin câu lạc bộ</DialogDescription>
          </DialogHeader>
          {editingClub && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Tên câu lạc bộ</Label>
                  <Input
                    id="edit-name"
                    value={editingClub.clubName}
                    onChange={(e) =>
                      setEditingClub({
                        ...editingClub,
                        clubName: e.target.value,
                      })
                    }
                  />
                  {editFieldErrors.clubName && (
                    <p className="text-xs text-destructive mt-1">
                      {editFieldErrors.clubName}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-code">Mã câu lạc bộ *</Label>
                  <Input
                    id="new-code"
                    value={editingClub.clubCode}
                    onChange={(e) =>
                      setEditingClub({
                        ...editingClub,
                        clubCode: e.target.value,
                      })
                    }
                    placeholder="VD: CLB_IT"
                  />
                  {editFieldErrors.clubCode && (
                    <p className="text-xs text-destructive mt-1">
                      {editFieldErrors.clubCode}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Thể loại *</Label>
                  <Select
                    value={
                      editingClub.categoryId && editingClub.categoryId > 0
                        ? editingClub.categoryId.toString()
                        : ""
                    }
                    onValueChange={(value) =>
                      setEditingClub({
                        ...editingClub,
                        categoryId: Number(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Chọn thể loại" />
                    </SelectTrigger>
                    <SelectContent>
                      {clubCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Mô tả</Label>
                <Textarea
                  id="edit-description"
                  value={editingClub.description}
                  onChange={(e) =>
                    setEditingClub({
                      ...editingClub,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowUpdateClubConfirm(true)}
                  className="flex-1"
                >
                  Lưu thay đổi
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
