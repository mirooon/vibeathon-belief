/* Pane A — Unified price chart */
const { useState: useChartState, useRef: useChartRef, useEffect: useChartEffect } = React;

const TIMEFRAMES = ['1H','1D','1W','1M','All'];
const VENUE_LINES = [
  { id:'poly', name:'Polymarket', color:'#1E88FF', key:'poly' },
  { id:'kal',  name:'Kalshi',     color:'#4BD8B0', key:'kal'  },
  { id:'myr',  name:'Myriad',     color:'#B4B4BD', key:'myr'  },
];

function ChartPane() {
  const [outcome, setOutcome] = useChartState('france');
  const [tf, setTf] = useChartState('1W');
  const [overlays, setOverlays] = useChartState({ poly:false, kal:false, myr:false });
  const toggle = (k) => setOverlays(o => ({...o, [k]: !o[k]}));

  return (
    <section style={{
      background:'#0A0A0B', border:'1px solid #1A1A1D', borderRadius:24,
      padding:'20px 22px 22px', display:'flex', flexDirection:'column', gap:16,
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
          <span className="eyebrow">outcome</span>
          <OutcomeDropdown value={outcome} onChange={setOutcome}/>
        </div>
        <div style={{display:'flex', gap:18, alignItems:'center', flexWrap:'wrap'}}>
          <div style={{display:'flex', gap:12, alignItems:'center'}}>
            <span style={{fontSize:11, color:'#8A8A94', fontFamily:'var(--font-mono)'}}>overlay</span>
            {VENUE_LINES.map(v => (
              <VenueToggle key={v.id} v={v} on={overlays[v.key]} onClick={() => toggle(v.key)}/>
            ))}
          </div>
          <div style={{width:1, height:18, background:'#26262A'}}/>
          <div style={{display:'flex', gap:2, background:'#121214', border:'1px solid #1A1A1D', borderRadius:999, padding:3}}>
            {TIMEFRAMES.map(t => (
              <button key={t} onClick={() => setTf(t)} style={{
                background: tf===t ? '#1A1A1D' : 'transparent',
                color: tf===t ? '#F4F4F5' : '#8A8A94',
                border: tf===t ? '1px solid #26262A' : '1px solid transparent',
                borderRadius:999, padding:'4px 12px', fontSize:12, fontWeight:500,
                fontFamily:'inherit', cursor:'pointer',
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <ChartSVG overlays={overlays} tf={tf}/>
    </section>
  );
}

function OutcomeDropdown({value, onChange}) {
  const [open, setOpen] = useChartState(false);
  const current = MARKET.outcomes.find(o => o.id === value);
  return (
    <div style={{position:'relative'}}>
      <button onClick={() => setOpen(o=>!o)} style={{
        background:'#121214', border:'1px solid #26262A', borderRadius:10,
        padding:'7px 12px 7px 10px', color:'#F4F4F5', fontFamily:'inherit', fontSize:13,
        display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontWeight:500,
      }}>
        <FlagDot label={current.label}/>
        {current.label}
        <span style={{color:'#8A8A94', fontSize:10, marginLeft:2}}>▾</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, minWidth:220,
          background:'#121214', border:'1px solid #26262A', borderRadius:12,
          padding:4, zIndex:30,
          boxShadow:'0 12px 40px rgba(0,0,0,.45)',
        }}>
          {MARKET.outcomes.map(o => (
            <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }} style={{
              width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
              background: o.id===value ? '#1A1A1D' : 'transparent',
              border:0, color:'#F4F4F5', padding:'8px 10px', borderRadius:8,
              fontFamily:'inherit', fontSize:13, cursor:'pointer', gap:12,
            }}>
              <span style={{display:'flex', alignItems:'center', gap:10}}>
                <FlagDot label={o.label}/>
                {o.label}
              </span>
              <span style={{color:'#8A8A94', fontVariantNumeric:'tabular-nums', fontFamily:'var(--font-mono)', fontSize:12}}>
                ${o.yes.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FlagDot({label}) {
  // tiny tri-color chip per country
  const palettes = {
    France:    ['#0055A4','#FFFFFF','#EF4135'],
    Argentina: ['#75AADB','#FFFFFF','#75AADB'],
    Brazil:    ['#009C3B','#FFDF00','#002776'],
    Spain:     ['#AA151B','#F1BF00','#AA151B'],
    Field:     ['#3A3A40','#5A5A63','#8A8A94'],
  };
  const p = palettes[label] || palettes.Field;
  return (
    <span style={{
      width:16, height:11, borderRadius:2, overflow:'hidden',
      display:'inline-grid', gridTemplateColumns:'1fr 1fr 1fr',
      border:'1px solid rgba(255,255,255,.06)',
    }}>
      <span style={{background:p[0]}}/><span style={{background:p[1]}}/><span style={{background:p[2]}}/>
    </span>
  );
}

function VenueToggle({v, on, onClick}) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:7,
      background: on ? 'rgba(255,255,255,0.04)' : 'transparent',
      border: on ? `1px solid ${v.color}55` : '1px solid #26262A',
      borderRadius:999, padding:'4px 10px 4px 8px',
      color: on ? '#F4F4F5' : '#8A8A94',
      fontFamily:'inherit', fontSize:12, cursor:'pointer',
    }}>
      <span style={{
        width:10, height:2, background: on ? v.color : '#3A3A40',
        borderRadius:1, display:'inline-block',
      }}/>
      {v.name}
    </button>
  );
}

/* ---------- The SVG chart itself ---------- */

function ChartSVG({overlays, tf}) {
  const containerRef = useChartRef(null);
  const [w, setW] = useChartState(900);
  const h = 320;
  const padL = 52, padR = 64, padT = 16, padB = 28;

  useChartEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.floor(e.contentRect.width));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // slice by timeframe (mock — just take tail portion)
  const slicers = { '1H': 1, '1D': 24, '1W': 168, '1M': 168, 'All': 168 };
  const n = Math.min(slicers[tf], CHART.agg.length);
  const agg  = CHART.agg.slice(-n);
  const poly = CHART.poly.slice(-n);
  const kal  = CHART.kal.slice(-n);
  const myr  = CHART.myr.slice(-n);
  const times = CHART.times.slice(-n);

  const yMin = 0.38, yMax = 0.62;
  const chartW = Math.max(200, w - padL - padR);
  const chartH = h - padT - padB;
  const xOf = (i) => padL + (i / (n-1)) * chartW;
  const yOf = (v) => padT + (1 - (v - yMin)/(yMax - yMin)) * chartH;

  const toPath = (series) => series.map((v,i) => `${i===0?'M':'L'} ${xOf(i).toFixed(2)} ${yOf(v).toFixed(2)}`).join(' ');
  const toArea = (series) => `${toPath(series)} L ${xOf(n-1).toFixed(2)} ${padT+chartH} L ${xOf(0).toFixed(2)} ${padT+chartH} Z`;

  // crosshair
  const [hover, setHover] = useChartState(null);
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rel = (x - padL) / chartW;
    const i = Math.max(0, Math.min(n-1, Math.round(rel * (n-1))));
    setHover(i);
  };
  const onLeave = () => setHover(null);

  // gridlines
  const yTicks = [0.40, 0.45, 0.50, 0.55, 0.60];
  const xTickCount = 6;

  const fmtTime = (ts) => {
    const d = new Date(ts);
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return `${days[d.getUTCDay()]} ${String(d.getUTCHours()).padStart(2,'0')}:00`;
  };
  const hi = hover;

  return (
    <div ref={containerRef} style={{position:'relative'}}>
      <svg width={w} height={h} style={{display:'block'}} onMouseMove={onMove} onMouseLeave={onLeave}>
        <defs>
          <linearGradient id="aggStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F7C2FF"/>
            <stop offset="100%" stopColor="#5C67FF"/>
          </linearGradient>
          <linearGradient id="aggFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#5C67FF" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#5C67FF" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* horizontal gridlines */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={yOf(t)} y2={yOf(t)}
              stroke="#1A1A1D" strokeWidth="1" strokeDasharray={t===0.50? '0' : '2 4'}/>
            <text x={padL - 10} y={yOf(t) + 3} textAnchor="end"
              fill="#5A5A63" fontSize="11" fontFamily="var(--font-mono)">
              {Math.round(t*100)}%
            </text>
          </g>
        ))}

        {/* x ticks */}
        {Array.from({length:xTickCount}).map((_,i) => {
          const frac = i / (xTickCount - 1);
          const idx = Math.round(frac * (n-1));
          const d = new Date(times[idx]);
          const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          const label = `${days[d.getUTCDay()]}`;
          return (
            <text key={i} x={xOf(idx)} y={h - 8} textAnchor="middle"
              fill="#5A5A63" fontSize="11" fontFamily="var(--font-mono)">{label}</text>
          );
        })}

        {/* aggregate area */}
        <path d={toArea(agg)} fill="url(#aggFill)"/>

        {/* per-venue overlays (behind aggregate) */}
        {overlays.poly && <path d={toPath(poly)} fill="none" stroke="#1E88FF" strokeOpacity="0.8" strokeWidth="1.25"/>}
        {overlays.kal  && <path d={toPath(kal)}  fill="none" stroke="#4BD8B0" strokeOpacity="0.8" strokeWidth="1.25"/>}
        {overlays.myr  && <path d={toPath(myr)}  fill="none" stroke="#B4B4BD" strokeOpacity="0.8" strokeWidth="1.25"/>}

        {/* aggregate line (bold, gradient) */}
        <path d={toPath(agg)} fill="none" stroke="url(#aggStroke)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round"/>

        {/* current price tag at right */}
        <g transform={`translate(${xOf(n-1)}, ${yOf(agg[n-1])})`}>
          <circle r="4" fill="#F7C2FF"/>
          <circle r="8" fill="#F7C2FF" fillOpacity="0.2"/>
        </g>
        <g transform={`translate(${xOf(n-1) + 10}, ${yOf(agg[n-1])})`}>
          <rect x="0" y="-11" width="52" height="22" rx="6" fill="#1A1A1D" stroke="#3A3A40"/>
          <text x="26" y="3" textAnchor="middle" fill="#F4F4F5" fontSize="11" fontFamily="var(--font-mono)" fontWeight="500">
            ${agg[n-1].toFixed(3)}
          </text>
        </g>

        {/* crosshair */}
        {hi!=null && (
          <g>
            <line x1={xOf(hi)} x2={xOf(hi)} y1={padT} y2={padT+chartH}
              stroke="#5A5A63" strokeWidth="1" strokeDasharray="2 3"/>
            <circle cx={xOf(hi)} cy={yOf(agg[hi])} r="4"
              fill="#0A0A0B" stroke="#F7C2FF" strokeWidth="1.5"/>
          </g>
        )}
      </svg>

      {hi!=null && (
        <ChartTooltip x={xOf(hi)} y={yOf(agg[hi])} hi={hi}
          agg={agg} poly={poly} kal={kal} myr={myr} times={times}
          overlays={overlays} width={w}/>
      )}
    </div>
  );
}

function ChartTooltip({x, y, hi, agg, poly, kal, myr, times, overlays, width}) {
  // choose best venue (lowest price == cheapest YES)
  const venueVals = [
    { name:'Polymarket', v:poly[hi], c:'#1E88FF' },
    { name:'Kalshi',     v:kal[hi],  c:'#4BD8B0' },
    { name:'Myriad',     v:myr[hi],  c:'#B4B4BD' },
  ];
  const best = venueVals.reduce((a,b) => a.v < b.v ? a : b);

  const d = new Date(times[hi]);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const ts = `${days[d.getUTCDay()]} ${String(d.getUTCHours()).padStart(2,'0')}:00 UTC`;

  const tw = 210;
  const placeLeft = x + tw + 20 > width;
  const left = placeLeft ? x - tw - 14 : x + 14;

  return (
    <div style={{
      position:'absolute', left, top: Math.max(10, y - 60),
      width: tw,
      background:'#0A0A0B', border:'1px solid #26262A', borderRadius:10,
      padding:'10px 12px', pointerEvents:'none', zIndex:5,
      boxShadow:'0 12px 40px rgba(0,0,0,.55)',
    }}>
      <div style={{fontSize:11, color:'#8A8A94', fontFamily:'var(--font-mono)', marginBottom:8}}>{ts}</div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10, paddingBottom:8, borderBottom:'1px solid #1A1A1D'}}>
        <span style={{fontSize:11, color:'#8A8A94'}}>Best aggregated</span>
        <span style={{
          fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums',
          fontWeight:500, fontSize:14,
          background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',
          WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
        }}>${agg[hi].toFixed(4)}</span>
      </div>
      <div style={{fontSize:11, color:'#8A8A94', marginBottom:6}}>
        via <span style={{color:'#F4F4F5'}}>{best.name}</span>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:5}}>
        {venueVals.map(v => (
          <div key={v.name} style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'#B4B4BD'}}>
            <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
              <span style={{width:6, height:6, borderRadius:'50%', background:v.c}}/>
              {v.name}
            </span>
            <span style={{fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums', color:'#D8D8DC'}}>
              ${v.v.toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ChartPane });
