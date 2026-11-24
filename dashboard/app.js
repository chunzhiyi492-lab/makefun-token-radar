// Token Radar's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts) and
// renders the ranked board, a filterable and sortable table, a per-protocol detail view with the
// model's own inputs and the protocol's farm plan, and the live-token set kept apart. No network:
// every byte it shows is in data.js. The farm plan is generated here from the same rules as the
// board's own farm_steps, so the page and board.json agree step for step.
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) { document.getElementById('rows').innerHTML = '<tr><td colspan="8">No radar data: data.js did not load.</td></tr>'; return; }

  /* ---------- formatting ---------- */
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return '$' + Math.round(n);
  }
  function pct(v) {
    if (v === null || v === undefined) return '<span>\u2014</span>';
    var s = (v > 0 ? '+' : '') + v.toFixed(1) + '%';
    return '<span class="' + (v >= 0 ? 'up' : 'down') + '">' + s + '</span>';
  }
  function ageText(days) {
    if (days === null || days === undefined) return '\u2014';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.floor(days / 30) + 'mo';
    var y = Math.floor(days / 365), m = Math.floor((days % 365) / 30);
    return y + 'y' + (m ? ' ' + m + 'mo' : '');
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------- farm plan: the same rules as lib/model.ts ---------- */
  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open, borrowing nothing you cannot repay.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + '\'s main pool on ' + chain + ', in a range or pair the app itself suggests, and keep the position open.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ', open one small hedged position, and close it within the week.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' on ' + name + ' and take one position in a market that settles in the next 30 days.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares for the full hold period.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + ' and hold it.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + ' of ' + name + '\'s yield-bearing asset on ' + chain + ' and hold it; check its redemption terms first.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active.';
    if (c.indexOf('payment') >= 0) return 'Route one real payment of $' + capital + ' through ' + name + ' on ' + chain + ' and keep the receipt.';
    if (c.indexOf('basis') >= 0) return 'Deposit $' + capital + ' into ' + name + '\'s basis strategy on ' + chain + ' and hold the position.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function farmSteps(p) {
    var chain = p.chains.length > 0 ? p.chains[0] : 'its main chain';
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var steps = [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline, never in a screenshot or a chat.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas', time: '15 minutes to set up' },
      { text: 'Do one qualifying action each week on ' + chain + ', such as a deposit, a borrow, a swap or a vote, so the wallet shows a pattern rather than one visit.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot, and do not move the funds to another wallet mid-way.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: 'Open ' + p.name + '\'s own docs and announcements and look for a points or rewards program; if one exists, follow only the links it publishes, and never pay a fee to claim.', cost: 'no fee to check', time: '10 minutes' },
      { text: 'Remember a token may never launch, so farm only with money you can afford to lose, and write the wallet, the dates and every transaction hash in a farm log.', cost: 'nothing but the log', time: '5 minutes' }
    ];
    return steps.map(function (s) {
      var t = s.text + ' Cost: ' + s.cost + '. Time: ' + s.time + '.';
      if (t.length > 600) t = t.slice(0, 596) + '...';
      return t;
    });
  }

  /* ---------- state ---------- */
  var state = { q: '', cat: '', wl: false, sort: 'implied', selected: null };
  var cats = [];
  D.rows.forEach(function (r) { if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category); });
  cats.sort();
  var catSel = document.getElementById('cat');
  cats.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o); });

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var rows = D.rows.filter(function (r) {
      if (state.wl && !r.watchlist) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.indexOf(q) < 0) return false;
      return true;
    });
    var key = state.sort;
    rows.sort(function (a, b) {
      if (key === 'tvl') return b.tvl_usd - a.tvl_usd;
      if (key === 'change') return (b.change_7d === null ? -1e9 : b.change_7d) - (a.change_7d === null ? -1e9 : a.change_7d);
      if (key === 'age') return (b.age_days === null ? -1 : b.age_days) - (a.age_days === null ? -1 : a.age_days);
      if (key === 'rank') return a.rank - b.rank;
      return b.implied_value_usd - a.implied_value_usd;
    });
    return rows;
  }

  function rowHtml(r) {
    var chains = r.chains.slice(0, 1).join(', ') + (r.chains.length > 1 ? ' +' + (r.chains.length - 1) : '');
    return '<tr data-slug="' + esc(r.slug) + '"' + (state.selected === r.slug ? ' class="selected"' : '') + '>' +
      '<td class="num">' + r.rank + '</td>' +
      '<td class="proto"><span class="name">' + esc(r.name) + '</span><span class="slug">' + esc(r.slug) + '</span>' + (r.watchlist ? '<span class="badge">WATCHLIST</span>' : '') + '</td>' +
      '<td class="cat">' + esc(r.category || '\u2014') + '</td>' +
      '<td>' + esc(chains || '\u2014') + '</td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num">' + pct(r.change_7d) + '</td>' +
      '<td class="num">' + ageText(r.age_days) + '</td>' +
      '<td class="num implied">' + money(r.implied_value_usd) + '</td></tr>';
  }

  function render() {
    var rows = filtered();
    document.getElementById('rows').innerHTML = rows.map(rowHtml).join('') ||
      '<tr><td colspan="8">Nothing matches this filter.</td></tr>';
    document.getElementById('count').textContent = rows.length + ' of ' + D.rows.length + ' ranked';
  }

  function showDetail(slug) {
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    var box = document.getElementById('detail');
    if (!r) { box.hidden = true; state.selected = null; return; }
    state.selected = slug;
    var mult = 'TVL ' + money(r.tvl_usd) + ' \u00d7 0.35 \u00d7 category ' + r.category_multiplier.toFixed(2) +
      ' \u00d7 growth ' + r.growth_multiplier.toFixed(2) + ' \u00d7 maturity ' + r.maturity_multiplier.toFixed(2) +
      ' \u00d7 chains ' + r.chain_multiplier.toFixed(2) + ' = ' + money(r.implied_value_usd);
    box.innerHTML =
      '<h2>#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' &middot; ' + esc(r.category || 'Uncategorised') + ' &middot; ' + esc(r.chains.join(', ') || 'no chain listed') +
      (r.watchlist ? ' &middot; <span class="badge">ON THE WATCHLIST</span>' : ' &middot; Early find, below the $50M watchlist floor') + '</p>' +
      '<dl>' +
      '<div><dt>Implied value</dt><dd>' + money(r.implied_value_usd) + '</dd></div>' +
      '<div><dt>TVL</dt><dd>' + money(r.tvl_usd) + '</dd></div>' +
      '<div><dt>7-day change</dt><dd>' + (r.change_7d === null ? '\u2014' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</dd></div>' +
      '<div><dt>Listed since</dt><dd>' + esc(r.listed_at || 'not reported') + ' (' + ageText(r.age_days) + ')</dd></div>' +
      '<div><dt>Token</dt><dd>None recorded</dd></div>' +
      '</dl>' +
      '<h3>How the value is built</h3><p>' + esc(mult) + '</p>' +
      '<h3>How to farm it</h3><ol>' + farmSteps(r).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    box.hidden = false;
    render();
    window.scrollTo(0, box.getBoundingClientRect().top + window.scrollY - 16);
  }

  /* ---------- header stats and live view ---------- */
  var top = D.rows[0];
  document.getElementById('stats').innerHTML =
    '<div><dt>Protocols scanned</dt><dd>758</dd></div>' +
    '<div><dt>Watchlist</dt><dd>' + D.watchlist_size + '</dd></div>' +
    '<div><dt>Ranked</dt><dd>' + D.board_size + '</dd></div>' +
    '<div><dt>Top implied value</dt><dd>' + money(top.implied_value_usd) + '</dd></div>' +
    '<div><dt>Snapshot</dt><dd>' + esc(D.as_of) + '</dd></div>';
  document.getElementById('live').innerHTML =
    '<h2>Already trading &mdash; kept apart</h2>' +
    '<p>These protocols already have a token, so the board shows the market&rsquo;s own value for them, never a model&rsquo;s. They are not ranked for a launch.</p>' +
    '<table><thead><tr><th>Protocol</th><th>Category</th><th>TVL</th><th>Market cap</th><th>7d</th></tr></thead><tbody>' +
    D.live.map(function (p) {
      return '<tr><td><span class="name">' + esc(p.name) + '</span><span class="slug">' + esc(p.slug) + '</span></td><td>' + esc(p.category || '\u2014') + '</td><td class="num">' + money(p.tvl_usd) + '</td><td class="num">' + money(p.mcap_usd || 0) + '</td><td class="num">' + pct(p.change_7d) + '</td></tr>';
    }).join('') + '</tbody></table>';

  /* ---------- events ---------- */
  document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
  catSel.addEventListener('change', function (e) { state.cat = e.target.value; render(); });
  document.getElementById('wl').addEventListener('change', function (e) { state.wl = e.target.checked; render(); });
  document.getElementById('sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
  document.getElementById('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) showDetail(tr.getAttribute('data-slug'));
  });
  document.querySelectorAll('thead th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-sort');
      state.sort = k === 'rank' ? 'rank' : k === 'tvl' ? 'tvl' : k === 'change' ? 'change' : k === 'age' ? 'age' : 'implied';
      document.getElementById('sort').value = state.sort;
      render();
    });
  });

  /* ---------- deep links for the three screenshots ---------- */
  var hash = (location.hash || '').replace(/^#/, '');
  var params = {};
  hash.split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) params[p[0]] = decodeURIComponent(p[1] || ''); });
  if (params.watchlist === '1') { state.wl = true; document.getElementById('wl').checked = true; }
  if (params.cat) { state.cat = params.cat; catSel.value = params.cat; }
  if (params.q) { state.q = params.q; document.getElementById('q').value = params.q; }
  render();
  if (params.detail) showDetail(params.detail);
})();
