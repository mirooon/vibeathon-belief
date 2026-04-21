const { useState } = React;

function Nav() {
  const [open, setOpen] = useState(null);
  const items = ["Developers", "Products", "Use cases", "Resources", "Plans"];
  return (
    <nav style={{
      position:'sticky',top:0,zIndex:50,
      background:'rgba(0,0,0,0.6)',backdropFilter:'blur(20px)',
      WebkitBackdropFilter:'blur(20px)',
      borderBottom:'1px solid var(--border-subtle)',
      padding:'0 32px',height:72,
      display:'flex',alignItems:'center',gap:40
    }}>
      <a href="#" style={{display:'flex',alignItems:'center'}}>
        <img src="../../assets/logo_lifi_dark_horizontal.svg" height="22" alt="LI.FI"/>
      </a>
      <div style={{display:'flex',gap:4,flex:1}}>
        {items.map(i =>
          <button key={i}
            onMouseEnter={()=>setOpen(i)} onMouseLeave={()=>setOpen(null)}
            style={{
              background:'transparent',border:0,color:open===i?'#F4F4F5':'#B4B4BD',
              fontFamily:'inherit',fontSize:14,padding:'8px 14px',cursor:'pointer',
              transition:'color .15s'
            }}>{i}</button>
        )}
      </div>
      <button style={{
        background:'transparent',border:'1px solid var(--border-default)',
        color:'#F4F4F5',fontFamily:'inherit',fontSize:13,padding:'8px 16px',
        borderRadius:8,cursor:'pointer'
      }}>Sign in to Partner Portal</button>
    </nav>
  );
}
window.Nav = Nav;
