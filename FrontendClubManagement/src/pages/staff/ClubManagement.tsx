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
  Shield,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  president: string;
  presidentEmail: string;
  presidentPhone: string;
  memberCount: number;
  foundedYear: number;
  status: "forming" | "active" | "inactive" | "suspended";
  logo: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  lastActivityAt: string;
}

interface ClubCategory {
  id: string;
  clubs: number;
  name: string;
}

export function StaffClubsManagement() {
  const [activeTab, setActiveTab] = useState("all-clubs");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [showCreateClubDialog, setShowCreateClubDialog] = useState(false);
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] =
    useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClubCategory | null>(
    null
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [, setCategoriesLoading] = useState(false);
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
  const [newClubData, setNewClubData] = useState({
    name: "",
    description: "",
    category: "",
    president: "",
    presidentEmail: "",
    presidentPhone: "",
    email: "",
    phone: "",
    address: "",
    foundedYear: new Date().getFullYear(),
  });

  // Mock data
  const [clubs, setClubs] = useState<Club[]>([
    {
      id: "1",
      name: "CLB Lập trình",
      description:
        "Câu lạc bộ dành cho những sinh viên đam mê lập trình và công nghệ",
      category: "Công nghệ",
      president: "Nguyễn Văn A",
      presidentEmail: "a.nguyen@fpt.edu.vn",
      presidentPhone: "0901234567",
      memberCount: 85,
      foundedYear: 2020,
      status: "active",
      logo: "/club-logo.jpg",
      email: "programming.club@fpt.edu.vn",
      phone: "0243123456",
      address: "Phòng 301, Tầng 3, Toà A",
      createdAt: "2024-01-15",
      lastActivityAt: "2024-01-18",
    },
    {
      id: "2",
      name: "CLB Thiết kế",
      description:
        "Câu lạc bộ dành cho những sinh viên yêu thích thiết kế đồ họa và UI/UX",
      category: "Nghệ thuật",
      president: "Trần Thị B",
      presidentEmail: "b.tran@fpt.edu.vn",
      presidentPhone: "0912345678",
      memberCount: 45,
      foundedYear: 2021,
      status: "active",
      logo: "/club-logo.jpg",
      email: "design.club@fpt.edu.vn",
      phone: "0243123457",
      address: "Phòng 302, Tầng 3, Toà A",
      createdAt: "2024-01-16",
      lastActivityAt: "2024-01-17",
    },
    {
      id: "3",
      name: "CLB Kinh doanh",
      description: "Câu lạc bộ phát triển kỹ năng kinh doanh và tài chính",
      category: "Kinh doanh",
      president: "Lê Văn C",
      presidentEmail: "c.le@fpt.edu.vn",
      presidentPhone: "0923456789",
      memberCount: 32,
      foundedYear: 2022,
      status: "active",
      logo: "/club-logo.jpg",
      email: "business.club@fpt.edu.vn",
      phone: "0243123458",
      address: "Phòng 303, Tầng 3, Toà A",
      createdAt: "2024-01-17",
      lastActivityAt: "2024-01-10",
    },
    {
      id: "4",
      name: "CLB AI & Machine Learning",
      description: "Câu lạc bộ nghiên cứu trí tuệ nhân tạo và machine learning",
      category: "Công nghệ",
      president: "Phạm Minh D",
      presidentEmail: "d.pham@fpt.edu.vn",
      presidentPhone: "0934567890",
      memberCount: 28,
      foundedYear: 2023,
      status: "forming",
      logo: "/club-logo.jpg",
      email: "ai.club@fpt.edu.vn",
      phone: "0243123459",
      address: "Phòng 304, Tầng 3, Toà A",
      createdAt: "2024-01-18",
      lastActivityAt: "2024-01-18",
    },
  ]);

  const [categories, setCategories] = useState<ClubCategory[]>([]);

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

  const getStatusBadge = (status: Club["status"]) => {
    const configs: Record<
      Club["status"],
      { color: string; label: string; icon: any }
    > = {
      active: {
        color: "bg-green-100 text-green-800",
        label: "Hoạt động",
        icon: CheckCircle,
      },
      forming: {
        color: "bg-yellow-100 text-yellow-800",
        label: "Đang thành lập",
        icon: AlertCircle,
      },
      inactive: {
        color: "bg-gray-100 text-gray-800",
        label: "Không hoạt động",
        icon: AlertCircle,
      },
      suspended: {
        color: "bg-red-100 text-red-800",
        label: "Tạm dừng",
        icon: XCircle,
      },
    };
    const config = configs[status];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleCreateClub = () => {
    if (!newClubData.name || !newClubData.category || !newClubData.president)
      return;
    const newClub: Club = {
      id: Math.random().toString(),
      name: newClubData.name,
      description: newClubData.description,
      category: newClubData.category,
      president: newClubData.president,
      presidentEmail: newClubData.presidentEmail,
      presidentPhone: newClubData.presidentPhone,
      memberCount: 1,
      foundedYear: newClubData.foundedYear,
      status: "forming",
      logo: "/club-logo.jpg",
      email: newClubData.email,
      phone: newClubData.phone,
      address: newClubData.address,
      createdAt: new Date().toISOString().split("T")[0],
      lastActivityAt: new Date().toISOString().split("T")[0],
    };
    setClubs([...clubs, newClub]);
    setNewClubData({
      name: "",
      description: "",
      category: "",
      president: "",
      presidentEmail: "",
      presidentPhone: "",
      email: "",
      phone: "",
      address: "",
      foundedYear: new Date().getFullYear(),
    });
    setShowCreateClubDialog(false);
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

  const handleUpdateClub = () => {
    if (!editingClub) return;
    setClubs(clubs.map((c) => (c.id === editingClub.id ? editingClub : c)));
    setEditingClub(null);
    setShowEditDialog(false);
    setSelectedClub(null);
  };

  const handleDeleteClub = (clubId: string) => {
    setClubs(clubs.filter((c) => c.id !== clubId));
    setShowDeleteConfirm(false);
    setSelectedClub(null);
  };

  const filteredClubs = clubs.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.president.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
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
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm câu lạc bộ theo tên, lĩnh vực hoặc chủ tịch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog
                open={showCreateClubDialog}
                onOpenChange={setShowCreateClubDialog}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new-name">Tên câu lạc bộ *</Label>
                        <Input
                          id="new-name"
                          value={newClubData.name}
                          onChange={(e) =>
                            setNewClubData({
                              ...newClubData,
                              name: e.target.value,
                            })
                          }
                          placeholder="VD: CLB Lập trình"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-category">Thể loại *</Label>
                        <Select
                          value={newClubData.category}
                          onValueChange={(value) =>
                            setNewClubData({ ...newClubData, category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new-president">Chủ tịch *</Label>
                        <Input
                          id="new-president"
                          value={newClubData.president}
                          onChange={(e) =>
                            setNewClubData({
                              ...newClubData,
                              president: e.target.value,
                            })
                          }
                          placeholder="Tên chủ tịch"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-founded">Năm thành lập</Label>
                        <Input
                          id="new-founded"
                          type="number"
                          value={newClubData.foundedYear}
                          onChange={(e) =>
                            setNewClubData({
                              ...newClubData,
                              foundedYear: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new-president-email">
                          Email chủ tịch
                        </Label>
                        <Input
                          id="new-president-email"
                          value={newClubData.presidentEmail}
                          onChange={(e) =>
                            setNewClubData({
                              ...newClubData,
                              presidentEmail: e.target.value,
                            })
                          }
                          type="email"
                          placeholder="email@fpt.edu.vn"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-president-phone">
                          Điện thoại chủ tịch
                        </Label>
                        <Input
                          id="new-president-phone"
                          value={newClubData.presidentPhone}
                          onChange={(e) =>
                            setNewClubData({
                              ...newClubData,
                              presidentPhone: e.target.value,
                            })
                          }
                          placeholder="0901234567"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new-email">Email câu lạc bộ</Label>
                        <Input
                          id="new-email"
                          value={newClubData.email}
                          onChange={(e) =>
                            setNewClubData({
                              ...newClubData,
                              email: e.target.value,
                            })
                          }
                          type="email"
                          placeholder="club@fpt.edu.vn"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-phone">Điện thoại câu lạc bộ</Label>
                        <Input
                          id="new-phone"
                          value={newClubData.phone}
                          onChange={(e) =>
                            setNewClubData({
                              ...newClubData,
                              phone: e.target.value,
                            })
                          }
                          placeholder="0243123456"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="new-address">Địa chỉ</Label>
                      <Input
                        id="new-address"
                        value={newClubData.address}
                        onChange={(e) =>
                          setNewClubData({
                            ...newClubData,
                            address: e.target.value,
                          })
                        }
                        placeholder="Phòng 301, Tầng 3, Toà A"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleCreateClub} className="flex-1">
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
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Danh sách câu lạc bộ</CardTitle>
                <CardDescription>
                  Tất cả câu lạc bộ tại trường ({filteredClubs.length})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên câu lạc bộ</TableHead>
                        <TableHead>Thể loại</TableHead>
                        <TableHead>Chủ tịch</TableHead>
                        <TableHead>Thành viên</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Năm thành lập</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClubs.length > 0 ? (
                        filteredClubs.map((club) => (
                          <TableRow key={club.id}>
                            <TableCell className="font-medium">
                              {club.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{club.category}</Badge>
                            </TableCell>
                            <TableCell>{club.president}</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {club.memberCount}
                              </span>
                            </TableCell>
                            <TableCell>{getStatusBadge(club.status)}</TableCell>
                            <TableCell>{club.foundedYear}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedClub(club)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {selectedClub?.name}
                                      </DialogTitle>
                                      <DialogDescription>
                                        {selectedClub?.description}
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedClub && (
                                      <div className="space-y-6">
                                        <div className="flex gap-4 items-start">
                                          <Avatar className="h-16 w-16">
                                            <AvatarImage
                                              src={
                                                selectedClub.logo ||
                                                "/placeholder.svg"
                                              }
                                            />
                                            <AvatarFallback>
                                              {selectedClub.name.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1">
                                            <h3 className="font-semibold text-lg">
                                              {selectedClub.name}
                                            </h3>
                                            <div className="flex gap-2 mt-2">
                                              {getStatusBadge(
                                                selectedClub.status
                                              )}
                                              <Badge variant="outline">
                                                {selectedClub.category}
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
                                              <div>
                                                <span className="text-muted-foreground">
                                                  Thành lập:
                                                </span>{" "}
                                                {selectedClub.foundedYear}
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">
                                                  Thành viên:
                                                </span>{" "}
                                                {selectedClub.memberCount}
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">
                                                  Ngày tạo:
                                                </span>{" "}
                                                {selectedClub.createdAt}
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">
                                                  Hoạt động gần đây:
                                                </span>{" "}
                                                {selectedClub.lastActivityAt}
                                              </div>
                                            </div>
                                          </div>

                                          <div>
                                            <h4 className="font-medium mb-2 text-sm">
                                              Liên hệ
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                              <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 text-muted-foreground" />
                                                <a
                                                  href={`mailto:${selectedClub.email}`}
                                                  className="text-primary hover:underline"
                                                >
                                                  {selectedClub.email}
                                                </a>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                <a
                                                  href={`tel:${selectedClub.phone}`}
                                                  className="text-primary hover:underline"
                                                >
                                                  {selectedClub.phone}
                                                </a>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                                <span>
                                                  {selectedClub.address}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <Separator />

                                        <div>
                                          <h4 className="font-medium mb-3 text-sm">
                                            Thông tin chủ tịch
                                          </h4>
                                          <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                                            <div>
                                              <span className="text-muted-foreground">
                                                Tên:
                                              </span>{" "}
                                              {selectedClub.president}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Mail className="h-3 w-3 text-muted-foreground" />
                                              <a
                                                href={`mailto:${selectedClub.presidentEmail}`}
                                                className="text-primary hover:underline"
                                              >
                                                {selectedClub.presidentEmail}
                                              </a>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Phone className="h-3 w-3 text-muted-foreground" />
                                              <a
                                                href={`tel:${selectedClub.presidentPhone}`}
                                                className="text-primary hover:underline"
                                              >
                                                {selectedClub.presidentPhone}
                                              </a>
                                            </div>
                                          </div>
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
                                          <Button
                                            variant="destructive"
                                            onClick={() =>
                                              setShowDeleteConfirm(true)
                                            }
                                            className="flex-1"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Xóa
                                          </Button>
                                        </div>

                                        {showDeleteConfirm && (
                                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="font-medium text-red-800 mb-3">
                                              Xác nhận xóa câu lạc bộ?
                                            </p>
                                            <div className="flex gap-2">
                                              <Button
                                                variant="destructive"
                                                onClick={() =>
                                                  handleDeleteClub(
                                                    selectedClub.id
                                                  )
                                                }
                                                className="flex-1"
                                              >
                                                Xóa
                                              </Button>
                                              <Button
                                                variant="outline"
                                                onClick={() =>
                                                  setShowDeleteConfirm(false)
                                                }
                                                className="flex-1"
                                              >
                                                Hủy
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
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
                    <div>
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
                      {categories.length > 0 ? (
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
                                          <div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Tên câu lạc bộ</Label>
                  <Input
                    id="edit-name"
                    value={editingClub.name}
                    onChange={(e) =>
                      setEditingClub({ ...editingClub, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status">Trạng thái</Label>
                  <Select
                    value={editingClub.status}
                    onValueChange={(value) =>
                      setEditingClub({
                        ...editingClub,
                        status: value as Club["status"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forming">Đang thành lập</SelectItem>
                      <SelectItem value="active">Hoạt động</SelectItem>
                      <SelectItem value="inactive">Không hoạt động</SelectItem>
                      <SelectItem value="suspended">Tạm dừng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    value={editingClub.email}
                    onChange={(e) =>
                      setEditingClub({ ...editingClub, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Số điện thoại</Label>
                  <Input
                    id="edit-phone"
                    value={editingClub.phone}
                    onChange={(e) =>
                      setEditingClub({ ...editingClub, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpdateClub} className="flex-1">
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
