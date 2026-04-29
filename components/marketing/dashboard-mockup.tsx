'use client'

import { motion, useReducedMotion } from 'framer-motion'

const stats = [
  { value: '24', label: 'Posts' },
  { value: '22', label: 'Saved' },
  { value: '€12.4k', label: 'EMV' },
  { value: '8', label: 'Active' },
]

const posts = [
  { platform: 'instagram', handle: '@emma.creates', type: 'Story', saved: true },
  { platform: 'tiktok', handle: '@jakeofficial', type: 'Video', saved: false },
  { platform: 'instagram', handle: '@lily.beauty_', type: 'Reel', saved: true },
  { platform: 'youtube', handle: '@novastyle', type: 'Short', saved: false },
]

const platformColor: Record<string, string> = {
  instagram: '#A855F7',
  tiktok: '#3B82F6',
  youtube: '#EF4444',
}

const nav = [false, true, false, false, false]

export function DashboardMockup() {
  const prefersReduced = useReducedMotion()

  function entry(delay: number) {
    if (prefersReduced) return {}
    return {
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] as const },
    }
  }

  function floatProps(duration: number, yRange: number, delay: number) {
    if (prefersReduced) return {}
    return {
      animate: { y: [0, -yRange, 0] },
      transition: { repeat: Infinity, duration, ease: 'easeInOut' as const, delay },
    }
  }

  return (
    <div className="relative select-none" style={{ width: 490, height: 430 }}>

      {/* ── Main app window ─────────────────────────────────────── */}
      <motion.div {...entry(0.2)} className="absolute left-0 top-5">
        <motion.div
          {...floatProps(7, 7, 1)}
          className="w-[385px] overflow-hidden rounded-[14px] border border-zinc-200/80 bg-white"
          style={{ boxShadow: '0 20px 56px rgba(0,0,0,0.09), 0 4px 16px rgba(0,0,0,0.05)' }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
            <span className="h-2 w-2 rounded-full bg-[#FFBD2E]" />
            <span className="h-2 w-2 rounded-full bg-[#28C840]" />
            <span className="mx-auto text-[8.5px] font-medium text-zinc-400">
              app.instroom.co/summer-drop
            </span>
          </div>

          <div className="flex" style={{ height: 285 }}>
            {/* Sidebar */}
            <div className="flex w-8 shrink-0 flex-col items-center border-r border-zinc-100 bg-zinc-50/60 pt-2.5 gap-1.5">
              <div className="mb-1 h-4 w-4 rounded-md" style={{ background: 'rgba(31,174,91,0.18)' }} />
              {nav.map((active, i) => (
                <div
                  key={i}
                  className={`h-3.5 w-3.5 rounded-[4px]`}
                  style={active
                    ? { background: 'rgba(31,174,91,0.22)' }
                    : { background: 'rgba(0,0,0,0.07)' }
                  }
                />
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-2.5">
              {/* Page header */}
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[8px] leading-tight text-zinc-400">Campaigns</p>
                  <p className="text-[10.5px] font-bold leading-tight text-zinc-800">Summer Drop 2025</p>
                </div>
                <div
                  className="flex items-center rounded-md px-2 py-0.5"
                  style={{ background: 'rgba(31,174,91,0.12)' }}
                >
                  <span className="text-[7.5px] font-bold" style={{ color: '#1FAE5B' }}>Active</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="mb-2 grid grid-cols-4 gap-1">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-[6px] border border-zinc-100 bg-zinc-50/80 px-1.5 py-1">
                    <p className="text-[10.5px] font-bold leading-tight text-zinc-800">{s.value}</p>
                    <p className="text-[7px] leading-tight text-zinc-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Posts table */}
              <div className="overflow-hidden rounded-[8px] border border-zinc-100">
                <div className="border-b border-zinc-100 bg-zinc-50/80 px-2 py-1">
                  <span className="text-[7.5px] font-semibold uppercase tracking-wide text-zinc-400">Recent Posts</span>
                </div>
                {posts.map((post, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 px-2 py-[5px] ${i < posts.length - 1 ? 'border-b border-zinc-50' : ''}`}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: platformColor[post.platform] }}
                    />
                    <span className="w-[76px] truncate text-[8.5px] font-medium text-zinc-700">{post.handle}</span>
                    <span className="text-[7.5px] text-zinc-400">{post.type}</span>
                    <div className="ml-auto">
                      {post.saved ? (
                        <span
                          className="rounded px-1.5 py-0.5 text-[6.5px] font-bold"
                          style={{ background: 'rgba(31,174,91,0.1)', color: '#1FAE5B' }}
                        >
                          Saved
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[6.5px] font-bold text-zinc-400">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Satellite 1: Post detected (top right) ──────────────── */}
      <motion.div {...entry(0.5)} className="absolute right-0 top-0">
        <motion.div
          {...floatProps(5.5, 5, 2)}
          className="w-[188px] rounded-[11px] border border-zinc-200/80 bg-white px-3 py-2.5"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-start gap-2">
            <span
              className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: '#1FAE5B' }}
            />
            <div>
              <p className="text-[9px] font-semibold leading-snug text-zinc-800">@emma.creates posted</p>
              <p className="mt-0.5 text-[7.5px] text-zinc-400">Instagram Story · Summer Drop</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[7.5px] text-zinc-400">Just now</span>
            <span
              className="rounded px-1.5 py-0.5 text-[7px] font-semibold"
              style={{ background: 'rgba(168,85,247,0.1)', color: '#A855F7' }}
            >
              Instagram
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Satellite 2: Drive synced (bottom right) ─────────────── */}
      <motion.div {...entry(0.65)} className="absolute bottom-4 right-0">
        <motion.div
          {...floatProps(6.5, 4, 1.5)}
          className="flex w-[168px] items-center gap-2.5 rounded-[11px] border border-zinc-200/80 bg-white px-3 py-2"
          style={{ boxShadow: '0 10px 28px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)' }}
        >
          {/* Google Drive color indicator */}
          <div className="relative h-6 w-6 shrink-0">
            <span className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-[#4285F4]" />
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#EA4335]" />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-[#FBBC04]" />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-zinc-800">3 files synced</p>
            <p className="text-[7.5px] text-zinc-400">Google Drive</p>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Satellite 3: EMV card (bottom left) ──────────────────── */}
      <motion.div {...entry(0.8)} className="absolute bottom-0 left-5">
        <motion.div
          {...floatProps(8, 6, 0.5)}
          className="w-[150px] rounded-[11px] border border-zinc-200/80 bg-white px-3 py-2.5"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <p className="text-[7px] font-semibold uppercase tracking-wide text-zinc-400">EMV This Month</p>
          <p className="mt-0.5 font-display text-[18px] font-bold leading-tight text-zinc-800">€12,400</p>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[9px] font-semibold" style={{ color: '#1FAE5B' }}>↑ 18%</span>
            <span className="text-[8px] text-zinc-400">vs last month</span>
          </div>
        </motion.div>
      </motion.div>

    </div>
  )
}
