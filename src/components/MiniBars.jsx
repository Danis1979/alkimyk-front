import React from 'react';

/**
 * MiniBars - gráfico de barras compacto en SVG (sin librerías)
 * props:
 *  - values: number[]             // datos
 *  - labels?: string[]            // etiquetas (para <title/>)
 *  - height?: number = 64         // alto total del SVG
 *  - barWidth?: number = 14       // ancho de cada barra
 *  - gap?: number = 6             // separación entre barras
 *  - color?: string = '#2563eb'   // color de barras
 *  - bg?: string = 'transparent'  // fondo
 */
export default function MiniBars({
  values = [],
  labels = [],
  height = 64,
  barWidth = 14,
  gap = 6,
  color = '#2563eb',
  bg = 'transparent',
}) {
  const n = values.length;
  if (!n) return <div style={{color:'#6b7280', fontSize:12}}>(Sin datos)</div>;

  // Considerar 0 en la escala por si hay negativos
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;

  const pad = 6;
  const innerH = Math.max(height - pad*2, 10);
  const scaleY = innerH / range;

  const baselineY = pad + (max - 0) * scaleY;
  const w = n * barWidth + (n - 1) * gap;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} role="img" aria-label="Barras">
      {bg !== 'transparent' && <rect x="0" y="0" width={w} height={height} fill={bg} />}
      {/* línea de cero si hay valores por debajo */}
      {min < 0 && max > 0 && (
        <line x1="0" y1={baselineY} x2={w} y2={baselineY} stroke="#e5e7eb" strokeWidth="1" />
      )}
      {values.map((v, i) => {
        const x = i * (barWidth + gap);
        const isPos = v >= 0;
        const barH = Math.abs(v - 0) * scaleY;
        const y = isPos ? baselineY - barH : baselineY;
        const title = (labels[i] ?? `#${i+1}`) + ' — ' + String(v);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} rx="2" fill={color} />
            <title>{title}</title>
          </g>
        );
      })}
    </svg>
  );
}
