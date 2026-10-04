import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(1000),
  pinned: z.boolean().default(false),
});

export type AnnouncementInput = z.input<typeof announcementSchema>;
