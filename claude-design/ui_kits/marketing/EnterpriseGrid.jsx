function EnterpriseGrid() {
  const items = [
    {h:'Premium support & services',p:'Get personalized support with a dedicated account manager, enterprise-level SLAs, and rapid response to accelerate your go-to-market.'},
    {h:'Scalability & performance',p:'Cloud-native platform delivers peak performance and responsiveness with modular architecture and advanced caching.'},
    {h:'Constant product releases',p:'Future-proof your product roadmap with never-ending access to all the new DEXs, solvers, bridges, and blockchain ecosystems.'},
    {h:'Cohesive data & analytics',p:'Analytics offer insights into user activity, trends, and fees — enabling data-driven decisions to optimize performance and growth.'}
  ];
  return (
    <section style={{padding:'80px 32px',maxWidth:1280,margin:'0 auto'}}>
      <Eyebrow>for_enterprise</Eyebrow>
      <h2 style={{fontSize:44,fontWeight:500,letterSpacing:'-0.03em',lineHeight:1.1,margin:'0 0 48px',maxWidth:720}}>
        Why enterprises trust LI.FI
      </h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:0,border:'1px solid #1A1A1D',borderRadius:16,overflow:'hidden'}}>
        {items.map((it,i)=>(
          <div key={it.h} style={{
            padding:'36px 32px',
            borderRight:i%2===0?'1px solid #1A1A1D':'none',
            borderBottom:i<2?'1px solid #1A1A1D':'none'
          }}>
            <h3 style={{fontSize:20,fontWeight:500,letterSpacing:'-0.01em',margin:'0 0 12px'}}>{it.h}</h3>
            <p style={{color:'#B4B4BD',fontSize:14,lineHeight:1.6,margin:0,maxWidth:440}}>{it.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
window.EnterpriseGrid = EnterpriseGrid;
