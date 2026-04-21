function DevCards() {
  const cards = [
    {h:'Trading widget',p:'Enable trading on your app in less than 5 minutes.'},
    {h:'SDK documentation',p:'Take full control of your user journey.'},
    {h:'API reference',p:'Access the full suite of features and services.'}
  ];
  return (
    <section style={{padding:'80px 32px',maxWidth:1280,margin:'0 auto'}}>
      <Eyebrow>for_developers</Eyebrow>
      <h2 style={{fontSize:44,fontWeight:500,letterSpacing:'-0.03em',lineHeight:1.1,margin:'0 0 16px',maxWidth:720}}>
        Build smarter with a single API solution
      </h2>
      <p style={{color:'#B4B4BD',fontSize:16,lineHeight:1.55,maxWidth:720,margin:'0 0 40px'}}>
        Simplify your crypto journey with one powerful API. Seamlessly access all liquidity sources, optimize trade execution across chains, and leverage a suite of value-added services.
      </p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {cards.map(c=>(
          <a key={c.h} href="#" style={{
            background:'#1A1A1D',border:'1px solid #26262A',borderRadius:16,
            padding:'28px 24px 32px',textDecoration:'none',color:'#F4F4F5',
            transition:'all .2s cubic-bezier(.2,.8,.2,1)',display:'block',
            minHeight:180,position:'relative'
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#3A3A40';e.currentTarget.style.boxShadow='0 0 60px rgba(247,194,255,.1)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#26262A';e.currentTarget.style.boxShadow='none';}}>
            <h3 style={{fontSize:22,fontWeight:500,letterSpacing:'-0.01em',margin:'0 0 12px'}}>{c.h}</h3>
            <p style={{color:'#B4B4BD',fontSize:14,lineHeight:1.55,margin:0,maxWidth:260}}>{c.p}</p>
            <span style={{position:'absolute',right:24,bottom:24,fontSize:20,color:'#F7C2FF'}}>→</span>
          </a>
        ))}
      </div>
    </section>
  );
}
window.DevCards = DevCards;
