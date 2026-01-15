import { z } from 'zod';

export const CbcAnalysis = z.object({
  hemoglobin: z.string(),
  rbc: z.string(),
  createdAt: z.any(), // Or use a more specific date schema
});
