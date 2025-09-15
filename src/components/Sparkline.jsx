import React from 'react';

/**
 * Sparkline simple con SVG.
 * props:
 *  - data: number[] (obligatorio)
 *  - width, height: tamaño del SVG
 *  - strokeWidth: grosor de línea
 *  - showPoints: boolean
 *  - formatter: (n:number)=>string (para tooltip via title)
 */
export default function Sparkline({
  data = [],
  width = 320,
  height = 64,
  strokeWidth = 2,
  showPoints = true,
  formatter = (n)=>String(n)
}) {
  if (!data.length) {
    return <div style={{color:'#6b7280', fontSize:12}}>(Sin datos)</div>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = 6;
  const W = width, H = height;
  const innerW = W - pad*2;
  const innerH = H - pad*2;

  const toX = (i) => pad + (i * (innerW / Math.max(1, data.length - 1)));
  const toY = (v) => {
    if (max === min) return pad + innerH/2;
    // invertimos Y (arriba = max)
    return pad + innerH - ((v - min) * innerH / (max - min));
  };

  const path = data.map((v,i)=>`${i===0?'M':'L'} ${toX(i)} ${toY(v)}`).join(' ');
  const points = showPoints
    ? data.map((v,i)=>(
        <circle key={i} cx={toX(i)} cy={toY(v)} r="2.5" />
      ))
    : null;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="sparkline">
      <title>{data.map(formatter).join(' · ')}</title>
      <rect x="0" y="0" width={W} height={H} fill="white" />
      <path d={path} fill="none" stroke="black" strokeWidth={strokeWidth} />
      <g fill="black">
        {points}
      </g>
    </svg>
  );
}
