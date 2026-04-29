'use client'

import { motion, useReducedMotion } from 'framer-motion'

const navItems = [
  { label: 'Overview', active: true },
  { label: 'Campaigns', active: false },
  { label: 'Influencers', active: false },
  { label: 'Analytics', active: false },
  { label: 'Settings', active: false },
]

const stats = [
  { value: '847', label: 'Total Posts', color: '#1FAE5B' },
  { value: '824', label: 'Downloaded', color: '#5B6FE6' },
  { value: '€12.4k', label: 'EMV', color: '#F4B740' },
  { value: '6', label: 'Active', color: '#0EA5E9' },
]

const campaigns = [
  { name: 'Summer Glow', status: 'Active', posts: 14 },
  { name: 'Coastal Vibes', status: 'Active', posts: 8 },
  { name: 'Nordic Winter', status: 'Draft', posts: 0 },
]

const sparkBars = [4, 6, 5, 8, 7, 9, 11]

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
    <div className="relative select-none" style={{ width: 520, height: 450 }}>

      {/* ── Main app window ──────────────────────────────────────── */}
      <motion.div {...entry(0.2)} className="absolute left-0 top-4">
        <motion.div
          {...floatProps(7.5, 6, 1)}
          className="w-[420px] overflow-hidden rounded-[14px] border border-zinc-200/80 bg-white"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.05)' }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
            <span className="h-2 w-2 rounded-full bg-[#FFBD2E]" />
            <span className="h-2 w-2 rounded-full bg-[#28C840]" />
            <span className="mx-auto text-[8px] font-medium text-zinc-400">
              app.instroom.co/soleil-agency/overview
            </span>
          </div>

          <div className="flex" style={{ height: 305 }}>
            {/* Sidebar */}
            <div className="flex w-[104px] shrink-0 flex-col border-r border-zinc-100 bg-zinc-50/60 px-2 pt-3">
              {/* Logo area */}
              <div className="mb-3 flex items-center gap-1.5 px-1">
                <div className="h-4 w-4 rounded-[4px]" style={{ background: 'rgba(31,174,91,0.22)' }} />
                <span className="text-[7.5px] font-bold text-zinc-700 leading-tight">Soleil Agency</span>
              </div>

              {/* Nav items */}
              <div className="flex flex-col gap-0.5">
                {navItems.map((item) => (
                  <div
                    key={item.label}
                    className="relative flex items-center gap-1.5 rounded-md px-2 py-1"
                    style={item.active ? { background: 'rgba(31,174,91,0.09)' } : undefined}
                  >
                    {item.active && (
                      <span
                        className="absolute left-0 top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full"
                        style={{ background: '#1FAE5B' }}
                      />
                    )}
                    <div
                      className="h-2 w-2 shrink-0 rounded-[3px]"
                      style={
                        item.active
                          ? { background: 'rgba(31,174,91,0.45)' }
                          : { background: 'rgba(0,0,0,0.10)' }
                      }
                    />
                    <span
                      className="text-[7.5px] font-medium leading-none"
                      style={item.active ? { color: '#1FAE5B' } : { color: '#94a3b8' }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Take a tour */}
              <div className="mt-auto mb-2 px-0.5">
                <div
                  className="rounded-md px-2 py-1 text-center"
                  style={{
                    background: 'rgba(31,174,91,0.07)',
                    border: '1px solid rgba(31,174,91,0.18)',
                  }}
                >
                  <span className="text-[6.5px] font-semibold" style={{ color: '#1FAE5B' }}>
                    Take a tour
                  </span>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-hidden p-3">
              {/* Page header */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[7px] text-zinc-400">Good morning, Soleil ✦</p>
                  <p className="text-[10.5px] font-bold leading-tight text-zinc-800">Overview</p>
                </div>
                <div
                  className="rounded-md px-2 py-0.5"
                  style={{
                    background: 'rgba(31,174,91,0.09)',
                    border: '1px solid rgba(31,174,91,0.2)',
                  }}
                >
                  <span className="text-[6.5px] font-bold" style={{ color: '#1FAE5B' }}>
                    ↑ Live
                  </span>
                </div>
              </div>

              {/* 2×2 stat cards */}
              <div className="mb-3 grid grid-cols-2 gap-1.5">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="overflow-hidden rounded-[7px] border border-zinc-100 bg-white"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                  >
                    <div className="h-[3px] w-full" style={{ background: s.color }} />
                    <div className="px-2 py-1.5">
                      <p className="text-[11px] font-bold leading-tight text-zinc-800">{s.value}</p>
                      <p className="text-[6.5px] leading-tight text-zinc-400">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Campaigns table */}
              <div className="overflow-hidden rounded-[8px] border border-zinc-100">
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-2 py-1">
                  <span className="text-[7px] font-semibold uppercase tracking-wide text-zinc-400">
                    Campaigns
                  </span>
                  <span className="text-[6.5px] text-zinc-400">3 total</span>
                </div>
                {campaigns.map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 px-2 py-[5px] ${
                      i < campaigns.length - 1 ? 'border-b border-zinc-50' : ''
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: c.status === 'Active' ? '#1FAE5B' : '#D1D5DB' }}
                    />
                    <span className="flex-1 text-[8px] font-medium text-zinc-700">{c.name}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[6px] font-semibold"
                      style={
                        c.status === 'Active'
                          ? {
                              border: '1px solid rgba(31,174,91,0.3)',
                              color: '#1FAE5B',
                              background: 'rgba(31,174,91,0.07)',
                            }
                          : {
                              border: '1px solid rgba(0,0,0,0.10)',
                              color: '#94a3b8',
                              background: 'transparent',
                            }
                      }
                    >
                      {c.status}
                    </span>
                    <span className="text-[7px] text-zinc-400">{c.posts} posts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Satellite 1: Post detected (top right) ───────────────── */}
      <motion.div {...entry(0.5)} className="absolute right-0 top-0">
        <motion.div
          {...floatProps(5.5, 5, 2)}
          className="w-[196px] rounded-[11px] border border-zinc-200/80 bg-white px-3 py-2.5"
          style={{ boxShadow: '0 10px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-start gap-2">
            {/* Pulsing live dot */}
            <div className="relative mt-[3px] h-2 w-2 shrink-0">
              <span
                className="absolute inset-0 rounded-full"
                style={{ background: '#1FAE5B' }}
              />
              {!prefersReduced && (
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#1FAE5B' }}
                  animate={{ scale: [1, 2.4, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                />
              )}
            </div>
            <div>
              <p className="text-[8.5px] font-semibold leading-snug text-zinc-800">
                @coastal.glow posted
              </p>
              <p className="mt-0.5 text-[7px] text-zinc-400">Instagram Story · Summer Glow</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[7px] text-zinc-400">Just now</span>
            <span
              className="rounded px-1.5 py-0.5 text-[6.5px] font-semibold"
              style={{ background: 'rgba(168,85,247,0.10)', color: '#A855F7' }}
            >
              Instagram
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Satellite 2: Drive synced (bottom right) ──────────────── */}
      <motion.div {...entry(0.65)} className="absolute bottom-4 right-0">
        <motion.div
          {...floatProps(6.5, 4, 1.5)}
          className="flex w-[176px] items-center gap-2.5 rounded-[11px] border border-zinc-200/80 bg-white px-3 py-2"
          style={{ boxShadow: '0 10px 28px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)' }}
        >
          {/* Google Drive tricolor dots */}
          <div className="relative h-6 w-6 shrink-0">
            <span className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-[#4285F4]" />
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#EA4335]" />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-[#FBBC04]" />
          </div>
          <div>
            <p className="text-[8.5px] font-semibold text-zinc-800">6 files saved</p>
            <p className="text-[7px] leading-tight text-zinc-400">Google Drive · Summer Glow</p>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Satellite 3: EMV card (bottom left) ───────────────────── */}
      <motion.div {...entry(0.8)} className="absolute bottom-0 left-5">
        <motion.div
          {...floatProps(8, 6, 0.5)}
          className="w-[158px] rounded-[11px] border border-zinc-200/80 bg-white px-3 py-2.5"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <p className="text-[7px] font-semibold uppercase tracking-wide text-zinc-400">
            EMV This Month
          </p>
          <p className="mt-0.5 font-display text-[18px] font-bold leading-tight text-zinc-800">
            €12,400
          </p>
          {/* Mini sparkline */}
          <div className="mt-2 flex items-end gap-[2px]">
            {sparkBars.map((h, i) => (
              <div
                key={i}
                className="w-[10px] rounded-[2px]"
                style={{
                  height: `${h * 2}px`,
                  background:
                    i === sparkBars.length - 1
                      ? '#1FAE5B'
                      : 'rgba(31,174,91,0.22)',
                }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[8.5px] font-semibold" style={{ color: '#1FAE5B' }}>
              ↑ 18%
            </span>
            <span className="text-[7px] text-zinc-400">vs last month</span>
          </div>
        </motion.div>
      </motion.div>

    </div>
  )
}
