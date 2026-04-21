/* =========================================================
   Belief — mock data for the France 2026 World Cup market.
   All numbers are static; all routing math is recomputed from
   the depth ladder below so it stays consistent if you tweak.
   ========================================================= */

const MARKET = {
  id: 'france-wc-2026',
  title: 'Will France win the 2026 FIFA World Cup?',
  category: 'Sports',
  resolvesOn: 'July 19, 2026',
  venueCount: 3,
  outcomes: [
    { id: 'france',    label: 'France',    yes: 0.51,  no: 0.49  },
    { id: 'argentina', label: 'Argentina', yes: 0.22,  no: 0.78  },
    { id: 'brazil',    label: 'Brazil',    yes: 0.14,  no: 0.86  },
    { id: 'spain',     label: 'Spain',     yes: 0.09,  no: 0.91  },
    { id: 'other',     label: 'Field',     yes: 0.04,  no: 0.96  },
  ],
};

/* Per-venue YES France ask-side ladder */
const VENUES = [
  {
    id:'polymarket', name:'Polymarket', dot:'#1E88FF', feeRate:0.002,
    bestBid:{price:0.495, size:420},
    ask:[
      {price:0.510, size:500},
      {price:0.520, size:800},
      {price:0.530, size:1200},
    ],
  },
  {
    id:'kalshi', name:'Kalshi', dot:'#4BD8B0', feeRate:0.001,
    bestBid:{price:0.520, size:350},
    ask:[
      {price:0.535, size:400},
      {price:0.540, size:600},
      {price:0.550, size:1000},
    ],
  },
  {
    id:'myriad', name:'Myriad', dot:'#B4B4BD', feeRate:0.0015,
    bestBid:{price:0.545, size:220},
    ask:[
      {price:0.560, size:300},
      {price:0.570, size:500},
      {price:0.580, size:700},
    ],
  },
];

/* ~7 days of mock best-price timeseries, trending 0.42 → 0.51.
   We produce an aggregated series plus per-venue series where
   each individual venue stays at-or-worse-than the aggregate. */
function generateChartSeries() {
  const days = 7;
  const pointsPerDay = 24; // hourly
  const total = days * pointsPerDay;
  const agg = [];
  const poly = [];
  const kal = [];
  const myr = [];
  for (let i = 0; i < total; i++) {
    const t = i / (total - 1);
    // smooth rise with wobble
    const base = 0.42 + t * 0.09;
    const wobble = Math.sin(i * 0.35) * 0.008 + Math.sin(i * 0.12) * 0.006;
    const a = +(base + wobble).toFixed(4);
    agg.push(a);
    // each venue is a bit worse than aggregate
    poly.push(+(a + 0.004 + Math.sin(i * 0.5) * 0.003).toFixed(4));
    kal.push( +(a + 0.012 + Math.cos(i * 0.4) * 0.004).toFixed(4));
    myr.push( +(a + 0.021 + Math.sin(i * 0.3 + 1) * 0.005).toFixed(4));
  }
  // timestamps: hourly ending "now"
  const now = new Date('2026-04-21T14:00:00Z').getTime();
  const hour = 3600 * 1000;
  const times = [];
  for (let i = 0; i < total; i++) {
    times.push(now - (total - 1 - i) * hour);
  }
  return { times, agg, poly, kal, myr };
}
const CHART = generateChartSeries();

/* ---------- Routing math ---------- *
   Given a desired number of shares, walk the ask ladder and
   return { fills:[{venueId, price, size}], filled, unfilled,
            blended, feesUsd }.
*/
function walkLadder(ladder, desired) {
  const fills = [];
  let remaining = desired;
  for (const lvl of ladder) {
    if (remaining <= 0) break;
    const take = Math.min(lvl.size, remaining);
    fills.push({ ...lvl, take });
    remaining -= take;
  }
  return { fills, unfilled: remaining };
}
function priceCost(fills) {
  return fills.reduce((s,f) => s + f.price * f.take, 0);
}

function computeRoutes(desired) {
  // Product model: top-of-book only.
  // Optimal: one entry per venue (best ask), sort ascending, walk.
  const merged = VENUES
    .map(v => ({ price: v.ask[0].price, size: v.ask[0].size, venueId: v.id, feeRate: v.feeRate }))
    .sort((a,b) => a.price - b.price);
  const { fills: optFills, unfilled: optUnfilled } =
    walkLadder(merged.map(l=>({price:l.price,size:l.size, venueId:l.venueId, feeRate:l.feeRate})), desired);
  const optFilled = desired - optUnfilled;
  const optCost = priceCost(optFills);
  const optFees = optFills.reduce((s,f)=> s + f.price*f.take*f.feeRate, 0);
  const optBlended = optFilled > 0 ? optCost / optFilled : 0;

  // Per-venue: walk ONLY that venue's top-of-book (same top-of-book rule)
  const perVenue = VENUES.map(v => {
    const ladder = [{ price:v.ask[0].price, size:v.ask[0].size, venueId:v.id, feeRate:v.feeRate }];
    const { fills, unfilled } = walkLadder(ladder, desired);
    const filled = desired - unfilled;
    const cost = priceCost(fills);
    const fees = fills.reduce((s,f)=> s + f.price*f.take*v.feeRate, 0);
    const blended = filled > 0 ? cost / filled : 0;
    return {
      id: v.id,
      label: `${v.name} only`,
      venueName: v.name,
      dot: v.dot,
      fills,
      filled, unfilled,
      cost, fees, blended,
      requested: desired,
    };
  });

  const optimal = {
    id:'optimal',
    label:'Best blended',
    isOptimal:true,
    fills: optFills,
    filled: optFilled,
    unfilled: optUnfilled,
    cost: optCost,
    fees: optFees,
    blended: optBlended,
    requested: desired,
  };

  return [optimal, ...perVenue];
}

/* Helpers exposed globally for Babel-scoped scripts */
window.MARKET  = MARKET;
window.VENUES  = VENUES;
window.CHART   = CHART;
window.computeRoutes = computeRoutes;

/* Tiny formatters */
window.fmt = {
  usd: (n) => '$' + (n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  usd4: (n) => '$' + (n).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
  price: (n) => '$' + n.toFixed(n < 1 ? 4 : 2).replace(/0+$/,'').replace(/\.$/, '.00'),
  pct: (n) => (n*100).toFixed(1) + '%',
  bps: (n) => Math.round(n*10000) + ' bps',
  int: (n) => Math.round(n).toLocaleString('en-US'),
  price2: (n) => '$' + n.toFixed(2),
  price3: (n) => '$' + n.toFixed(3),
  price4: (n) => '$' + n.toFixed(4),
};
