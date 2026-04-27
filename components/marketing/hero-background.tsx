export function HeroBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{ background: 'var(--hero-bg)' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--hero-dot-color) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
    </div>
  )
}
