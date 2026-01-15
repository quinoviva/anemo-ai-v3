import { z } from 'zod';

export const ImageAnalysisReport = z.object({
  conjunctiva: z.string(),
  fingernails: z.string(),
  skin: z.string(),
  createdAt: z.any(), // Or use a more specific date schema
});
