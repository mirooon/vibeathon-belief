function Hero() {
  return (
    <section style={{
      position:'relative',padding:'120px 32px 100px',
      maxWidth:1280,margin:'0 auto',overflow:'hidden',textAlign:'center'
    }}>
      <div style={{
        position:'absolute',top:-160,left:'50%',transform:'translateX(-50%)',
        width:900,height:500,
        background:'radial-gradient(ellipse, rgba(247,194,255,.28), transparent 55%), radial-gradient(ellipse at 60% 40%, rgba(92,103,255,.35), transparent 55%)',
        pointerEvents:'none',filter:'blur(10px)',zIndex:0
      }}/>
      <div style={{position:'relative',zIndex:1}}>
        <h1 style={{
          fontSize:'clamp(56px, 7vw, 84px)',fontWeight:500,
          letterSpacing:'-0.03em',lineHeight:1.05,margin:'0 auto',maxWidth:920
        }}>
          Universal market access for{' '}
          <span style={{
            background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',
            WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'
          }}>digital assets</span>.
        </h1>
        <p style={{
          fontSize:18,color:'#B4B4BD',lineHeight:1.55,
          maxWidth:640,margin:'28px auto 0'
        }}>
          No more market fragmentation. Get best price execution across any DEX & bridge — trade stablecoins, RWAs and any other digital asset across all blockchain ecosystems with a single integration.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:36}}>
          <button style={{
            background:'#fff',color:'#000',border:0,borderRadius:8,
            padding:'13px 22px',fontFamily:'inherit',fontSize:14,fontWeight:500,cursor:'pointer'
          }}>Start your integration</button>
          <button style={{
            background:'transparent',color:'#F4F4F5',border:'1px solid #3A3A40',
            borderRadius:8,padding:'13px 22px',fontFamily:'inherit',fontSize:14,fontWeight:500,cursor:'pointer'
          }}>Contact sales</button>
        </div>
      </div>
    </section>
  );
}
window.Hero = Hero;
