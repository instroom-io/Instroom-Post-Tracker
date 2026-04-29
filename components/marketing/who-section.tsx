'use client'

import { useRef } from 'react'
import Image from 'next/image'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ─── animation variants ──────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const textContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

const textItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}

// clip-path wipe from bottom up
const imageRevealVariants = {
  hidden: { clipPath: 'inset(0 0 100% 0)' },
  visible: {
    clipPath: 'inset(0 0 0% 0)',
    transition: { duration: 0.9, ease: EASE },
  },
}

// counter-scale + hover (hover variant propagates from parent via whileHover="hover")
const imageScaleVariants = {
  hidden: { scale: 1.14 },
  visible: { scale: 1, transition: { duration: 0.9, ease: EASE } },
  hover: { scale: 1.04, transition: { duration: 0.7, ease: EASE } },
}

// portrait card entrance — slides up + staggers children
const cardVariants = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: EASE,
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
}

// ─── data ────────────────────────────────────────────────────────────────────

const brands = {
  label: 'Brands & eCommerce',
  title: 'The scaling eCommerce brand',
  description:
    "You're running influencer campaigns to grow your DTC brand. You can't afford to miss posts. And you need content you can actually run in paid ads.",
  bullets: [
    'Capture every influencer post automatically',
    'Build a UGC content library without the legwork',
    'Get campaign-ready creative in your Drive daily',
  ],
  imageSrc: '/who-brands.jpg',
  imageAlt: 'eCommerce brand product flatlay with influencer creative',
}

const agencies = {
  label: 'Agencies',
  title: 'The influencer marketing agency',
  description:
    'Manage every client brand from one login. Post Tracker handles the monitoring, downloading, and reporting. Your team stays focused on strategy, not admin.',
  bullets: [
    'All client brands in one login. No account switching.',
    'Deliver organized Drive libraries and post logs per brand',
    'Automated follow-ups when influencers miss their delivery window',
  ],
  imageSrc: '/who-agencies.jpg',
  imageAlt: 'Agency team reviewing influencer campaign performance',
}

const freelancers = {
  label: 'Freelancers',
  title: 'The ambitious freelancer',
  description:
    'You manage influencer campaigns for 2–5 clients and need to operate like an agency without the overhead. If your clients already have Post Tracker, request access.',
  bullets: [
    "Request access to clients' existing accounts in one click",
    'All brands accessible from your single login',
    'Impress clients with organized, professional deliverables',
  ],
  imageSrc: '/who-freelancers.jpg',
  imageAlt: 'Freelancer working independently on a laptop',
}

// ─── component ───────────────────────────────────────────────────────────────

export function WhoSection() {
  const shouldReduce = useReducedMotion()

  // parallax refs
  const brandsImgRef = useRef<HTMLDivElement>(null)
  const agenciesImgRef = useRef<HTMLDivElement>(null)
  const freelancersImgRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress: brandsSY } = useScroll({
    target: brandsImgRef,
    offset: ['start end', 'end start'],
  })
  const { scrollYProgress: agenciesSY } = useScroll({
    target: agenciesImgRef,
    offset: ['start end', 'end start'],
  })
  const { scrollYProgress: freelancersSY } = useScroll({
    target: freelancersImgRef,
    offset: ['start end', 'end start'],
  })

  const px: [string, string] = shouldReduce ? ['0%', '0%'] : ['8%', '-8%']
  const brandsParallax = useTransform(brandsSY, [0, 1], px)
  const agenciesParallax = useTransform(agenciesSY, [0, 1], px)
  const freelancersParallax = useTransform(freelancersSY, [0, 1], px)

  // collapse variants when reduced motion
  const rTextContainer = shouldReduce ? { hidden: {}, visible: {} } : textContainerVariants
  const rTextItem = shouldReduce ? { hidden: {}, visible: {} } : textItemVariants
  const rImageReveal = shouldReduce
    ? { hidden: {}, visible: {} }
    : imageRevealVariants
  const rImageScale = shouldReduce
    ? { hidden: {}, visible: {}, hover: {} }
    : imageScaleVariants
  const rCard = shouldReduce ? { hidden: {}, visible: {} } : cardVariants

  const hoverProp = shouldReduce ? undefined : ('hover' as const)

  return (
    <section className="bg-background-surface py-24">
      <div className="mx-auto max-w-[1060px] px-[5%]">

        {/* ── Section header ──────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={rTextContainer}
        >
          <motion.span
            variants={rTextItem}
            className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand"
          >
            Who it&apos;s for
          </motion.span>
          <motion.h2
            variants={rTextItem}
            className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground"
          >
            Built for everyone
            <br />
            managing influencer campaigns.
          </motion.h2>
          <motion.p
            variants={rTextItem}
            className="mt-3 max-w-[560px] text-[1rem] leading-[1.7] text-foreground-lighter"
          >
            Whether you&apos;re running one brand or twenty, Post Tracker works
            the way you do. Not the other way around.
          </motion.p>
        </motion.div>

        {/* ── Brands: full-width horizontal row ───────────────────────── */}
        <motion.div
          className="mt-16 grid grid-cols-1 items-stretch gap-12 rounded-[16px] border border-brand/20 bg-brand/[0.04] p-6 dark:border-brand/15 dark:bg-brand/[0.04] md:grid-cols-2 md:gap-16 md:p-10"
          initial="hidden"
          whileInView="visible"
          whileHover={hoverProp}
          viewport={{ once: true, amount: 0.25 }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
        >
          {/* text left */}
          <motion.div
            variants={rTextContainer}
            className="flex flex-col justify-center"
          >
            <motion.span
              variants={rTextItem}
              className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand"
            >
              {brands.label}
            </motion.span>
            <motion.h3
              variants={rTextItem}
              className="mt-2 font-display text-[clamp(1.3rem,2.4vw,1.75rem)] font-bold leading-[1.2] tracking-tight text-foreground"
            >
              {brands.title}
            </motion.h3>
            <motion.p
              variants={rTextItem}
              className="mt-3 max-w-[480px] text-[0.9rem] leading-relaxed text-foreground-lighter"
            >
              {brands.description}
            </motion.p>
            <motion.ul
              variants={rTextContainer}
              className="mt-6 space-y-2.5"
            >
              {brands.bullets.map((b) => (
                <motion.li
                  key={b}
                  variants={rTextItem}
                  className="flex items-start gap-2"
                >
                  <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-brand" />
                  <span className="text-[0.875rem] leading-snug text-foreground-lighter">
                    {b}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          {/* image right */}
          <motion.div
            ref={brandsImgRef}
            variants={rImageReveal}
            className="relative min-h-[360px] overflow-hidden rounded-[14px]"
          >
            <motion.div
              variants={rImageScale}
              style={{ y: brandsParallax }}
              className="absolute inset-0"
            >
              <Image
                src={brands.imageSrc}
                alt={brands.imageAlt}
                fill
                className="object-cover"
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* ── Portrait cards: Agencies + Freelancers ──────────────────── */}
        <motion.div
          className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
        >
          {/* Agencies — image top, text bottom */}
          <motion.div
            variants={rCard}
            whileHover={hoverProp}
            className="flex flex-col overflow-hidden rounded-[14px] border border-brand/20 bg-brand/[0.04] dark:border-brand/15 dark:bg-brand/[0.04] sm:h-[620px]"
          >
            <motion.div
              ref={agenciesImgRef}
              variants={rImageReveal}
              className="relative aspect-[4/3] overflow-hidden sm:aspect-auto sm:flex-1"
            >
              <motion.div
                variants={rImageScale}
                style={{ y: agenciesParallax }}
                className="absolute inset-0"
              >
                <Image
                  src={agencies.imageSrc}
                  alt={agencies.imageAlt}
                  fill
                  className="object-cover"
                />
              </motion.div>
            </motion.div>
            <motion.div
              variants={rTextContainer}
              className={cn(
                'flex flex-col justify-center p-8',
                'sm:flex-1',
              )}
            >
              <motion.span
                variants={rTextItem}
                className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand"
              >
                {agencies.label}
              </motion.span>
              <motion.h3
                variants={rTextItem}
                className="mt-2 font-display text-[1rem] font-bold leading-[1.2] tracking-tight text-foreground"
              >
                {agencies.title}
              </motion.h3>
              <motion.p
                variants={rTextItem}
                className="mt-2 text-[0.875rem] leading-relaxed text-foreground-lighter"
              >
                {agencies.description}
              </motion.p>
              <motion.ul variants={rTextContainer} className="mt-4 space-y-1.5">
                {agencies.bullets.map((b) => (
                  <motion.li
                    key={b}
                    variants={rTextItem}
                    className="flex items-start gap-2"
                  >
                    <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-brand" />
                    <span className="text-[0.84rem] leading-snug text-foreground-lighter">
                      {b}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </motion.div>

          {/* Freelancers — text top, image bottom */}
          <motion.div
            variants={rCard}
            whileHover={hoverProp}
            className="flex flex-col overflow-hidden rounded-[14px] border border-brand/20 bg-brand/[0.04] dark:border-brand/15 dark:bg-brand/[0.04] sm:h-[620px]"
          >
            <motion.div
              variants={rTextContainer}
              className={cn(
                'flex flex-col justify-center p-8',
                'sm:flex-1',
              )}
            >
              <motion.span
                variants={rTextItem}
                className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand"
              >
                {freelancers.label}
              </motion.span>
              <motion.h3
                variants={rTextItem}
                className="mt-2 font-display text-[1rem] font-bold leading-[1.2] tracking-tight text-foreground"
              >
                {freelancers.title}
              </motion.h3>
              <motion.p
                variants={rTextItem}
                className="mt-2 text-[0.875rem] leading-relaxed text-foreground-lighter"
              >
                {freelancers.description}
              </motion.p>
              <motion.ul variants={rTextContainer} className="mt-4 space-y-1.5">
                {freelancers.bullets.map((b) => (
                  <motion.li
                    key={b}
                    variants={rTextItem}
                    className="flex items-start gap-2"
                  >
                    <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-brand" />
                    <span className="text-[0.84rem] leading-snug text-foreground-lighter">
                      {b}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
            <motion.div
              ref={freelancersImgRef}
              variants={rImageReveal}
              className="relative aspect-[4/3] overflow-hidden sm:aspect-auto sm:flex-1"
            >
              <motion.div
                variants={rImageScale}
                style={{ y: freelancersParallax }}
                className="absolute inset-0"
              >
                <Image
                  src={freelancers.imageSrc}
                  alt={freelancers.imageAlt}
                  fill
                  className="object-cover"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}
