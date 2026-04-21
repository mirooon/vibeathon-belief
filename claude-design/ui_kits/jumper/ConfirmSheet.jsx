function ConfirmSheet({onClose}) {
  return (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:100
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:440,background:'#0A0A0B',border:'1px solid #26262A',borderRadius:24,
        padding:24,boxShadow:'0 24px 80px rgba(0,0,0,.7)'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{margin:0,fontSize:18,fontWeight:500}}>Confirm swap</h3>
          <button onClick={onClose} style={{background:'transparent',border:0,color:'#8A8A94',fontSize:20,cursor:'pointer'}}>×</button>
        </div>
        <div style={{background:'#121214',border:'1px solid #26262A',borderRadius:16,padding:18,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{width:32,height:32,borderRadius:'50%',background:'#627EEA',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff'}}>Ξ</span>
              <div>
                <div style={{fontSize:16,fontWeight:500,fontVariantNumeric:'tabular-nums'}}>1.2450 ETH</div>
                <div style={{fontSize:12,color:'#8A8A94'}}>on Ethereum · $4,280.12</div>
              </div>
            </div>
          </div>
          <div style={{borderTop:'1px dashed #26262A',paddingTop:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{width:32,height:32,borderRadius:'50%',background:'#2775CA',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff'}}>$</span>
              <div>
                <div style={{fontSize:16,fontWeight:500,fontVariantNumeric:'tabular-nums'}}>4,272.88 USDC</div>
                <div style={{fontSize:12,color:'#8A8A94'}}>on Arbitrum · $4,272.88</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{background:'#121214',border:'1px solid #26262A',borderRadius:12,padding:14,fontSize:13,display:'flex',flexDirection:'column',gap:8}}>
          <Row l="Rate" v="1 ETH = 3,435.24 USDC"/>
          <Row l="Network fee" v="$2.41"/>
          <Row l="Bridge" v="Across Protocol"/>
          <Row l="Estimated time" v="~12 seconds"/>
          <Row l="Slippage tolerance" v="0.5%"/>
        </div>
        <button style={{
          width:'100%',marginTop:16,
          background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',color:'#0A0A0B',
          border:0,borderRadius:12,padding:'16px',
          fontFamily:'inherit',fontSize:15,fontWeight:600,cursor:'pointer',
          boxShadow:'0 0 40px rgba(92,103,255,.3)'
        }}>Confirm & sign</button>
      </div>
    </div>
  );
}
function Row({l,v}) {
  return <div style={{display:'flex',justifyContent:'space-between'}}>
    <span style={{color:'#8A8A94'}}>{l}</span>
    <span style={{color:'#F4F4F5',fontVariantNumeric:'tabular-nums'}}>{v}</span>
  </div>;
}
window.ConfirmSheet = ConfirmSheet;
