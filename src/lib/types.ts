import { Theme, Status } from "@/generated/prisma";

export type Candidate = {
  id: string;
  ticker: string;
  dateScanned: string;
  theme: Theme;
  triggerReason: string;
  status: Status;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
