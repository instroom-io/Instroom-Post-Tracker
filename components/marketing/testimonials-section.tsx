'use client'

import { motion, useReducedMotion } from 'framer-motion'

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
  const shouldReduce = useReducedMotion()

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduce ? 0 : 0.1 } },
  }
  const itemVariants = {
    hidden: shouldReduce ? {} : { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <section id="testimonials" className="relative py-20">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={itemVariants} className="mb-12">
            <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
              From the field
            </span>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground">
              Trusted by agencies who&apos;ve
              <br />
              outgrown spreadsheets.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={itemVariants}
                className="marketing-card p-7"
              >
                {/* Star rating */}
                <div className="mb-4 flex gap-0.5" aria-label="5 out of 5 stars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className="text-[1rem] leading-none text-[#F4B740]"
                    >
                      ★
                    </span>
                  ))}
                </div>

                <p className="mb-6 text-[0.9rem] leading-relaxed text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-[0.8rem] font-bold text-brand">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-[0.875rem] font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-[0.78rem] text-foreground-lighter">
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
