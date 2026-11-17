// $HODL wallet: price sparkline, sell and buy, pump and dump once you own the exchange.
import { select, type Engine } from '../../../engine/index.ts';
import { Btn } from '../../components/common.tsx';
import { money } from '../../copy.ts';

function Spark(p: { data: number[] }) {
  const d = p.data.length > 1 ? p.data : [p.data[0] ?? 100, p.data[0] ?? 100];
  const min = Math.min(...d);
  const max = Math.max(...d);
  const span = Math.max(1, max - min);
  const W = 600;
  const H = 120;
  const pts = d.map((v, i) => `${(i / (d.length - 1)) * W},${H - 10 - ((v - min) / span) * (H - 20)}`);
  const last = d[d.length - 1];
  const up = last >= d[0];
  const col = up ? 'var(--lime)' : 'var(--red)';
  return (
    <svg class="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`$HODL price history: from ${d[0]} to ${last}, low ${min}, high ${max}`}>
      <polyline points={`0,${H} ${pts.join(' ')} ${W},${H}`} fill={up ? 'rgba(166,255,77,.08)' : 'rgba(255,46,62,.08)'} stroke="none" />
      <polyline points={pts.join(' ')} fill="none" stroke={col} stroke-width="2" vector-effect="non-scaling-stroke" />
      <text x="4" y="12" fill="var(--ink-faint)" font-size="11">{max}</text>
      <text x="4" y={H - 2} fill="var(--ink-faint)" font-size="11">{min}</text>
    </svg>
  );
}

export function WalletPanel(p: { engine: Engine }) {
  const e = p.engine;
  const eco = select.economyView(e);
  const coin = eco.coin;
  const price = eco.coinPrice;
  const affordable = Math.floor((e.state.player.credits / price) * 100) / 100;
  const sells = [0.25, 0.5, 1].map((f) => Math.floor(coin * f * 1000) / 1000);
  const pumpWait = eco.pumpReadyAt > e.state.cycle ? eco.pumpReadyAt - e.state.cycle : 0;
  return (
    <div class="grid-2">
      <section class="win">
        <div class="win-head">
          <h2 class="h-sub">Price</h2>
          <span class="h-panel c-amber" style={{ fontSize: '1.467rem' }}>{price}¤</span>
        </div>
        <div class="win-body">
          <Spark data={eco.coinHistory} />
          <div class="faint" style={{ fontSize: '0.867rem', marginTop: '6px' }}>Last {eco.coinHistory.length} price steps. The price moves every 10 cycles and reacts to the news.</div>
        </div>
      </section>
      <section class="win">
        <div class="win-head">
          <h2 class="h-sub">Your coin</h2>
          <span class="h-panel" style={{ fontSize: '1.467rem' }}>{coin.toFixed(3)}</span>
        </div>
        <div class="win-body stack">
          <div class="dim">Worth {money(eco.coinValue)} now.</div>
          <div class="hstack">
            {sells.map((a, i) => (
              <Btn class="money" ui={`coin-sell-${['quarter', 'half', 'all'][i]}`} action={{ type: 'coin/sell', amount: a }} blocked={a <= 0 ? 'no coin' : null}>
                Sell {['¼', '½', 'all'][i]} ({money(a * price)})
              </Btn>
            ))}
          </div>
          <div class="hstack">
            {[1, 5].map((n) => (
              <Btn class="small" ui={`coin-buy-${n}`} action={{ type: 'coin/buy', amount: n }} blocked={e.state.player.credits < n * price ? `needs ${money(n * price)}` : null}>
                Buy {n} ({money(n * price)})
              </Btn>
            ))}
            <Btn class="small" ui="coin-buy-max" action={{ type: 'coin/buy', amount: affordable }} blocked={affordable <= 0 ? 'no credits' : null}>Buy max ({affordable})</Btn>
          </div>
          <div class="hstack" style={{ borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
            <Btn class="small hot" ui="pump" action={{ type: 'exchange/pump' }} tip="Price ×1.5. +5 heat. Then a cooldown.">Pump</Btn>
            <Btn class="small" ui="dump" action={{ type: 'exchange/dump' }} tip="Price ×0.6. +5 heat. Then a cooldown.">Dump</Btn>
            <span class="faint" style={{ fontSize: '0.867rem' }}>{eco.exchange ? eco.exchange : pumpWait ? `Ready in ${pumpWait} cycles.` : 'The exchange is yours. Move the market.'}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
