const { useState } = React;

function TokenChip({sym, color, glyph, onClick}) {
  return (
    <button onClick={onClick} style={{
      display:'flex',alignItems:'center',gap:8,
      background:'#1A1A1D',border:'1px solid #3A3A40',borderRadius:999,
      padding:'5px 12px 5px 5px',cursor:'pointer',
      fontFamily:'inherit',fontSize:14,color:'#F4F4F5',fontWeight:500
    }}>
      <span style={{
        width:28,height:28,borderRadius:'50%',background:color,
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:12,fontWeight:700,color:'#fff'
      }}>{glyph}</span>
      {sym}
      <span style={{color:'#8A8A94',fontSize:12,marginLeft:2}}>▾</span>
    </button>
  );
}

function TokenRow({label, amount, setAmount, usd, sym, color, glyph, balance, readOnly}) {
  return (
    <div style={{
      background:'#121214',border:'1px solid #26262A',borderRadius:16,padding:18,
      display:'flex',flexDirection:'column',gap:10
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:12,color:'#8A8A94',fontFamily:'var(--font-mono)'}}>{label}</span>
        <span style={{fontSize:12,color:'#8A8A94'}}>Balance: {balance}</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <input
          value={amount}
          onChange={e=>setAmount && setAmount(e.target.value)}
          readOnly={readOnly}
          style={{
            background:'transparent',border:0,outline:'none',color:'#F4F4F5',
            fontSize:30,fontWeight:500,letterSpacing:'-0.02em',
            fontVariantNumeric:'tabular-nums',flex:1,minWidth:0,fontFamily:'inherit'
          }}/>
        <TokenChip sym={sym} color={color} glyph={glyph}/>
      </div>
      <div style={{fontSize:12,color:'#8A8A94'}}>≈ ${usd}</div>
    </div>
  );
}

window.TokenRow = TokenRow;
window.TokenChip = TokenChip;
