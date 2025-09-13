export default function StatCard({ label, value, hint }) {
  return (
    <div style={{
      padding: 16, border: '1px solid #e5e7eb', borderRadius: 12,
      background: '#fff', display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
    }}>
      <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .5 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: '#6b7280' }}>{hint}</div> : null}
    </div>
  );
}
