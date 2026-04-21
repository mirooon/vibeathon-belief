function SideNav() {
  const items = [
    {i:'⇄', l:'Exchange', active:true},
    {i:'⟲', l:'Gas'},
    {i:'$', l:'Buy'},
    {i:'%', l:'Earn'},
    {i:'◎', l:'Pass'}
  ];
  return (
    <aside style={{
      width:68,borderRight:'1px solid #1A1A1D',
      display:'flex',flexDirection:'column',alignItems:'center',
      padding:'20px 0',gap:8,background:'#000'
    }}>
      <img src="../../assets/logo_lifi_dark.svg" height="28" alt="LI.FI" style={{marginBottom:24,opacity:.9}}/>
      {items.map(it=>(
        <button key={it.l} style={{
          width:48,height:48,borderRadius:12,
          background:it.active?'#1A1A1D':'transparent',
          border:it.active?'1px solid #26262A':'1px solid transparent',
          color:it.active?'#F4F4F5':'#8A8A94',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          gap:2,cursor:'pointer',fontFamily:'inherit',fontSize:16
        }}>
          <span>{it.i}</span>
          <span style={{fontSize:9,letterSpacing:'.02em'}}>{it.l}</span>
        </button>
      ))}
    </aside>
  );
}
function TopBar() {
  return (
    <header style={{
      height:64,display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'0 24px',borderBottom:'1px solid #1A1A1D',background:'#000'
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:15,fontWeight:500}}>Exchange</span>
        <span style={{
          fontSize:10,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',
          color:'#F7C2FF',background:'rgba(247,194,255,.1)',
          padding:'3px 8px',borderRadius:999
        }}>Beta</span>
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <button style={{
          background:'#1A1A1D',border:'1px solid #3A3A40',borderRadius:999,
          padding:'6px 12px 6px 6px',display:'flex',alignItems:'center',gap:8,
          color:'#F4F4F5',fontFamily:'inherit',fontSize:13,cursor:'pointer'
        }}>
          <span style={{width:22,height:22,borderRadius:'50%',background:'#627EEA',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff'}}>Ξ</span>
          Ethereum ▾
        </button>
        <button style={{
          background:'#1A1A1D',border:'1px solid #3A3A40',borderRadius:999,
          padding:'6px 12px 6px 6px',display:'flex',alignItems:'center',gap:8,
          color:'#F4F4F5',fontFamily:'inherit',fontSize:13,cursor:'pointer'
        }}>
          <span style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#F7C2FF,#5C67FF)'}}/>
          0x7a2f…9c1e ▾
        </button>
      </div>
    </header>
  );
}
window.SideNav = SideNav;
window.TopBar = TopBar;
