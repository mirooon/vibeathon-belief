function Footer() {
  const cols = [
    {h:'Products',links:['API/SDK','Widget','LI.FI Composer','LI.FI Deposit','LI.FI Earn','Stablecoin API']},
    {h:'Docs',links:['Swap & Bridge API','Swap & Bridge SDK','Swap & Bridge Widget','Intent & Solver System','Composer','For AI Agents']},
    {h:'Use cases',links:['RWA','DeFi Protocols','Payments','Wallets','Neobanks','Agentic Commerce']},
    {h:'Company',links:['About','Careers','Brand Guidelines','Knowledge Hub','How It Works','Bug Bounty']}
  ];
  return (
    <footer style={{
      padding:'64px 32px 32px',maxWidth:1280,margin:'0 auto',
      borderTop:'1px solid #1A1A1D'
    }}>
      <div style={{display:'grid',gridTemplateColumns:'1.5fr repeat(4,1fr)',gap:32,marginBottom:48}}>
        <div>
          <img src="../../assets/logo_lifi_dark_horizontal.svg" height="22" alt="LI.FI"/>
          <p style={{color:'#8A8A94',fontSize:13,lineHeight:1.55,marginTop:20,maxWidth:240}}>
            Swap and move any crypto asset across any blockchain ecosystem.
          </p>
        </div>
        {cols.map(c=>(
          <div key={c.h}>
            <div style={{fontSize:13,color:'#F4F4F5',fontWeight:500,marginBottom:16}}>{c.h}</div>
            {c.links.map(l=>(
              <a key={l} href="#" style={{
                display:'block',color:'#8A8A94',fontSize:13,textDecoration:'none',
                padding:'6px 0',transition:'color .15s'
              }}
              onMouseEnter={e=>e.currentTarget.style.color='#F4F4F5'}
              onMouseLeave={e=>e.currentTarget.style.color='#8A8A94'}>{l}</a>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        display:'flex',justifyContent:'space-between',alignItems:'center',
        paddingTop:24,borderTop:'1px solid #1A1A1D',fontSize:12,color:'#8A8A94'
      }}>
        <span>LI.FI © 2026. All rights reserved.</span>
        <div style={{display:'flex',gap:20}}>
          <a href="#" style={{color:'#8A8A94',textDecoration:'none'}}>Privacy</a>
          <a href="#" style={{color:'#8A8A94',textDecoration:'none'}}>Terms & Conditions</a>
          <a href="#" style={{color:'#8A8A94',textDecoration:'none'}}>Imprint</a>
        </div>
      </div>
    </footer>
  );
}
window.Footer = Footer;
