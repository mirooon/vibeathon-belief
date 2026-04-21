const { useState: useS } = React;

function SwapWidget({onReview}) {
  const [from, setFrom] = useS('1.2450');
  const [to] = useS('4272.88');
  return (
    <div style={{
      width:480,background:'#0A0A0B',border:'1px solid #26262A',borderRadius:24,
      padding:20,display:'flex',flexDirection:'column',gap:12,
      boxShadow:'0 24px 80px rgba(0,0,0,.55), 0 0 80px rgba(247,194,255,.05)'
    }}>
      <div style={{
        display:'flex',justifyContent:'space-between',alignItems:'center',
        padding:'4px 6px 2px'
      }}>
        <div style={{display:'flex',gap:4}}>
          <Tab active>Exchange</Tab>
          <Tab>Gas</Tab>
          <Tab>Buy</Tab>
        </div>
        <button style={{background:'transparent',border:0,color:'#8A8A94',cursor:'pointer',fontSize:18,padding:4}}>⚙</button>
      </div>

      <TokenRow label="from" amount={from} setAmount={setFrom}
        usd="4,280.12" sym="ETH" color="#627EEA" glyph="Ξ" balance="2.541"/>

      <div style={{display:'flex',justifyContent:'center',margin:'-18px 0',position:'relative',zIndex:2}}>
        <button style={{
          width:40,height:40,borderRadius:12,
          background:'#121214',border:'1px solid #3A3A40',color:'#F4F4F5',
          display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
          fontSize:16,transition:'all .2s'
        }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='#5C67FF';e.currentTarget.style.color='#5C67FF'}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='#3A3A40';e.currentTarget.style.color='#F4F4F5'}}>
          ↓
        </button>
      </div>

      <TokenRow label="to" amount={to} readOnly
        usd="4,272.88" sym="USDC" color="#2775CA" glyph="$" balance="0.00"/>

      <RouteSummary rate="1 ETH = 3,435.24 USDC" gas="$2.41" time="~12s" slippage="0.5%"/>

      <button onClick={onReview} style={{
        marginTop:4,background:'linear-gradient(135deg,#F7C2FF,#5C67FF)',
        color:'#0A0A0B',border:0,borderRadius:12,padding:'16px',
        fontFamily:'inherit',fontSize:15,fontWeight:600,cursor:'pointer',
        boxShadow:'0 0 40px rgba(92,103,255,.3)'
      }}>Review swap</button>
    </div>
  );
}
function Tab({children, active}) {
  return (
    <button style={{
      background:active?'#1A1A1D':'transparent',
      border:0,color:active?'#F4F4F5':'#8A8A94',
      fontFamily:'inherit',fontSize:13,fontWeight:500,
      padding:'7px 14px',borderRadius:999,cursor:'pointer'
    }}>{children}</button>
  );
}
window.SwapWidget = SwapWidget;
