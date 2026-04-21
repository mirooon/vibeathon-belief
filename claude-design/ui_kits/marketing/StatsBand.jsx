function Eyebrow({children}) {
  return (
    <div style={{
      fontFamily:'var(--font-mono)',fontSize:13,color:'#8A8A94',
      letterSpacing:'.02em',marginBottom:20
    }}>
      <span style={{color:'#F7C2FF'}}>//</span>{children}
    </div>
  );
}

function StatsBand() {
  return (
    <section style={{padding:'80px 32px',maxWidth:1280,margin:'0 auto'}}>
      <Eyebrow>by_the_numbers</Eyebrow>
      <div style={{
        display:'grid',gridTemplateColumns:'1.2fr 1fr 1fr',gap:48,
        alignItems:'end',borderTop:'1px solid #26262A',paddingTop:40
      }}>
        <div>
          <h3 style={{fontSize:28,fontWeight:500,letterSpacing:'-0.02em',margin:0}}>
            1000+ partners trust LI.FI
          </h3>
          <p style={{color:'#B4B4BD',fontSize:15,lineHeight:1.55,margin:'14px 0 0',maxWidth:440}}>
            Go to market faster. No integration and maintenance overhead. Benefit from risk mitigation, fail-safety and seamless interoperability across a vast set of underlying protocols.
          </p>
        </div>
        <div>
          <div style={{
            fontSize:64,fontWeight:500,letterSpacing:'-0.04em',lineHeight:1,
            fontVariantNumeric:'tabular-nums',
            background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',
            WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'
          }}>$80B+</div>
          <div style={{color:'#8A8A94',fontSize:13,marginTop:8}}>Total transfer volume</div>
        </div>
        <div>
          <div style={{
            fontSize:64,fontWeight:500,letterSpacing:'-0.04em',lineHeight:1,
            fontVariantNumeric:'tabular-nums',
            background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',
            WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'
          }}>100M+</div>
          <div style={{color:'#8A8A94',fontSize:13,marginTop:8}}>Total transfers</div>
        </div>
      </div>
    </section>
  );
}
window.StatsBand = StatsBand;
window.Eyebrow = Eyebrow;
