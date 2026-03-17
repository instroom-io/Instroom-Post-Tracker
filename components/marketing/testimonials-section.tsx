'use client'

import { motion } from 'framer-motion'

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }
const itemVariants = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

const testimonials = [
  {
    name: 'Sophie V.',
    initials: 'SV',
    title: 'Head of Influencer',
    company: 'Agency Nord',
    quote:
      'We track 200+ influencer posts a month across 12 brand clients. Instroom made that possible without adding headcount.',
  },
  {
    name: 'Marcus T.',
    initials: 'MT',
    title: 'Founder',
    company: 'The Collab Studio',
    quote:
      'The usage rights gating alone saved us from a licensing dispute that would have cost us a major client.',
  },
  {
    name: 'Priya M.',
    initials: 'PM',
    title: 'Campaign Director',
    company: 'Bloom Agency',
    quote:
      "Our clients get a Google Drive link and a performance report. No more 'can you send me the content?' emails.",
  },
]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-5xl font-bold text-white">
              Trusted by agencies who&apos;ve outgrown spreadsheets
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={itemVariants}
                className="bg-white/5 backdrop-blur-xl border border-brand/20 rounded-[20px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <p className="text-white/70 text-sm leading-relaxed italic mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="bg-brand/20 text-brand rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{t.name}</p>
                    <p className="text-white/40 text-xs">
                      {t.title}, {t.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
