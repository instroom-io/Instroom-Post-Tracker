import { z } from 'zod'
import { extractDriveFolderId } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Accepts full URLs or www. prefixed domains — auto-prepends https:// when needed */
const websiteUrl = z.string()
  .transform((v) => (v && /^www\./i.test(v) ? `https://${v}` : v))
  .pipe(z.string().url('Please enter a valid URL'))

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2).max(100).optional(),
  account_type: z.enum(['solo', 'team']).default('solo'),
  account_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be under 60 characters')
    .trim(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// ─── Upgrade ──────────────────────────────────────────────────────────────────

export const upgradeRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  account_name: z.string().min(2).max(100),
  message: z.string().max(1000).optional(),
})

export type UpgradeRequestInput = z.infer<typeof upgradeRequestSchema>

// ─── Onboarding ──────────────────────────────────────────────────────────────

export const onboardingAnswersSchema = z.object({
  referral_source: z.string().optional(),
  agency_size: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  main_challenge: z.string().optional(),
})

export type OnboardingAnswers = z.infer<typeof onboardingAnswersSchema>

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
  drive_folder_id: z.string().transform((val) => extractDriveFolderId(val)).optional(),
})

export const inviteMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['manager', 'viewer'], {
    required_error: 'Please select a role',
  }),
})

export const updateAssignedMemberSchema = z.object({
  userId: z.string().uuid().nullable(),
})
export type UpdateAssignedMemberInput = z.infer<typeof updateAssignedMemberSchema>

export const updateWorkspaceStorageFolderSchema = z.object({
  drive_folder_id: z.string().max(200).nullable().transform((v) => v ? extractDriveFolderId(v) : v),
})
export type UpdateWorkspaceStorageFolderInput = z.infer<typeof updateWorkspaceStorageFolderSchema>

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
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  tracking_configs: z.array(z.object({
    platform: z.enum(['instagram', 'tiktok', 'youtube']),
    hashtags: z.array(z.string().max(100)).default([]),
    mentions: z.array(z.string().max(100)).default([]),
  })).optional(),
}).refine(
  (data) => !data.end_date || new Date(data.end_date) >= new Date(data.start_date),
  { message: 'End date must be on or after start date', path: ['end_date'] }
)

export const updateCampaignSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  platforms: z.array(z.enum(['instagram', 'tiktok', 'youtube'])).min(1).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['draft', 'active', 'ended', 'archived']).optional(),
}).refine(
  (d) => !d.end_date || !d.start_date || new Date(d.end_date) >= new Date(d.start_date),
  { message: 'End date must be on or after start date', path: ['end_date'] }
)

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
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type TrackingConfigInput = z.infer<typeof trackingConfigSchema>
export type AddInfluencerInput = z.infer<typeof addInfluencerSchema>
export type UpdateInfluencerInput = z.infer<typeof updateInfluencerSchema>
export type UpdateEmvConfigInput = z.infer<typeof updateEmvConfigSchema>

export const contactInquirySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  company: z.string().min(1, 'Company is required').max(200, 'Company name is too long'),
  email: z.string().email('Invalid email address'),
  message: z.string().max(3000, 'Message is too long').optional(),
})
export type ContactInquiryInput = z.infer<typeof contactInquirySchema>

// ─── Agency ───────────────────────────────────────────────────────────────────

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

// ─── Account Settings ─────────────────────────────────────────────────────────

export const updatePreferencesSchema = z.object({
  preferred_language: z.string()
    .min(2, 'Language code must be at least 2 characters')
    .max(10, 'Language code must be under 10 characters'),
  timezone: z.string()
    .min(1, 'Timezone is required')
    .max(100, 'Timezone must be under 100 characters')
    .refine((tz) => {
      try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true }
      catch { return false }
    }, { message: 'Invalid timezone identifier' }),
})

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(80, 'Name must be 80 characters or fewer').trim(),
})

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
