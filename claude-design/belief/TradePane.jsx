/* Pane B — Buy/sell module with route selector */
const { useState: useTS, useMemo: useTM } = React;

function TradePane() {
  const [side, setSide] = useTS('yes');
  const [size, setSize] = useTS(600);
  const [routeId, setRouteId] = useTS('optimal');
  const [outcome, setOutcome] = useTS('france');

  const routes = useTM(() => computeRoutes(size), [size]);
  const selected = routes.find(r => r.id === routeId) || routes[0];
  const current = MARKET.outcomes.find(o => o.id === outcome);

  const youPay = selected.cost + selected.fees;
  const ifWins = selected.filled * 1.00; // $1 per share payout
  const profit = ifWins - youPay;
  const pctReturn = youPay > 0 ? (profit / youPay) * 100 : 0;

  const routeSummary = selected.fills.length
    ? selected.fills.map(f => {
        const vn = VENUES.find(v=>v.id===f.venueId).name;
        return `${f.take} on ${vn} @ $${f.price.toFixed(3)}`;
      }).concat(selected.unfilled > 0 ? [`${selected.unfilled} unfilled`] : [])
      .join(' + ')
    : '—';

  return (
    <section style={{
      background:'#0A0A0B', border:'1px solid #1A1A1D', borderRadius:24,
      padding:'20px 22px', display:'flex', flexDirection:'column', gap:16,
      boxShadow:'0 24px 80px rgba(0,0,0,.45), 0 0 80px rgba(247,194,255,.04)',
    }}>
      {/* Outcome row */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span className="eyebrow">trade</span>
        <OutcomePicker value={outcome} onChange={setOutcome}/>
      </div>

      {/* Side toggle */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
        <SidePill side="yes" label="Buy YES" price={current.yes} active={side==='yes'} onClick={()=>setSide('yes')}/>
        <SidePill side="no"  label="Buy NO"  price={current.no}  active={side==='no'}  onClick={()=>setSide('no')}/>
      </div>

      {/* Size */}
      <div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6}}>
          <span style={{fontSize:12, color:'#8A8A94', fontFamily:'var(--font-mono)'}}>size</span>
          <span style={{fontSize:11, color:'#5A5A63'}}>shares</span>
        </div>
        <div style={{
          background:'#121214', border:'1px solid #26262A', borderRadius:12,
          padding:'12px 14px', display:'flex', alignItems:'center', gap:10,
        }}>
          <input type="number" value={size} onChange={e=>setSize(Math.max(0, parseInt(e.target.value||'0',10)))}
            style={{
              flex:1, background:'transparent', border:0, outline:'none',
              color:'#F4F4F5', fontFamily:'var(--font-mono)',
              fontSize:24, fontWeight:500, letterSpacing:'-0.01em',
              fontVariantNumeric:'tabular-nums', padding:0, minWidth:0,
            }}/>
          <span style={{fontSize:12, color:'#8A8A94', fontFamily:'var(--font-mono)'}}>shares</span>
        </div>
        <div style={{display:'flex', gap:6, marginTop:8, flexWrap:'wrap'}}>
          {[10,100,500,'Max'].map(c => (
            <button key={c} onClick={() => setSize(c==='Max' ? 1200 : c)} style={{
              background:'#121214', border:'1px solid #26262A', borderRadius:8,
              color:'#B4B4BD', padding:'4px 10px', fontFamily:'inherit', fontSize:12,
              cursor:'pointer', fontWeight:500,
            }}>{c}</button>
          ))}
          <span style={{
            marginLeft:'auto', fontSize:12, color:'#8A8A94',
            display:'inline-flex', alignItems:'center', gap:6, fontFamily:'var(--font-mono)',
          }}>
            ≈ <span style={{color:'#F4F4F5', fontVariantNumeric:'tabular-nums'}}>
              {fmt.usd(youPay)}
            </span>
          </span>
        </div>
      </div>

      {/* Route selector */}
      <div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8}}>
          <span className="eyebrow">route</span>
          <span style={{fontSize:11, color:'#5A5A63'}}>{routes.length} options</span>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {routes.map(r => (
            <RouteCard key={r.id} route={r}
              selected={r.id === routeId}
              onSelect={() => setRouteId(r.id)}/>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div style={{
        background:'#121214', border:'1px solid #26262A', borderRadius:12,
        padding:'14px 16px', display:'flex', flexDirection:'column', gap:10,
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{fontSize:11, color:'#8A8A94', fontFamily:'var(--font-mono)'}}>blended_price</span>
          <span style={{
            fontFamily:'var(--font-mono)', fontSize:20, fontWeight:500,
            fontVariantNumeric:'tabular-nums',
            background: selected.isOptimal ? 'linear-gradient(135deg,#F7C2FF,#5C67FF)' : 'none',
            WebkitBackgroundClip: selected.isOptimal ? 'text' : 'initial',
            backgroundClip: selected.isOptimal ? 'text' : 'initial',
            color: selected.isOptimal ? 'transparent' : '#F4F4F5',
          }}>
            ${selected.blended ? selected.blended.toFixed(4) : '0.0000'}
          </span>
        </div>
        <div style={{height:1, background:'#1A1A1D'}}/>
        <PreviewRow label="you_pay"   value={fmt.usd(youPay)}/>
        <PreviewRow label="if_yes_wins_you_receive" value={fmt.usd(ifWins)}/>
        <PreviewRow label="implied_profit"
          value={<span style={{color:'#34D399'}}>+{fmt.usd(profit)} · +{pctReturn.toFixed(1)}%</span>}/>
        <PreviewRow label="fees" value={fmt.usd(selected.fees)} muted/>
        <div style={{
          fontSize:11, color:'#8A8A94', lineHeight:1.5, paddingTop:6,
          borderTop:'1px dashed #1A1A1D',
        }}>
          {routeSummary}
        </div>
      </div>

      {/* Execute */}
      <ExecuteButton/>
    </section>
  );
}

function PreviewRow({label, value, muted}) {
  return (
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
      <span style={{fontSize:11, color:'#8A8A94', fontFamily:'var(--font-mono)'}}>{label}</span>
      <span style={{
        fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums',
        fontSize: muted ? 12 : 13, fontWeight:500,
        color: muted ? '#B4B4BD' : '#F4F4F5',
      }}>{value}</span>
    </div>
  );
}

function SidePill({side, label, price, active, onClick}) {
  const isYes = side === 'yes';
  const color = isYes ? '#34D399' : '#F87171';
  const bg    = isYes ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)';
  return (
    <button onClick={onClick} style={{
      background: active ? bg : '#121214',
      border: active ? `1px solid ${color}66` : '1px solid #26262A',
      color: '#F4F4F5', borderRadius:14, padding:'14px 12px',
      display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4,
      cursor:'pointer', fontFamily:'inherit', textAlign:'left',
      transition:'all 120ms cubic-bezier(0.2,0.8,0.2,1)',
      boxShadow: active ? `inset 0 0 0 1px ${color}33` : 'none',
    }}>
      <span style={{
        display:'inline-flex', alignItems:'center', gap:8,
        fontSize:14, fontWeight:500,
      }}>
        <span style={{width:6, height:6, borderRadius:'50%', background:color}}/>
        {label}
      </span>
      <span style={{
        fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums',
        fontSize:18, color: active ? color : '#D8D8DC', fontWeight:500,
      }}>
        ${price.toFixed(2)}
      </span>
    </button>
  );
}

function RouteCard({route, selected, onSelect}) {
  const isOpt = route.isOptimal;
  const isFull = route.unfilled === 0;
  const summary = route.fills.map(f => {
    const vn = VENUES.find(v=>v.id===f.venueId).name;
    return `${f.take} on ${vn} @ $${f.price.toFixed(3)}`;
  }).concat(route.unfilled > 0 ? [`${route.unfilled} unfilled`] : []).join(', ');

  // slippage in bps vs lowest (optimal) blended — but we don't have that here, so use vs top-of-book
  const tob = VENUES[0].ask[0].price; // 0.51 polymarket top
  const slipBps = route.blended > 0 ? Math.round(((route.blended - tob) / tob) * 10000) : 0;

  const borderColor = selected
    ? (isOpt ? 'transparent' : '#F7C2FF')
    : '#1A1A1D';

  return (
    <div onClick={onSelect} style={{
      position:'relative', cursor:'pointer',
      background: selected && isOpt ? 'linear-gradient(135deg, rgba(247,194,255,0.06), rgba(92,103,255,0.06))'
                                    : '#121214',
      border: `1px solid ${borderColor}`,
      borderRadius:14, padding: selected && isOpt ? '13px 15px' : '14px 16px',
      transition:'all 120ms cubic-bezier(0.2,0.8,0.2,1)',
    }}>
      {/* Gradient border for selected+optimal */}
      {selected && isOpt && (
        <span aria-hidden style={{
          position:'absolute', inset:0, borderRadius:14, padding:1,
          background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',
          WebkitMask:'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite:'xor', maskComposite:'exclude',
          pointerEvents:'none',
        }}/>
      )}

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
        <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0}}>
          <Radio on={selected} optimal={isOpt && selected}/>
          <div style={{display:'flex', flexDirection:'column', gap:3, minWidth:0}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{fontSize:14, fontWeight:500, color:'#F4F4F5'}}>{route.label}</span>
              {isOpt && <BestBadge/>}
            </div>
            <span style={{
              fontSize:11, color:'#8A8A94', lineHeight:1.4, overflow:'hidden',
              textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:320,
            }}>{summary}</span>
          </div>
        </div>

        <div style={{textAlign:'right', flexShrink:0, display:'flex', flexDirection:'column', gap:2}}>
          <span style={{
            fontFamily:'var(--font-mono)', fontSize:17, fontWeight:500,
            fontVariantNumeric:'tabular-nums', color:'#F4F4F5',
            letterSpacing:'-0.01em',
          }}>
            ${route.blended ? route.blended.toFixed(4) : '—'}
          </span>
          <span style={{
            fontFamily:'var(--font-mono)', fontSize:11,
            fontVariantNumeric:'tabular-nums',
            color: isFull ? '#5A5A63' : '#FBBF24',
          }}>
            {route.filled}/{route.requested}{!isFull && ' · partial'}
          </span>
        </div>
      </div>

      <div style={{
        display:'flex', gap:14, marginTop:10, paddingTop:10,
        borderTop: '1px dashed #1A1A1D',
        fontSize:11, color:'#5A5A63', fontFamily:'var(--font-mono)',
      }}>
        <span>fees {fmt.usd(route.fees)}</span>
        <span>slip {slipBps} bps</span>
        {!isFull && <span style={{color:'#FBBF24'}}>
          • {route.unfilled} shares unfilled
        </span>}
      </div>
    </div>
  );
}

function Radio({on, optimal}) {
  return (
    <span style={{
      width:16, height:16, borderRadius:'50%',
      border: on ? '1px solid transparent' : '1px solid #3A3A40',
      background: on
        ? (optimal ? 'linear-gradient(135deg,#F7C2FF,#5C67FF)' : '#F7C2FF')
        : 'transparent',
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      flexShrink:0,
    }}>
      {on && <span style={{width:5, height:5, borderRadius:'50%', background:'#0A0A0B'}}/>}
    </span>
  );
}

function BestBadge() {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      fontSize:9, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase',
      padding:'2px 6px', borderRadius:999,
      background:'linear-gradient(135deg, rgba(247,194,255,0.2), rgba(92,103,255,0.2))',
      color:'#F7C2FF',
      border:'1px solid rgba(247,194,255,0.25)',
    }}>
      ★ Best
    </span>
  );
}

function OutcomePicker({value, onChange}) {
  const [open, setOpen] = useTS(false);
  const current = MARKET.outcomes.find(o => o.id === value);
  return (
    <div style={{position:'relative'}}>
      <button onClick={() => setOpen(o=>!o)} style={{
        background:'transparent', border:'1px solid #26262A', borderRadius:999,
        padding:'4px 8px 4px 6px', color:'#F4F4F5', fontFamily:'inherit', fontSize:12,
        display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontWeight:500,
      }}>
        <FlagDot label={current.label}/>
        {current.label}
        <span style={{color:'#8A8A94', fontSize:9}}>▾</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', right:0, minWidth:180,
          background:'#121214', border:'1px solid #26262A', borderRadius:10,
          padding:4, zIndex:30,
          boxShadow:'0 12px 40px rgba(0,0,0,.45)',
        }}>
          {MARKET.outcomes.map(o => (
            <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }} style={{
              width:'100%', display:'flex', alignItems:'center', gap:10,
              background: o.id===value ? '#1A1A1D' : 'transparent',
              border:0, color:'#F4F4F5', padding:'7px 8px', borderRadius:8,
              fontFamily:'inherit', fontSize:12, cursor:'pointer',
            }}>
              <FlagDot label={o.label}/>{o.label}
              <span style={{marginLeft:'auto', color:'#8A8A94', fontFamily:'var(--font-mono)'}}>
                ${o.yes.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExecuteButton() {
  const [showTip, setTip] = useTS(false);
  return (
    <div style={{position:'relative'}}
      onMouseEnter={()=>setTip(true)} onMouseLeave={()=>setTip(false)}>
      <button disabled style={{
        width:'100%', background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',
        color:'#0A0A0B', border:0, borderRadius:14, padding:'16px',
        fontFamily:'inherit', fontSize:15, fontWeight:600,
        cursor:'not-allowed', opacity:0.5,
        boxShadow:'0 0 40px rgba(92,103,255,.2)',
        letterSpacing:'-0.005em',
      }}>
        Execute trade
      </button>
      {showTip && (
        <div style={{
          position:'absolute', bottom:'calc(100% + 8px)', left:0, right:0,
          background:'#0A0A0B', border:'1px solid #26262A', borderRadius:10,
          padding:'10px 12px', fontSize:11, color:'#B4B4BD', lineHeight:1.5,
          boxShadow:'0 12px 40px rgba(0,0,0,.55)', pointerEvents:'none',
        }}>
          Live execution launches with <span style={{color:'#F4F4F5'}}>Phase 2</span>.
          This is a Phase 1 demo of the routing engine.
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TradePane });
