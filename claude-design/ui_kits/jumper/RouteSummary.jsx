function RouteSummary({gas, time, slippage, rate}) {
  return (
    <div style={{
      background:'#121214',border:'1px solid #26262A',borderRadius:12,
      padding:'14px 16px',display:'flex',flexDirection:'column',gap:10,fontSize:13
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{color:'#8A8A94'}}>Best route</span>
        <span style={{
          display:'inline-flex',alignItems:'center',gap:6,
          background:'rgba(52,211,153,.1)',color:'#34D399',
          padding:'3px 10px',borderRadius:999,fontSize:11,fontWeight:500
        }}>
          <span style={{width:5,height:5,borderRadius:'50%',background:'#34D399'}}/>
          Across Protocol
        </span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,paddingTop:4}}>
        <Field label="Rate" value={rate}/>
        <Field label="Est. gas" value={gas}/>
        <Field label="Est. time" value={time}/>
        <Field label="Slippage" value={slippage}/>
      </div>
    </div>
  );
}
function Field({label, value}) {
  return (
    <div>
      <div style={{color:'#8A8A94',fontSize:11,fontFamily:'var(--font-mono)',marginBottom:3}}>{label}</div>
      <div style={{color:'#F4F4F5',fontSize:13,fontWeight:500,fontVariantNumeric:'tabular-nums'}}>{value}</div>
    </div>
  );
}
window.RouteSummary = RouteSummary;
