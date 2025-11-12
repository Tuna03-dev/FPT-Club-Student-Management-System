import React from "react";

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

const base: React.CSSProperties = {
  background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.04) 100%)",
  backgroundColor: "#eaeaea",
  borderRadius: 4,
  display: "inline-block",
  overflow: "hidden",
};

export default function Skeleton({ width = "100%", height = 12, circle = false, style, className }: SkeletonProps) {
  const s: React.CSSProperties = {
    ...base,
    width,
    height: circle ? (typeof width === "number" ? width : 32) : height,
    borderRadius: circle ? "50%" : base.borderRadius,
    ...style,
  };

  return <span className={className} style={s} aria-hidden />;
}

export function SkeletonRow({ columns }: { columns: Array<{ width?: string | number; height?: number }>; }) {
  return (
    <tr>
      {columns.map((c, i) => (
        <td key={i} style={{ padding: 12, border: "1px solid #ddd", verticalAlign: "top" }}>
          <Skeleton width={c.width ?? "100%"} height={c.height ?? 12} />
        </td>
      ))}
    </tr>
  );
}