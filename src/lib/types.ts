import { Theme, Status } from "@prisma/client";

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
