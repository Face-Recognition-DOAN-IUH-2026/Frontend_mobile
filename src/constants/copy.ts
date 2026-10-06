export const CONDITION_CODES = ["new", "good", "minor_damage", "major_damage", "lost"] as const;
export type CopyCondition = typeof CONDITION_CODES[number];

export const CONDITION_LABELS: Record<string, string> = {
  new: "Mới",
  good: "Bình thường",
  minor_damage: "Hư nhẹ",
  major_damage: "Hư nặng",
  lost: "Thất lạc",
};

export const COPY_STATUS_CODES = ["available", "borrowed", "maintenance", "disposed"] as const;
export type CopyStatus = typeof COPY_STATUS_CODES[number];

export const COPY_STATUS_LABELS: Record<string, string> = {
  available: "Sẵn sàng",
  borrowed: "Đang mượn",
  maintenance: "Bảo quản",
  disposed: "Loại bỏ",
};
