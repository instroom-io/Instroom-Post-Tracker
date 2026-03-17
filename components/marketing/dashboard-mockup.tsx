'use client'

import { motion } from 'framer-motion'

const stats = [
  { value: '847', label: 'Posts Detected' },
  { value: '94%', label: 'Downloaded' },
  { value: '\u20AC124,500', label: 'EMV' },
  { value: '12', label: 'Campaigns Active' },
]

const posts = [
  { platform: 'bg-platform-instagram', name: '@emma.beauty', handle: 'Story \u00B7 Glow Serum' },
  { platform: 'bg-platform-tiktok', name: '@jake.fits', handle: 'Reel \u00B7 Summer Drop' },
  { platform: 'bg-platform-youtube', name: '@lisavlogs', handle: 'Short \u00B7 Skincare AM' },
]

const sidebarItems = [
  { active: false },
  { active: true },
  { active: false },
  { active: false },
  { active: false },
]

export function DashboardMockup() {
  return (
    <div style={{ perspective: 1200 }}>
      <motion.div
        style={{ rotateX: 12, rotateY: -8 }}
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        className="shadow-[0_60px_120px_rgba(15,107,62,0.4)]"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-brand/20 border-t-2 border-t-brand/60 rounded-[20px] overflow-hidden w-full max-w-[420px]">
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border-b border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            <span className="ml-3 text-white/20 text-[9px] tracking-wider">
              app.instroom.co
            </span>
          </div>

          <div className="flex">
            {/* Mini sidebar */}
            <div className="w-10 bg-white/5 border-r border-white/10 flex flex-col items-center gap-2 py-3">
              {sidebarItems.map((item, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-md ${
                    item.active ? 'bg-brand/20' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 p-3 space-y-3">
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-2">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-2"
                  >
                    <p className="text-white font-display font-bold text-sm leading-tight">
                      {stat.value}
                    </p>
                    <p className="text-white/40 text-[9px] uppercase tracking-wider mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mini posts table */}
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                {posts.map((post, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-2.5 py-1.5 ${
                      i !== posts.length - 1 ? 'border-b border-white/5' : ''
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${post.platform}`}
                    />
                    <span className="text-white/60 text-[10px] font-medium truncate">
                      {post.name}
                    </span>
                    <span className="text-white/30 text-[10px] truncate">
                      {post.handle}
                    </span>
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
