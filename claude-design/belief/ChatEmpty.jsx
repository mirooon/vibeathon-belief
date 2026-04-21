/* Belief — /chat empty state
   Centered belief input with rotating placeholder, 4 example chips,
   and a muted "Browse all markets" escape hatch. Inherits LI.FI tokens. */

const { useState: useCS, useEffect: useCE, useRef: useCR } = React;

const ROTATING_PLACEHOLDERS = [
  'France wins the 2026 World Cup',
  'Bitcoin hits 200k this year',
  'Fed doesn\u2019t cut rates in June',
  'Trump pardons before Q3',
];

const EXAMPLES = [
  'Bitcoin hits 200k',
  'Fed doesn\u2019t cut in June',
  'Trump pardons before Q3',
  'Any PL team scores 100+',
];

function ChatEmpty() {
  const [value, setValue] = useCS('');
  const [phIdx, setPhIdx] = useCS(0);
  const [phFade, setPhFade] = useCS(true);
  const textareaRef = useCR(null);

  // rotating placeholder (pause while user has typed anything or input is focused)
  const [focused, setFocused] = useCS(false);
  useCE(() => {
    if (value.length > 0 || focused) return;
    const out = setTimeout(() => setPhFade(false), 3000);
    const next = setTimeout(() => {
      setPhIdx(i => (i + 1) % ROTATING_PLACEHOLDERS.length);
      setPhFade(true);
    }, 3400);
    return () => { clearTimeout(out); clearTimeout(next); };
  }, [phIdx, value, focused]);

  // autosize the textarea up to 3 lines
  useCE(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, [value]);

  const canSubmit = value.trim().length >= 3;
  const onSubmit = () => {
    if (!canSubmit) return;
    // demo — in prod navigates to post-submit state with query
    console.log('submit belief:', value.trim());
  };

  return (
    <main style={{
      position:'relative', zIndex:1,
      minHeight:'calc(100vh - 64px)',
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'0 24px',
      paddingTop:'clamp(80px, 18vh, 180px)',
    }}>
      <div className="eyebrow" style={{marginBottom:20}}>ask_belief</div>

      <h1 style={{
        fontSize:'clamp(28px, 4.2vw, 44px)',
        fontWeight:500, letterSpacing:'-0.025em', lineHeight:1.1,
        margin:0, color:'#F4F4F5', textAlign:'center',
        textWrap:'pretty', maxWidth:720,
      }}>
        What do you think will happen?
      </h1>

      <p style={{
        margin:'14px 0 0', color:'#8A8A94', fontSize:14, lineHeight:1.55,
        textAlign:'center', maxWidth:520,
      }}>
        Describe a belief in plain language. We’ll find the markets that match it across every venue we aggregate.
      </p>

      {/* Input */}
      <div style={{
        marginTop:28, width:'100%', maxWidth:720,
        position:'relative',
      }}>
        <div style={{
          display:'flex', alignItems:'flex-end', gap:10,
          background:'#0A0A0B',
          border: focused ? '1px solid transparent' : '1px solid #26262A',
          borderRadius:18, padding:'14px 14px 14px 18px',
          transition:'border-color 120ms cubic-bezier(0.2,0.8,0.2,1)',
          boxShadow: focused
            ? '0 0 0 1px rgba(247,194,255,0.4), 0 0 60px rgba(92,103,255,0.18)'
            : '0 12px 40px rgba(0,0,0,0.45)',
          position:'relative',
        }}>
          {/* gradient outline when focused */}
          {focused && (
            <span aria-hidden style={{
              position:'absolute', inset:0, borderRadius:18, padding:1,
              background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',
              WebkitMask:'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite:'xor', maskComposite:'exclude',
              pointerEvents:'none',
            }}/>
          )}

          <div style={{flex:1, position:'relative', minWidth:0}}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              onChange={e => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              style={{
                width:'100%', background:'transparent', border:0, outline:'none', resize:'none',
                color:'#F4F4F5', fontFamily:'inherit',
                fontSize:18, lineHeight:1.4, letterSpacing:'-0.005em',
                padding:'6px 0', minHeight:28, maxHeight:96,
                overflow:'auto',
              }}
            />
            {value.length === 0 && (
              <span style={{
                position:'absolute', top:6, left:0, right:0,
                color:'#5A5A63', fontSize:18, lineHeight:1.4, pointerEvents:'none',
                opacity: phFade ? 1 : 0,
                transition:'opacity 360ms cubic-bezier(0.2,0.8,0.2,1)',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>
                {ROTATING_PLACEHOLDERS[phIdx]}
              </span>
            )}
          </div>

          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label="Submit belief"
            style={{
              width:38, height:38, flexShrink:0, borderRadius:10,
              border:0, cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit
                ? 'linear-gradient(135deg,#F7C2FF,#5C67FF)'
                : '#1A1A1D',
              color: canSubmit ? '#0A0A0B' : '#5A5A63',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              fontFamily:'inherit', fontSize:16, fontWeight:600,
              transition:'all 120ms cubic-bezier(0.2,0.8,0.2,1)',
              boxShadow: canSubmit ? '0 0 24px rgba(92,103,255,0.3)' : 'none',
            }}
          >→</button>
        </div>

        <p style={{
          margin:'8px 14px 0', fontSize:11, color:'#5A5A63',
          fontFamily:'var(--font-mono)', letterSpacing:'0.02em',
          display:'flex', gap:14, flexWrap:'wrap',
        }}>
          <span><Kbd>enter</Kbd> to search</span>
          <span><Kbd>shift</Kbd> + <Kbd>enter</Kbd> for newline</span>
        </p>
      </div>

      {/* Examples */}
      <div style={{marginTop:36, width:'100%', maxWidth:720}}>
        <div className="eyebrow" style={{marginBottom:12, textAlign:'center'}}>try</div>
        <div style={{
          display:'grid', gap:8,
          gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',
        }}>
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => {
                setValue(ex);
                setTimeout(() => textareaRef.current?.focus(), 0);
              }}
              style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                gap:10, padding:'12px 14px',
                background:'#0A0A0B', border:'1px solid #1A1A1D', borderRadius:12,
                color:'#D8D8DC', fontFamily:'inherit', fontSize:14, textAlign:'left',
                cursor:'pointer',
                transition:'all 120ms cubic-bezier(0.2,0.8,0.2,1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#3A3A40';
                e.currentTarget.style.background = '#121214';
                const arrow = e.currentTarget.querySelector('[data-ex-arrow]');
                if (arrow) arrow.style.color = '#F7C2FF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1A1A1D';
                e.currentTarget.style.background = '#0A0A0B';
                const arrow = e.currentTarget.querySelector('[data-ex-arrow]');
                if (arrow) arrow.style.color = '#5A5A63';
              }}
            >
              <span>{ex}</span>
              <span data-ex-arrow style={{
                color:'#5A5A63', fontSize:13,
                transition:'color 120ms cubic-bezier(0.2,0.8,0.2,1)',
              }}>↗</span>
            </button>
          ))}
        </div>
      </div>

      {/* Escape hatch */}
      <a href="Market.html" style={{
        marginTop:48, marginBottom:60,
        color:'#8A8A94', fontSize:13, textDecoration:'none',
        display:'inline-flex', alignItems:'center', gap:6,
        borderBottom:'1px dashed #26262A', paddingBottom:2,
        transition:'color 120ms cubic-bezier(0.2,0.8,0.2,1)',
      }}
        onMouseEnter={e => e.currentTarget.style.color = '#F4F4F5'}
        onMouseLeave={e => e.currentTarget.style.color = '#8A8A94'}
      >
        Or browse all markets →
      </a>

      {/* Disclosure footer */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0,
        padding:'10px 16px', textAlign:'center',
        fontSize:11, color:'#5A5A63', fontFamily:'var(--font-mono)',
        background:'linear-gradient(0deg, rgba(0,0,0,0.9), transparent)',
        pointerEvents:'none',
      }}>
        belief is a router, not an advisor — we surface markets, you decide
      </div>
    </main>
  );
}

function Kbd({children}) {
  return (
    <kbd style={{
      fontFamily:'var(--font-mono)', fontSize:10,
      background:'#121214', border:'1px solid #26262A', borderRadius:4,
      padding:'1px 5px', color:'#8A8A94', letterSpacing:'0.04em',
    }}>{children}</kbd>
  );
}

/* ---- Top bar variant with Chat tab active ---- */
function BeliefTopBarChat() {
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
          <NavLink>Markets</NavLink>
          <NavLink active sparkle>Chat</NavLink>
          <NavLink muted>Portfolio</NavLink>
        </nav>
        <span style={{
          fontFamily:'var(--font-mono)', fontSize:11, color:'#F7C2FF',
          background:'rgba(247,194,255,.08)', border:'1px solid rgba(247,194,255,.18)',
          padding:'2px 8px', borderRadius:999, letterSpacing:'.04em',
          marginLeft:4,
        }}>belief</span>
      </div>
      <div style={{display:'flex', gap:10, alignItems:'center'}}>
        <button style={{
          background:'transparent', border:'1px solid #3A3A40', borderRadius:999,
          padding:'6px 14px', color:'#F4F4F5', fontFamily:'inherit', fontSize:13, cursor:'pointer',
          fontWeight:500,
        }}>Log in</button>
      </div>
    </header>
  );
}

function NavLink({children, active, sparkle, muted}) {
  const col = active ? '#F4F4F5' : muted ? '#8A8A94' : '#D8D8DC';
  return (
    <a href="#" style={{
      color: col, textDecoration:'none', padding:'6px 12px', borderRadius:8,
      fontWeight: active ? 500 : 400,
      background: active
        ? 'linear-gradient(135deg, rgba(247,194,255,0.08), rgba(92,103,255,0.08))'
        : 'transparent',
      border: active ? '1px solid rgba(247,194,255,0.18)' : '1px solid transparent',
      display:'inline-flex', alignItems:'center', gap:6,
      transition:'all 120ms cubic-bezier(0.2,0.8,0.2,1)',
    }}>
      {sparkle && (
        <span style={{
          fontSize:11,
          background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',
          WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
        }}>✦</span>
      )}
      {children}
    </a>
  );
}

Object.assign(window, { ChatEmpty, BeliefTopBarChat });
