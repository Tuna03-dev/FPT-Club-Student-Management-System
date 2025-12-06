import { z } from "zod";

/**
 * Zod schema for Income Transaction
 */
export const incomeTransactionSchema = z
  .object({
    amount: z.number().min(0.01, "Số tiền phải lớn hơn 0"),

    description: z
      .string()
      .min(1, "Mô tả không được để trống")
      .max(1000, "Mô tả không được vượt quá 1000 ký tự"),

    transactionDate: z.string().min(1, "Ngày giao dịch không được để trống"),

    source: z
      .string()
      .min(1, "Nguồn thu không được để trống")
      .max(200, "Nguồn thu không được vượt quá 200 ký tự"),

    notes: z.string().max(2000, "Ghi chú không được vượt quá 2000 ký tự").optional(),

    receiptUrl: z
      .string()
      .max(500, "URL biên lai không được vượt quá 500 ký tự")
      .optional()
      .or(z.literal("")),

    feeId: z.number().optional(),

    // userId - can be number or undefined, but must be > 0 when provided
    userId: z.number().optional(),
  })
  .refine((data) => data.userId !== undefined && data.userId > 0, {
    message: "Vui lòng chọn người đóng tiền",
    path: ["userId"],
  });

export type IncomeTransactionFormValues = z.infer<typeof incomeTransactionSchema>;

/**
 * Zod schema for Outcome Transaction
 */
export const outcomeTransactionSchema = z.object({
  amount: z.number().min(0.01, "Số tiền phải lớn hơn 0"),

  description: z
    .string()
    .min(1, "Mô tả không được để trống")
    .max(1000, "Mô tả không được vượt quá 1000 ký tú"),

  transactionDate: z.string().min(1, "Ngày giao dịch không được để trống"),

  recipient: z
    .string()
    .min(1, "Người nhận không được để trống")
    .max(200, "Người nhận không được vượt quá 200 ký tự"),

  purpose: z
    .string()
    .min(1, "Mục đích không được để trống")
    .max(200, "Mục đích không được vượt quá 200 ký tự"),

  notes: z.string().max(2000, "Ghi chú không được vượt quá 2000 ký tự").optional(),

  receiptUrl: z
    .string()
    .max(500, "URL biên lai không được vượt quá 500 ký tự")
    .optional()
    .or(z.literal("")),
});

export type OutcomeTransactionFormValues = z.infer<typeof outcomeTransactionSchema>;

