function PartnerQuote() {
  return (
    <section style={{padding:'80px 32px',maxWidth:1280,margin:'0 auto'}}>
      <Eyebrow>partners</Eyebrow>
      <div style={{
        background:'#0A0A0B',border:'1px solid #26262A',borderRadius:24,
        padding:'56px 48px',position:'relative',overflow:'hidden'
      }}>
        <div style={{
          position:'absolute',top:-100,right:-100,width:400,height:400,
          background:'radial-gradient(circle,rgba(92,103,255,.2),transparent 60%)',
          pointerEvents:'none'
        }}/>
        <div style={{position:'relative',zIndex:1,maxWidth:820}}>
          <span style={{
            display:'inline-block',fontSize:10,fontWeight:600,letterSpacing:'.1em',
            color:'#F7C2FF',background:'rgba(247,194,255,.1)',
            padding:'4px 10px',borderRadius:999,textTransform:'uppercase',marginBottom:28
          }}>Self-custody wallet</span>
          <blockquote style={{
            fontSize:32,fontWeight:500,letterSpacing:'-0.02em',lineHeight:1.25,
            margin:0,color:'#F4F4F5'
          }}>
            "Fast, efficient, and collaborative — LI.FI was a key enabler in upgrading our swap experience."
          </blockquote>
          <div style={{marginTop:28,display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:44,height:44,borderRadius:'50%',background:'#26262A'}}/>
            <div>
              <div style={{fontSize:14,fontWeight:500}}>Arnaud Leproux</div>
              <div style={{fontSize:13,color:'#8A8A94'}}>Senior Business Manager</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
window.PartnerQuote = PartnerQuote;
