export default function ProductVisual({ kind = 'cleaner', accent = '#f4c300', large = false }: { kind?: string; accent?: string; large?: boolean }) {
  return <div className={`productVisual ${large ? 'large' : ''}`} aria-label="Produktbild placeholder">
    <div className="machineBody" style={{ ['--machine-accent' as string]: accent }}>
      <span className="machineTop" />
      <span className="machineAccent" />
      <span className="machineWheel w1" /><span className="machineWheel w2" />
      {kind === 'saw' && <span className="sawBlade" />}
    </div>
  </div>;
}
