import { z } from 'zod';

// Legacy responses omit pagination metadata even when more records exist.
export const PAGE_SCHEMA = z.union([
  z.object({
    data: z.array(z.unknown()),
    has_more: z.boolean().default(false),
    isLegacyArray: z.literal(false).default(false),
    next_starting_after: z.string().nullish(),
    page_trail: z.string().nullish(),
  }),
  z.array(z.unknown()).transform((data) => ({
    data,
    has_more: false,
    isLegacyArray: true,
    next_starting_after: null,
    page_trail: null,
  })),
]);

export const CURSOR_PAGE_SCHEMA = PAGE_SCHEMA.transform((page) => {
  if (!page.isLegacyArray || page.data.length === 0) return page;
  const last = z
    .object({ id: z.string().optional(), _id: z.string().optional() })
    .parse(page.data.at(-1));
  return {
    ...page,
    has_more: true,
    next_starting_after: z
      .string()
      .min(1)
      .parse(last.id ?? last._id),
  };
});
