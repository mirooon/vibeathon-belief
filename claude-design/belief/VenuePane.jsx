/* Pane C — Per-venue breakdown table */
const { useState: useVS } = React;

function VenuePane() {
  const [expanded, setExpanded] = useVS({ polymarket:true, kalshi:true, myriad:false });
  const toggle = (id) => setExpanded(e => ({...e, [id]: !e[id]}));

  return (
    <section style={{
      background:'#0A0A0B', border:'1px solid #1A1A1D', borderRadius:24,
      padding:'20px 22px 22px', display:'flex', flexDirection:'column', gap:14,
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap'}}>
        <div>
          <span className="eyebrow">per_venue_breakdown</span>
          <h3 style={{
            margin:'8px 0 0', fontSize:20, fontWeight:500, letterSpacing:'-0.02em',
            color:'#F4F4F5',
          }}>
            Verify the routing math
          </h3>
          <p style={{margin:'4px 0 0', fontSize:13, color:'#8A8A94', lineHeight:1.5, maxWidth:560}}>
            Live top-of-book for YES <span style={{color:'#F4F4F5'}}>France</span> across every venue Belief aggregates.
            Expand any venue to inspect the ask ladder.
          </p>
        </div>
        <div style={{
          display:'flex', gap:8, alignItems:'center',
          padding:'6px 10px', background:'#121214', border:'1px solid #26262A', borderRadius:999,
          fontSize:11, color:'#8A8A94', fontFamily:'var(--font-mono)',
        }}>
          <LiveDot/>
          updated <span style={{color:'#F4F4F5'}}>2s ago</span>
        </div>
      </div>

      {/* Table header */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'minmax(180px, 1.2fr) 1fr 1fr 1fr 90px 100px 40px',
        gap:12, padding:'10px 14px',
        fontSize:10, color:'#5A5A63', fontFamily:'var(--font-mono)',
        letterSpacing:'0.04em', textTransform:'uppercase',
        borderBottom:'1px solid #1A1A1D',
      }}>
        <span>venue</span>
        <span>outcome</span>
        <span>best bid</span>
        <span>best ask</span>
        <span style={{textAlign:'right'}}>fee</span>
        <span style={{textAlign:'right'}}>status</span>
        <span/>
      </div>

      {VENUES.map(v => (
        <VenueRow key={v.id} v={v} open={expanded[v.id]} onToggle={() => toggle(v.id)}/>
      ))}

      <div style={{
        marginTop:2, padding:'10px 14px',
        fontSize:11, color:'#5A5A63', fontFamily:'var(--font-mono)', lineHeight:1.6,
      }}>
        sizes shown as contracts · price shown per $1 payout · aggregated across 3 venues · this table is the truth; the router reads from here
      </div>
    </section>
  );
}

function LiveDot() {
  return <span style={{
    width:6, height:6, borderRadius:'50%', background:'#34D399',
    boxShadow:'0 0 0 3px rgba(52,211,153,.15)', display:'inline-block',
  }}/>;
}

function VenueRow({v, open, onToggle}) {
  const bestAsk = v.ask[0];
  return (
    <div style={{
      background: open ? 'rgba(255,255,255,0.015)' : 'transparent',
      border:'1px solid #1A1A1D', borderRadius:12,
      transition:'background 120ms cubic-bezier(0.2,0.8,0.2,1)',
    }}>
      <div onClick={onToggle} style={{
        display:'grid', gridTemplateColumns:'minmax(180px, 1.2fr) 1fr 1fr 1fr 90px 100px 40px',
        gap:12, padding:'14px 14px', alignItems:'center',
        cursor:'pointer',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <span style={{
            width:10, height:10, borderRadius:'50%', background:v.dot,
            boxShadow:`0 0 12px ${v.dot}44`,
          }}/>
          <span style={{fontSize:14, fontWeight:500, color:'#F4F4F5'}}>{v.name}</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <FlagDotMini/>
          <span style={{fontSize:13, color:'#D8D8DC'}}>France · YES</span>
        </div>
        <PriceSize price={v.bestBid.price} size={v.bestBid.size} tone="bid"/>
        <PriceSize price={bestAsk.price} size={bestAsk.size} tone="ask"/>
        <span style={{
          textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12,
          color:'#B4B4BD', fontVariantNumeric:'tabular-nums',
        }}>
          {(v.feeRate * 100).toFixed(2)}%
        </span>
        <div style={{display:'flex', justifyContent:'flex-end'}}>
          <span style={{
            display:'inline-flex', alignItems:'center', gap:6,
            background:'rgba(52,211,153,.08)', color:'#34D399',
            border:'1px solid rgba(52,211,153,.2)',
            padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:500,
          }}>
            <span style={{width:5, height:5, borderRadius:'50%', background:'#34D399'}}/>
            Active
          </span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} style={{
          background:'transparent', border:'1px solid #26262A', borderRadius:8,
          color:'#8A8A94', width:28, height:28, cursor:'pointer', fontFamily:'inherit',
          fontSize:12, display:'inline-flex', alignItems:'center', justifyContent:'center',
          justifySelf:'end',
          transform: open ? 'rotate(180deg)' : 'none',
          transition:'transform 200ms cubic-bezier(0.2,0.8,0.2,1)',
        }}>▾</button>
      </div>

      {open && (
        <div style={{
          padding:'4px 14px 16px', borderTop:'1px dashed #1A1A1D',
          display:'flex', flexDirection:'column', gap:6,
        }}>
          <div style={{
            display:'grid',
            gridTemplateColumns:'100px 1fr 1fr 90px',
            gap:12, fontSize:10, padding:'8px 12px',
            color:'#5A5A63', fontFamily:'var(--font-mono)',
            textTransform:'uppercase', letterSpacing:'0.04em',
          }}>
            <span>level</span>
            <span>price</span>
            <span>size</span>
            <span style={{textAlign:'right'}}>cumulative</span>
          </div>
          {v.ask.map((lvl, i) => {
            const cumulative = v.ask.slice(0, i+1).reduce((s,l) => s+l.size, 0);
            return (
              <div key={i} style={{
                display:'grid', gridTemplateColumns:'100px 1fr 1fr 90px', gap:12,
                padding:'8px 12px', borderRadius:8,
                background: i === 0 ? 'rgba(248,113,113,0.03)' : 'transparent',
                fontSize:13, alignItems:'center',
              }}>
                <span style={{
                  fontFamily:'var(--font-mono)', fontSize:11, color:'#8A8A94',
                }}>
                  ask_L{i+1}
                </span>
                <span style={{
                  fontFamily:'var(--font-mono)', color: i === 0 ? '#F87171' : '#D8D8DC',
                  fontVariantNumeric:'tabular-nums', fontWeight:500,
                }}>
                  ${lvl.price.toFixed(3)}
                </span>
                <DepthBar size={lvl.size} max={1200}/>
                <span style={{
                  textAlign:'right', fontFamily:'var(--font-mono)', color:'#8A8A94',
                  fontVariantNumeric:'tabular-nums', fontSize:12,
                }}>
                  {cumulative.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PriceSize({price, size, tone}) {
  const c = tone === 'bid' ? '#34D399' : '#F87171';
  return (
    <div style={{display:'flex', alignItems:'baseline', gap:8}}>
      <span style={{
        fontFamily:'var(--font-mono)', fontSize:14, fontWeight:500,
        color:c, fontVariantNumeric:'tabular-nums',
      }}>
        ${price.toFixed(3)}
      </span>
      <span style={{
        fontFamily:'var(--font-mono)', fontSize:11, color:'#8A8A94',
        fontVariantNumeric:'tabular-nums',
      }}>
        × {size.toLocaleString()}
      </span>
    </div>
  );
}

function DepthBar({size, max}) {
  const pct = Math.min(100, (size / max) * 100);
  return (
    <div style={{display:'flex', alignItems:'center', gap:10}}>
      <span style={{
        fontFamily:'var(--font-mono)', fontSize:12, color:'#D8D8DC',
        fontVariantNumeric:'tabular-nums', width:48,
      }}>
        {size.toLocaleString()}
      </span>
      <div style={{
        flex:1, height:4, background:'#1A1A1D', borderRadius:2, overflow:'hidden',
        maxWidth:180,
      }}>
        <div style={{
          width:`${pct}%`, height:'100%',
          background:'linear-gradient(90deg, rgba(248,113,113,0.6), rgba(248,113,113,0.2))',
        }}/>
      </div>
    </div>
  );
}

function FlagDotMini() {
  return (
    <span style={{
      width:14, height:10, borderRadius:2, overflow:'hidden',
      display:'inline-grid', gridTemplateColumns:'1fr 1fr 1fr',
      border:'1px solid rgba(255,255,255,.06)',
    }}>
      <span style={{background:'#0055A4'}}/>
      <span style={{background:'#FFFFFF'}}/>
      <span style={{background:'#EF4135'}}/>
    </span>
  );
}

Object.assign(window, { VenuePane });
