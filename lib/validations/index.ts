import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
})

// ─── Workspace ────────────────────────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(60, 'Workspace name must be under 60 characters')
    .trim(),
})

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(60)
    .trim()
    .optional(),
  logo_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  drive_folder_id: z.string().optional(),
})

export const inviteMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'editor', 'viewer'], {
    required_error: 'Please select a role',
  }),
})

// ─── Brand Requests ──────────────────────────────────────────────────────────

export const inviteBrandSchema = z.object({
  brand_name: z.string().min(2, 'Brand name must be at least 2 characters').max(100).trim(),
  contact_email: z.string().email('Please enter a valid email address'),
})

export const acceptBrandInviteSchema = z.object({
  contact_name: z.string().min(2, 'Contact name must be at least 2 characters').max(100).trim(),
  website_url: z.string().url('Please enter a valid URL'),
  logo_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
})

export type InviteBrandInput = z.infer<typeof inviteBrandSchema>
export type AcceptBrandInviteInput = z.infer<typeof acceptBrandInviteSchema>

export const brandRequestSchema = z.object({
  brand_name: z.string().min(2, 'Brand name must be at least 2 characters').max(100).trim(),
  website_url: z.string().url('Please enter a valid URL'),
  logo_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  contact_name: z.string().min(2, 'Contact name must be at least 2 characters').max(100).trim(),
  contact_email: z.string().email('Please enter a valid email address'),
  description: z.string().max(500).optional().or(z.literal('')),
  agency_id: z.string().uuid().optional(),
})

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const createCampaignSchema = z.object({
  name: z
    .string()
    .min(2, 'Campaign name must be at least 2 characters')
    .max(100)
    .trim(),
  platforms: z
    .array(z.enum(['instagram', 'tiktok', 'youtube']))
    .min(1, 'Select at least one platform'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'End date must be on or after start date', path: ['end_date'] }
)

export const updateCampaignSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  platforms: z.array(z.enum(['instagram', 'tiktok', 'youtube'])).min(1).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['draft', 'active', 'ended']).optional(),
})

export const trackingConfigSchema = z.object({
  campaign_id: z.string().uuid(),
  platform: z.enum(['instagram', 'tiktok', 'youtube']),
  hashtags: z.array(z.string().max(100)).default([]),
  mentions: z.array(z.string().max(100)).default([]),
})

// ─── Influencers ──────────────────────────────────────────────────────────────

export const updateProductSentAtSchema = z.object({
  campaignInfluencerId: z.string().uuid(),
  productSentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})
export type UpdateProductSentAtInput = z.infer<typeof updateProductSentAtSchema>

export const addInfluencerSchema = z.object({
  ig_handle: z.string().max(100).optional().or(z.literal('')),
  tiktok_handle: z.string().max(100).optional().or(z.literal('')),
  youtube_handle: z.string().max(100).optional().or(z.literal('')),
}).refine(
  (data) =>
    data.ig_handle || data.tiktok_handle || data.youtube_handle,
  { message: 'At least one social handle is required' }
)

export const updateInfluencerSchema = z.object({
  ig_handle: z.string().max(100).optional().or(z.literal('')),
  tiktok_handle: z.string().max(100).optional().or(z.literal('')),
  youtube_handle: z.string().max(100).optional().or(z.literal('')),
})

// ─── Posts ────────────────────────────────────────────────────────────────────

export const updateCollabStatusSchema = z.object({
  post_id: z.string().uuid(),
  status: z.enum(['n/a', 'pending', 'confirmed', 'not_added']),
})

// ─── Analytics / EMV ─────────────────────────────────────────────────────────

export const updateEmvConfigSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube']),
  cpm_rate: z
    .number()
    .positive('CPM rate must be greater than 0')
    .max(1000, 'CPM rate must be under $1000'),
})

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type TrackingConfigInput = z.infer<typeof trackingConfigSchema>
export type AddInfluencerInput = z.infer<typeof addInfluencerSchema>
export type UpdateInfluencerInput = z.infer<typeof updateInfluencerSchema>
export type UpdateCollabStatusInput = z.infer<typeof updateCollabStatusSchema>
export type UpdateEmvConfigInput = z.infer<typeof updateEmvConfigSchema>
export type BrandRequestInput = z.infer<typeof brandRequestSchema>

export const contactInquirySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().min(1, 'Company is required'),
  email: z.string().email('Invalid email address'),
  message: z.string().optional(),
})
export type ContactInquiryInput = z.infer<typeof contactInquirySchema>

// ─── Agency ───────────────────────────────────────────────────────────────────

export const agencyRequestSchema = z.object({
  agency_name: z.string().min(2, 'Agency name must be at least 2 characters').max(100),
  website_url: z.string().url('Please enter a valid URL'),
  contact_name: z.string().min(2, 'Contact name must be at least 2 characters').max(100),
  contact_email: z.string().email('Please enter a valid email address'),
  description: z.string().max(500).optional(),
})

export type AgencyRequestInput = z.infer<typeof agencyRequestSchema>

const RESERVED_AGENCY_SLUGS = ['requests', 'admin', 'api', 'settings', 'login', 'signup']

export const agencySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens')
    .min(2)
    .max(60)
    .refine((s) => !RESERVED_AGENCY_SLUGS.includes(s), 'This slug is reserved'),
  logo_url: z.string().url().optional().or(z.literal('')),
})

export type AgencyInput = z.infer<typeof agencySchema>
