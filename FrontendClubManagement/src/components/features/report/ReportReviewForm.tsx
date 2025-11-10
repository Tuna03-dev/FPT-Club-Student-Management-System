"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle, XCircle } from "lucide-react"

interface Report {
  id: string
  title: string
  department: string
  submittedBy: string
  score?: number
  approvalNotes?: string
}

interface ReportReviewFormProps {
  report: Report
  onSubmit: (score: number, feedback: string, approve: boolean) => void
  isLoading?: boolean
  onCancel?: () => void
}

export function ReportReviewForm({ report, onSubmit, isLoading = false, onCancel }: ReportReviewFormProps) {
  const [score, setScore] = useState(report.score || 75)
  const [feedback, setFeedback] = useState(report.approvalNotes || "")
  const [action, setAction] = useState<"approve" | "reject" | null>(null)

  const handleApprove = () => {
    if (!feedback.trim()) {
      alert("Vui lòng nhập ghi chú trước khi phê duyệt")
      return
    }
    setAction("approve")
    onSubmit(score, feedback, true)
  }

  const handleReject = () => {
    if (!feedback.trim()) {
      alert("Vui lòng nhập lý do từ chối")
      return
    }
    setAction("reject")
    onSubmit(score, feedback, false)
  }

  const getScoreColor = (value: number) => {
    if (value >= 80) return "text-green-600"
    if (value >= 60) return "text-blue-600"
    if (value >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreLabel = (value: number) => {
    if (value >= 80) return "Xuất sắc"
    if (value >= 60) return "Tốt"
    if (value >= 40) return "Trung bình"
    return "Yếu"
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Report Info Summary */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Báo cáo</p>
              <p className="font-semibold text-foreground">{report.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Người nộp</p>
                <p className="font-medium">{report.submittedBy}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bộ phận</p>
                <p className="font-medium">{report.department}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scoring Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Xếp hạng báo cáo</CardTitle>
          <CardDescription>Đánh giá chất lượng báo cáo từ 0-100</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="score" className="font-medium">
                Điểm số
              </Label>
              <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score}
                <span className="text-sm text-muted-foreground ml-1">/100</span>
              </div>
            </div>

            <input
              id="score"
              type="range"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              disabled={isLoading}
            />

            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>0 (Yếu)</span>
              <span>50 (Trung bình)</span>
              <span>100 (Xuất sắc)</span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2">
              {[0, 40, 60, 80].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setScore(val === 0 ? 0 : val)}
                  className={`py-2 px-3 rounded border text-sm font-medium transition-colors ${
                    score >= val && score < val + 20
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:border-primary/50"
                  }`}
                  disabled={isLoading}
                >
                  {val === 0 ? "Yếu" : val === 40 ? "TB" : val === 60 ? "Tốt" : "Xuất sắc"}
                </button>
              ))}
            </div>

            <div
              className={`p-3 rounded-lg text-sm font-medium ${
                score >= 80
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : score >= 60
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : score >= 40
                      ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              Mức đánh giá: {getScoreLabel(score)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ghi chú & Phản hồi</CardTitle>
          <CardDescription>
            {action === "approve"
              ? "Cung cấp ghi chú phê duyệt hoặc đề xuất cải thiện"
              : action === "reject"
                ? "Giải thích lý do từ chối báo cáo"
                : "Nhập ý kiến chi tiết về báo cáo"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="feedback" className="font-medium">
              {action === "reject" ? "Lý do từ chối" : "Ghi chú"}
            </Label>
            <Textarea
              id="feedback"
              placeholder={
                action === "approve"
                  ? "VD: Báo cáo đầy đủ, có dữ liệu thống kê chi tiết, cần cải thiện phần phân tích..."
                  : action === "reject"
                    ? "VD: Báo cáo thiếu dữ liệu thống kê, không tuân theo template, cần gửi lại..."
                    : "Nhập ý kiến của bạn..."
              }
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={6}
              className="resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">{feedback.length} ký tự (tối thiểu 20 ký tự)</p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="bg-transparent">
          Hủy
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleReject}
          disabled={isLoading || feedback.length < 20}
          className="gap-2"
        >
          <XCircle className="h-4 w-4" />
          {action === "reject" && isLoading ? "Đang từ chối..." : "Từ chối"}
        </Button>
        <Button
          type="button"
          onClick={handleApprove}
          disabled={isLoading || feedback.length < 20}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          {action === "approve" && isLoading ? "Đang phê duyệt..." : "Phê duyệt"}
        </Button>
      </div>

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">Ghi chú khi đánh giá:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Đánh giá objective dựa trên nội dung và chất lượng báo cáo</li>
                <li>Cung cấp phản hồi xây dựng giúp tác giả cải thiện</li>
                <li>Nêu rõ lý do từ chối nếu báo cáo không đạt yêu cầu</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
