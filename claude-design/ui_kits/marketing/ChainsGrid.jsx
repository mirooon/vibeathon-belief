function ChainsGrid() {
  const chains = [
    {n:'Ethereum',c:'#627EEA',g:'Ξ'},
    {n:'Solana',c:'linear-gradient(135deg,#9945FF,#14F195)',g:'◎'},
    {n:'Arbitrum',c:'#28A0F0',g:'AR'},
    {n:'Bnb',c:'#F3BA2F',g:'B'},
    {n:'Linea',c:'#121212',g:'L', border:'#3A3A40'},
    {n:'Polygon',c:'#8247E5',g:'P'},
    {n:'Bitcoin',c:'#F7931A',g:'₿'},
    {n:'Optimism',c:'#FF0420',g:'OP'},
    {n:'Avalanche',c:'#E84142',g:'A'},
    {n:'ZkSync',c:'#1E69FF',g:'Zk'},
    {n:'Metis',c:'#00CFFF',g:'M'},
    {n:'Base',c:'#0052FF',g:'B'}
  ];
  return (
    <section style={{padding:'80px 32px',maxWidth:1280,margin:'0 auto'}}>
      <Eyebrow>any_chain</Eyebrow>
      <h2 style={{fontSize:44,fontWeight:500,letterSpacing:'-0.03em',lineHeight:1.1,margin:'0 0 48px',maxWidth:720}}>
        Swap & bridge liquidity across 60+ chains
      </h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:0,border:'1px solid #1A1A1D',borderRadius:16,overflow:'hidden'}}>
        {chains.map((c,i)=>(
          <div key={c.n} style={{
            padding:'32px 16px',display:'flex',flexDirection:'column',alignItems:'center',gap:14,
            borderRight: i%6!==5 ? '1px solid #1A1A1D' : 'none',
            borderBottom: i<6 ? '1px solid #1A1A1D' : 'none',
            transition:'background .15s',
            cursor:'pointer'
          }}
          onMouseEnter={e=>e.currentTarget.style.background='#0A0A0B'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{
              width:44,height:44,borderRadius:'50%',background:c.c,
              border:c.border?`1px solid ${c.border}`:'none',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:16,fontWeight:700,color:'#fff'
            }}>{c.g}</div>
            <div style={{fontSize:13,color:'#B4B4BD'}}>{c.n}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
window.ChainsGrid = ChainsGrid;
