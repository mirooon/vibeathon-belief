/* Belief top nav + market header */

function BeliefTopBar() {
  return (
    <header style={{
      height:64, display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 24px', borderBottom:'1px solid #1A1A1D', background:'rgba(0,0,0,0.6)',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      position:'sticky', top:0, zIndex:20,
    }}>
      <div style={{display:'flex', alignItems:'center', gap:18}}>
        <img src="assets/logo_lifi_dark.svg" height="22" alt="LI.FI" style={{opacity:.9}}/>
        <span style={{width:1, height:20, background:'#26262A'}}/>
        <nav style={{display:'flex', gap:2, fontSize:13}}>
          <NavItem>Markets</NavItem>
          <NavItem muted>Portfolio</NavItem>
          <NavItem muted>Settings</NavItem>
        </nav>
        <span style={{
          fontFamily:'var(--font-mono)', fontSize:11, color:'#F7C2FF',
          background:'rgba(247,194,255,.08)', border:'1px solid rgba(247,194,255,.18)',
          padding:'2px 8px', borderRadius:999, letterSpacing:'.04em',
          marginLeft:4,
        }}>
          belief
        </span>
      </div>
      <div style={{display:'flex', gap:10, alignItems:'center'}}>
        <button style={jumperPill}>
          <span style={{width:18, height:18, borderRadius:'50%',
            background:'linear-gradient(135deg,#F7C2FF,#5C67FF)'}}/>
          0x7a2f…9c1e
          <span style={{color:'#8A8A94', marginLeft:2}}>▾</span>
        </button>
      </div>
    </header>
  );
}

const jumperPill = {
  background:'#1A1A1D', border:'1px solid #3A3A40', borderRadius:999,
  padding:'6px 12px 6px 6px', display:'flex', alignItems:'center', gap:8,
  color:'#F4F4F5', fontFamily:'inherit', fontSize:13, cursor:'pointer',
};

function NavItem({children, muted}) {
  return (
    <a href="#" style={{
      color: muted ? '#8A8A94' : '#F4F4F5',
      textDecoration:'none', padding:'6px 12px', borderRadius:8,
      fontWeight: muted ? 400 : 500,
      transition:'color var(--dur-fast) var(--ease-standard)',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = '#F4F4F5'; }}
      onMouseLeave={e => { e.currentTarget.style.color = muted ? '#8A8A94' : '#F4F4F5'; }}
    >{children}</a>
  );
}

function MarketHeader() {
  return (
    <div style={{padding:'28px 32px 8px', maxWidth:1400, margin:'0 auto', width:'100%'}}>
      <a href="#" style={{
        display:'inline-flex', alignItems:'center', gap:6,
        color:'#8A8A94', fontSize:13, textDecoration:'none',
        marginBottom:20,
        transition:'color var(--dur-fast) var(--ease-standard)',
      }}
        onMouseEnter={e => e.currentTarget.style.color = '#F4F4F5'}
        onMouseLeave={e => e.currentTarget.style.color = '#8A8A94'}
      >
        <span>←</span> Back to markets
      </a>

      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:32, flexWrap:'wrap'}}>
        <div style={{flex:'1 1 560px', minWidth:0}}>
          <div className="eyebrow" style={{marginBottom:14}}>
            sports / world_cup_2026
          </div>
          <h1 style={{
            fontSize:'clamp(32px, 4vw, 44px)',
            lineHeight:1.08, letterSpacing:'-0.025em', fontWeight:500,
            margin:0, color:'#F4F4F5',
            textWrap:'pretty',
          }}>
            {MARKET.title}
          </h1>
          <div style={{display:'flex', gap:10, alignItems:'center', marginTop:16, flexWrap:'wrap'}}>
            <Chip>Sports</Chip>
            <Meta>Resolves {MARKET.resolvesOn}</Meta>
            <Dot/>
            <Meta>{MARKET.venueCount} venues aggregated</Meta>
            <Dot/>
            <Meta><LiveDot/> Live</Meta>
          </div>
        </div>

        <div style={{
          display:'flex', gap:0, alignItems:'flex-end',
          paddingLeft:24, borderLeft:'1px solid #1A1A1D',
          minWidth:260,
        }}>
          <div>
            <div className="eyebrow" style={{marginBottom:8}}>best_aggregated_yes</div>
            <div style={{
              display:'flex', alignItems:'baseline', gap:10,
            }}>
              <span style={{
                fontSize:52, fontWeight:500, letterSpacing:'-0.03em',
                fontVariantNumeric:'tabular-nums',
                background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',
                WebkitBackgroundClip:'text', backgroundClip:'text',
                color:'transparent', lineHeight:1,
              }}>$0.51</span>
              <span style={{
                color:'#34D399', fontSize:13, fontWeight:500,
                fontVariantNumeric:'tabular-nums',
              }}>+0.09 · +21%</span>
            </div>
            <div style={{color:'#8A8A94', fontSize:12, marginTop:6, fontFamily:'var(--font-mono)'}}>
              7d change
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({children}) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      padding:'4px 10px', borderRadius:999, fontSize:12, fontWeight:500,
      background:'#1A1A1D', border:'1px solid #26262A', color:'#D8D8DC',
    }}>{children}</span>
  );
}
function Meta({children}) {
  return <span style={{color:'#8A8A94', fontSize:13, display:'inline-flex', alignItems:'center', gap:6}}>{children}</span>;
}
function Dot() {
  return <span style={{width:3, height:3, borderRadius:'50%', background:'#3A3A40'}}/>;
}
function LiveDot() {
  return (
    <span style={{
      width:6, height:6, borderRadius:'50%', background:'#34D399',
      boxShadow:'0 0 0 3px rgba(52,211,153,.18)',
      display:'inline-block', marginRight:2,
    }}/>
  );
}

Object.assign(window, { BeliefTopBar, MarketHeader });
