export default function Page() {
  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
        padding: '24px',
      }}
    >
      <div
        aria-label="Hyrbart"
        style={{
          display: 'flex',
          alignItems: 'baseline',
          fontFamily: 'var(--font-inter), Inter, sans-serif',
          fontSize: 'clamp(64px, 15vw, 132px)',
          fontWeight: 800,
          lineHeight: 0.9,
          letterSpacing: '-0.075em',
          color: '#111111',
        }}
      >
        <span style={{ position: 'relative', display: 'inline-block', letterSpacing: '-0.075em' }}>
          H
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '0.04em',
              right: '0.02em',
              bottom: '-0.13em',
              height: '0.075em',
              minHeight: '6px',
              borderRadius: '999px',
              background: '#ffcc00',
            }}
          />
        </span>
        <span>yrbart</span>
      </div>
    </div>
  );
}
