/* Belief — Login modal (Privy)
   Bimodal-friendly: email dominant at top, social below, wallet options
   under a divider. Dismiss via X, overlay, or Escape. */

const { useState: useLS, useEffect: useLE } = React;

function LoginModal({ open, onClose }) {
  const [loading, setLoading] = useLS(null); // which option is "loading"
  const [emailStage, setEmailStage] = useLS(false); // expand inline email form
  const [email, setEmail] = useLS('');

  useLE(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useLE(() => {
    if (!open) { setLoading(null); setEmailStage(false); setEmail(''); }
  }, [open]);

  // simulate a Privy popup/redirect
  const trigger = (id) => {
    setLoading(id);
    setTimeout(() => setLoading(null), 1400);
  };

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position:'fixed', inset:0, zIndex:100,
        background:'rgba(0,0,0,0.72)',
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:20,
        animation:'beliefFadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        role="dialog" aria-modal="true" aria-label="Log in to Belief"
        style={{
          position:'relative', width:'100%', maxWidth:420,
          background:'#0A0A0B',
          border:'1px solid #26262A', borderRadius:24,
          padding:'24px 24px 20px',
          display:'flex', flexDirection:'column', gap:16,
          boxShadow:'0 24px 80px rgba(0,0,0,0.6), 0 0 80px rgba(92,103,255,0.06)',
          animation:'beliefLift 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* header */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12}}>
          <div>
            <div className="eyebrow" style={{marginBottom:8}}>welcome</div>
            <h2 style={{
              margin:0, fontSize:22, fontWeight:500, letterSpacing:'-0.02em',
              color:'#F4F4F5',
            }}>
              Log in to Belief
            </h2>
            <p style={{
              margin:'4px 0 0', fontSize:13, color:'#8A8A94', lineHeight:1.5, maxWidth:320,
            }}>
              Email, social, or wallet — any identity becomes your account.
            </p>
          </div>
          <button aria-label="Close" onClick={onClose} style={iconBtn}>✕</button>
        </div>

        {/* Email-first block */}
        {!emailStage ? (
          <OptionButton
            onClick={() => setEmailStage(true)}
            loading={loading==='email'}
            variant="primary"
            icon={<MailGlyph/>}
            label="Continue with email"
          />
        ) : (
          <EmailInline
            value={email}
            onChange={setEmail}
            onBack={() => setEmailStage(false)}
            onSubmit={() => trigger('email')}
            loading={loading==='email'}
          />
        )}

        {/* Social row */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <OptionButton
            onClick={() => trigger('google')}
            loading={loading==='google'}
            compact
            icon={<GoogleGlyph/>}
            label="Google"
          />
          <OptionButton
            onClick={() => trigger('twitter')}
            loading={loading==='twitter'}
            compact
            icon={<XGlyph/>}
            label="X / Twitter"
          />
        </div>

        {/* divider */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          color:'#5A5A63', fontSize:11, fontFamily:'var(--font-mono)',
          letterSpacing:'0.04em',
          margin:'2px 0',
        }}>
          <span style={{flex:1, height:1, background:'#1A1A1D'}}/>
          or connect a wallet
          <span style={{flex:1, height:1, background:'#1A1A1D'}}/>
        </div>

        {/* Wallet list */}
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <OptionButton
            onClick={() => trigger('metamask')}
            loading={loading==='metamask'}
            icon={<MetamaskGlyph/>}
            label="MetaMask"
            right={<Badge tone="neutral">Detected</Badge>}
          />
          <OptionButton
            onClick={() => trigger('phantom')}
            loading={loading==='phantom'}
            icon={<PhantomGlyph/>}
            label="Phantom"
          />
          <OptionButton
            onClick={() => trigger('coinbase')}
            loading={loading==='coinbase'}
            icon={<CoinbaseGlyph/>}
            label="Coinbase Wallet"
          />
          <OptionButton
            onClick={() => trigger('walletconnect')}
            loading={loading==='walletconnect'}
            icon={<WalletConnectGlyph/>}
            label="WalletConnect & other"
          />
        </div>

        {/* terms */}
        <p style={{
          margin:'4px 0 0', fontSize:11, color:'#5A5A63', lineHeight:1.6, textAlign:'center',
        }}>
          By continuing you agree to our{' '}
          <a href="#" style={termsLink}>Terms</a>
          {' '}and{' '}
          <a href="#" style={termsLink}>Privacy Policy</a>.
        </p>
      </div>

      {/* keyframes */}
      <style>{`
        @keyframes beliefFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes beliefLift  {
          from { opacity: 0; transform: translateY(8px) scale(0.985); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

/* ============== Option button ============== */

function OptionButton({ onClick, loading, icon, label, right, variant, compact }) {
  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={onClick} disabled={loading}
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding: compact ? '12px 12px' : '14px 14px',
        background: isPrimary ? '#1A1A1D' : '#121214',
        border: isPrimary ? '1px solid #3A3A40' : '1px solid #26262A',
        borderRadius: 12,
        color:'#F4F4F5', fontFamily:'inherit', fontSize:14, fontWeight:500,
        cursor: loading ? 'progress' : 'pointer',
        textAlign:'left', width:'100%',
        transition:'all 120ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      onMouseEnter={(e)=>{
        if (loading) return;
        e.currentTarget.style.borderColor = '#5A5A63';
        e.currentTarget.style.background = isPrimary ? '#1F1F23' : '#17171A';
      }}
      onMouseLeave={(e)=>{
        e.currentTarget.style.borderColor = isPrimary ? '#3A3A40' : '#26262A';
        e.currentTarget.style.background   = isPrimary ? '#1A1A1D' : '#121214';
      }}
    >
      <span style={{
        width:28, height:28, flexShrink:0,
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}>{icon}</span>
      <span style={{flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
        {label}
      </span>
      {loading
        ? <Spinner/>
        : right || <span style={{color:'#5A5A63', fontSize:14}}>→</span>}
    </button>
  );
}

function EmailInline({ value, onChange, onBack, onSubmit, loading }) {
  return (
    <div style={{
      background:'#121214', border:'1px solid #3A3A40', borderRadius:12,
      padding:12, display:'flex', flexDirection:'column', gap:10,
    }}>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <span style={{
          width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}><MailGlyph/></span>
        <input
          autoFocus
          type="email" placeholder="you@example.com"
          value={value}
          onChange={(e)=>onChange(e.target.value)}
          onKeyDown={(e)=>{ if (e.key==='Enter' && value) onSubmit(); }}
          style={{
            flex:1, minWidth:0, background:'transparent', border:0, outline:'none',
            color:'#F4F4F5', fontFamily:'inherit', fontSize:14,
          }}
        />
      </div>
      <div style={{display:'flex', gap:8}}>
        <button onClick={onBack} style={{
          flex:'0 0 auto', background:'transparent', border:'1px solid #26262A', borderRadius:10,
          padding:'10px 14px', color:'#B4B4BD', fontFamily:'inherit', fontSize:13, cursor:'pointer',
        }}>Back</button>
        <button
          onClick={onSubmit}
          disabled={!value || loading}
          style={{
            flex:1, borderRadius:10, padding:'10px 14px',
            border:0, fontFamily:'inherit', fontSize:14, fontWeight:500,
            color:'#0A0A0B',
            background: (!value || loading) ? '#3A3A40'
              : 'linear-gradient(135deg, #F7C2FF, #5C67FF)',
            cursor: (!value || loading) ? 'not-allowed' : 'pointer',
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow: (!value || loading) ? 'none' : '0 0 40px rgba(92,103,255,0.25)',
          }}
        >
          {loading ? (<><Spinner dark/> Sending code…</>) : (<>Send me a code →</>)}
        </button>
      </div>
      <p style={{margin:0, fontSize:11, color:'#5A5A63', lineHeight:1.5}}>
        We'll email you a 6-digit code. No password required.
      </p>
    </div>
  );
}

/* ============== Small UI helpers ============== */

const iconBtn = {
  width:32, height:32, border:'1px solid #26262A', background:'transparent',
  color:'#8A8A94', borderRadius:10, cursor:'pointer',
  fontFamily:'inherit', fontSize:12,
  display:'inline-flex', alignItems:'center', justifyContent:'center',
  flexShrink:0,
};
const termsLink = {
  color:'#B4B4BD', textDecoration:'none',
  borderBottom:'1px dashed #3A3A40',
};

function Badge({children, tone='neutral'}) {
  const map = {
    neutral: { c:'#B4B4BD', bg:'rgba(255,255,255,0.04)', bd:'#26262A' },
    pink:    { c:'#F7C2FF', bg:'rgba(247,194,255,0.08)', bd:'rgba(247,194,255,0.2)' },
  };
  const t = map[tone];
  return (
    <span style={{
      fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:999,
      background:t.bg, color:t.c, border:`1px solid ${t.bd}`,
      letterSpacing:'0.02em', fontFamily:'var(--font-mono)',
    }}>{children}</span>
  );
}

function Spinner({dark}) {
  const color = dark ? '#0A0A0B' : '#F4F4F5';
  return (
    <span style={{
      display:'inline-block', width:14, height:14, borderRadius:'50%',
      border:`1.5px solid ${color}33`, borderTopColor: color,
      animation:'beliefSpin 600ms linear infinite',
    }}>
      <style>{`@keyframes beliefSpin { to { transform: rotate(360deg) } }`}</style>
    </span>
  );
}

/* ============== Provider glyphs (schematic, not official assets) ============== */

function MailGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="#F4F4F5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5"/>
      <path d="M3.5 7l8.5 6 8.5-6"/>
    </svg>
  );
}
function GoogleGlyph() {
  // simple neutral "G" mark — not official branding
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="#F4F4F5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.3c0 4.97-3.58 8.7-9 8.7a9 9 0 110-18c2.4 0 4.4.87 5.94 2.3"/>
      <path d="M12 12h9"/>
    </svg>
  );
}
function XGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#F4F4F5">
      <path d="M17.5 3h3l-7 8 8 10h-6.2l-4.9-6.3L4.7 21H1.6l7.5-8.6L1.4 3h6.4l4.4 5.8L17.5 3z"/>
    </svg>
  );
}
function MetamaskGlyph() {
  // schematic fox silhouette in brand-ish orange, not an official asset
  return (
    <svg width="24" height="22" viewBox="0 0 28 26">
      <defs>
        <linearGradient id="mmg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#F6851B"/><stop offset="1" stopColor="#E2761B"/>
        </linearGradient>
      </defs>
      <path d="M2 3l10 6-3-6zM26 3L16 9l3-6zM6 18l3 4 5-1-1-4-7 1zM22 18l-3 4-5-1 1-4 7 1z"
        fill="url(#mmg)" stroke="#2A1A10" strokeWidth="0.6" strokeLinejoin="round"/>
      <path d="M6 10l-2 5 4 2 4-2-1-5zM22 10l2 5-4 2-4-2 1-5z"
        fill="url(#mmg)" stroke="#2A1A10" strokeWidth="0.6" strokeLinejoin="round"/>
      <circle cx="10" cy="13" r="1" fill="#0A0A0B"/>
      <circle cx="18" cy="13" r="1" fill="#0A0A0B"/>
    </svg>
  );
}
function PhantomGlyph() {
  // ghost silhouette in phantom's purple, schematic
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="ph" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#AB9FF2"/><stop offset="1" stopColor="#6C5CE7"/>
        </linearGradient>
      </defs>
      <path d="M12 3a8 8 0 00-8 8v9l2.5-2 2 2 2-2 2 2 2-2 2.5 2V11a8 8 0 00-5-8z"
        fill="url(#ph)"/>
      <circle cx="9.5" cy="11" r="1.2" fill="#0A0A0B"/>
      <circle cx="14.5" cy="11" r="1.2" fill="#0A0A0B"/>
    </svg>
  );
}
function CoinbaseGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#0052FF"/>
      <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" fill="#FFFFFF"/>
    </svg>
  );
}
function WalletConnectGlyph() {
  return (
    <svg width="24" height="16" viewBox="0 0 32 20" fill="none" stroke="#3B99FC" strokeWidth="2.4" strokeLinecap="round">
      <path d="M5 8.5c6-6 16-6 22 0M9 12.5l3.5 3 3.5-3 3.5 3 3.5-3"/>
    </svg>
  );
}

Object.assign(window, { LoginModal });
