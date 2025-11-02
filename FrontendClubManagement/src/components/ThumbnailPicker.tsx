import { useRef, useState } from "react";
import { uploadImage } from "@/api/uploads";

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
};

export default function ThumbnailPicker({ value, onChange, label = "Thumbnail" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const res = await uploadImage(f);
      if (res.code !== 200 || !res.data) throw new Error(res.message || "Upload failed");
      onChange(res.data.url);
    } catch (err: any) {
      alert(err?.message || "Không upload được ảnh");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-start gap-3">
        <div className="w-40 aspect-video bg-gray-100 border rounded overflow-hidden flex items-center justify-center">
          {value ? <img src={value} alt="" className="object-cover w-full h-full" /> : <span className="text-xs text-gray-500">Chưa chọn</span>}
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onPick}
            className="px-3 py-2 rounded bg-gray-900 text-white disabled:opacity-50"
            disabled={uploading}
          >
            {uploading ? "Đang tải…" : "Chọn ảnh từ máy"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
          {value ? <div className="text-xs text-gray-500 break-all max-w-[360px]">{value}</div> : null}
        </div>
      </div>
    </div>
  );
}
