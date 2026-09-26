import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from 'recharts';
import { ChartPieIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, BanknotesIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { useData } from '../context/DataContext';
import { PageHeader, Stat, Card, Empty, ChartTooltip, Legend, Segmented } from '../components/ui';
import { money, moneyCompact, pct, toneClass } from '../lib/format';
import {
  addDays, addMonths, daysBetween, endOfMonth, formatDate, monthKey, monthLabel, monthsBetween, startOfMonth, todayISO, weekdayIndex, WEEKDAYS, parseISO,
} from '../lib/dates';
import { SERIES, OTHER, INCOME, EXPENSE, CHART } from '../lib/colors';
import { excludedCategories, kindOf } from '../lib/categories';

const RANGES = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

function rangeFor(value, earliest) {
  const t = todayISO();
  const som = startOfMonth(t);
  switch (value) {
    case '1m': return [som, endOfMonth(t)];
    case '3m': return [addMonths(som, -2), endOfMonth(t)];
    case '6m': return [addMonths(som, -5), endOfMonth(t)];
    case 'ytd': return [`${t.slice(0, 4)}-01-01`, endOfMonth(t)];
    case '1y': return [addMonths(som, -11), endOfMonth(t)];
    default: return [startOfMonth(earliest || t), endOfMonth(t)];
  }
}

const INVESTED = SERIES[2];

const axisProps = { stroke: CHART.axis, fontSize: 12, tickLine: false, axisLine: false };

export default function Insights() {
  const { transactions, settings } = useData();
  const excluded = useMemo(() => excludedCategories(settings), [settings]);
  const isSpend = t => t.type === 'expense' && !excluded.has(t.category);
  const [range, setRange] = useState('6m');
  const [focusCat, setFocusCat] = useState(null);

  const earliest = useMemo(() => transactions.reduce((m, t) => (t.date < m ? t.date : m), todayISO()), [transactions]);
  const [from, to] = rangeFor(range, earliest);
  const spanDays = daysBetween(from, to) + 1;
  const prevFrom = range === '1m' ? addMonths(from, -1) : addDays(from, -spanDays);
  const prevTo = addDays(from, -1);
  const daily = spanDays <= 31;

  // Stable colour per category, based on all-time spending rank (so filters never repaint).
  const catColor = useMemo(() => {
    const totals = {};
    transactions.forEach(t => { if (isSpend(t)) totals[t.category] = (totals[t.category] || 0) + t.amount; });
    const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([k]) => k).filter(k => k !== 'Other');
    const map = {};
    ranked.forEach((c, i) => { map[c] = i < SERIES.length - 1 ? SERIES[i] : OTHER; });
    map.Other = OTHER;
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, excluded]);
  const colorOf = c => catColor[c] || OTHER;

  const stats = useMemo(() => {
    const cur = transactions.filter(t => t.date >= from && t.date <= to);
    const prev = transactions.filter(t => t.date >= prevFrom && t.date <= prevTo);
    const agg = list => {
      let income = 0, expense = 0, invested = 0;
      list.forEach(t => {
        const k = kindOf(t, excluded);
        if (k === 'income') income += t.amount;
        else if (k === 'invested') invested += t.amount;
        else expense += t.amount;
      });
      return { income, expense, invested, net: income - expense, rate: income > 0 ? (income - expense) / income : null };
    };
    const a = agg(cur);
    const b = agg(prev);

    // Buckets for cash-flow chart
    const keys = daily
      ? Array.from({ length: spanDays }, (_, i) => addDays(from, i))
      : monthsBetween(from, to);
    const buckets = Object.fromEntries(keys.map(k => [k, { key: k, income: 0, expense: 0, invested: 0 }]));
    cur.forEach(t => {
      const k = daily ? t.date : monthKey(t.date);
      if (buckets[k]) buckets[k][kindOf(t, excluded)] += t.amount;
    });
    const flow = keys.map(k => ({ ...buckets[k], net: buckets[k].income - buckets[k].expense }));

    // Category breakdown
    const catTotals = {};
    const prevCat = {};
    cur.forEach(t => { if (isSpend(t)) catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    prev.forEach(t => { if (isSpend(t)) prevCat[t.category] = (prevCat[t.category] || 0) + t.amount; });
    const categories = Object.entries(catTotals)
      .map(([name, value]) => ({ name, value, prev: prevCat[name] || 0, share: a.expense ? value / a.expense : 0 }))
      .sort((x, y) => y.value - x.value);

    // Donut: named categories that own a colour, the rest folded into Other
    const donut = [];
    let otherSum = 0;
    categories.forEach(c => {
      if (colorOf(c.name) === OTHER || c.name === 'Other') otherSum += c.value;
      else donut.push({ name: c.name, value: c.value });
    });
    if (otherSum > 0) donut.push({ name: 'Other', value: otherSum });

    // Category trend (monthly stacked)
    const trendCats = donut.map(d => d.name);
    const months = monthsBetween(from, to);
    const trend = months.map(m => {
      const row = { key: m };
      trendCats.forEach(c => { row[c] = 0; });
      return row;
    });
    const tIdx = Object.fromEntries(months.map((m, i) => [m, i]));
    cur.forEach(t => {
      if (!isSpend(t)) return;
      const row = trend[tIdx[monthKey(t.date)]];
      if (!row) return;
      const c = trendCats.includes(t.category) ? t.category : 'Other';
      row[c] = (row[c] || 0) + t.amount;
    });

    // Weekday averages
    const weeksInRange = Math.max(1, spanDays / 7);
    const wd = WEEKDAYS.map(d => ({ day: d, total: 0 }));
    cur.forEach(t => { if (isSpend(t) && (!focusCat || t.category === focusCat)) wd[weekdayIndex(t.date)].total += t.amount; });
    wd.forEach(d => { d.avg = d.total / weeksInRange; });

    // Top payees & largest
    const payees = {};
    cur.forEach(t => {
      if (!isSpend(t)) return;
      const k = t.title.trim().toLowerCase();
      payees[k] = payees[k] || { title: t.title, total: 0, count: 0 };
      payees[k].total += t.amount;
      payees[k].count++;
    });
    const topPayees = Object.values(payees).sort((x, y) => y.total - x.total).slice(0, 8);
    const largest = cur.filter(isSpend).sort((x, y) => y.amount - x.amount).slice(0, 6);

    const incomeSources = {};
    cur.forEach(t => { if (t.type === 'income') incomeSources[t.category] = (incomeSources[t.category] || 0) + t.amount; });

    const elapsed = Math.max(1, Math.min(spanDays, daysBetween(from, todayISO()) + 1));

    return {
      a, b, flow, categories, donut, trend, trendCats, wd, topPayees, largest,
      incomeSources: Object.entries(incomeSources).sort((x, y) => y[1] - x[1]),
      avgDaily: a.expense / elapsed,
      count: cur.length,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, from, to, prevFrom, prevTo, daily, spanDays, catColor, focusCat, excluded]);

  // Month-to-date pace vs last month (independent of range)
  const pace = useMemo(() => {
    const t = todayISO();
    const thisStart = startOfMonth(t);
    const lastStart = addMonths(thisStart, -1);
    const lastEnd = endOfMonth(lastStart);
    const days = 31;
    const cumThis = Array(days).fill(0);
    const cumLast = Array(days).fill(0);
    transactions.forEach(tx => {
      if (!isSpend(tx)) return;
      if (focusCat && tx.category !== focusCat) return;
      if (tx.date >= thisStart && tx.date <= t) cumThis[parseISO(tx.date).getDate() - 1] += tx.amount;
      else if (tx.date >= lastStart && tx.date <= lastEnd) cumLast[parseISO(tx.date).getDate() - 1] += tx.amount;
    });
    const today = parseISO(t).getDate();
    const lastDays = parseISO(lastEnd).getDate();
    let a = 0, b = 0;
    const rows = [];
    for (let i = 0; i < days; i++) {
      a += cumThis[i];
      b += cumLast[i];
      rows.push({ day: i + 1, 'This month': i < today ? a : null, 'Last month': i < lastDays ? b : null });
    }
    return { rows, thisTotal: a, lastSameDay: rows[today - 1]?.['Last month'] ?? b, lastTotal: b, thisLabel: monthLabel(monthKey(thisStart)), lastLabel: monthLabel(monthKey(lastStart)) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, focusCat, excluded]);

  if (!transactions.length) {
    return (
      <>
        <PageHeader eyebrow="Analyse" title="Insights" />
        <div className="card">
          <Empty icon={ChartPieIcon} title="Nothing to analyse yet" action={<Link to="/add" className="btn btn-primary">Add a transaction</Link>}>
            Once you’ve logged a few transactions, you’ll see spending by category, trends over time and more.
          </Empty>
        </div>
      </>
    );
  }

  const { a, b } = stats;
  const change = (cur, prev) => (prev ? (cur - prev) / prev : null);
  const bucketLabel = k => (daily ? formatDate(k, { year: false }) : monthLabel(k));
  const periodText = `${formatDate(from)} – ${formatDate(to > todayISO() ? todayISO() : to)}`;
  const focusedTrend = focusCat ? [focusCat] : stats.trendCats;

  return (
    <>
      <PageHeader
        eyebrow="Analyse"
        title="Insights"
        subtitle={periodText}
        actions={<Segmented value={range} onChange={v => { setRange(v); setFocusCat(null); }} options={RANGES} className="w-full md:w-auto [&>button]:flex-1" />}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-5">
        <Stat label="Income" value={money(a.income)} icon={ArrowTrendingUpIcon} sub={<Compare cur={a.income} prev={b.income} good="up" />} />
        <Stat label="Spending" value={money(a.expense)} icon={ArrowTrendingDownIcon} sub={<Compare cur={a.expense} prev={b.expense} good="down" />} />
        <Stat label="Net saved" value={money(a.net, { sign: true })} tone={toneClass(a.net)} icon={BanknotesIcon} sub={a.invested > 0 ? `incl. ${money(a.invested)} invested` : `${money(stats.avgDaily)} avg daily spend`} />
        <Stat label="Savings rate" value={a.rate == null ? '—' : pct(a.rate, { digits: 1 })} tone={a.rate == null ? '' : toneClass(a.rate)} icon={ScaleIcon}
          sub={b.rate == null ? `${stats.count} transactions` : `${pct(b.rate, { digits: 1 })} previous period`} />
      </div>

      <div className="grid gap-4 md:gap-5 xl:grid-cols-3 mb-5">
        <Card title="Cash flow" className="xl:col-span-2" action={<Legend items={[{ label: 'Income', color: INCOME }, { label: 'Spending', color: EXPENSE }, ...(a.invested > 0 ? [{ label: 'Invested', color: INVESTED }] : [])]} />}>
          <div className="h-[260px] -ml-2">
            <ResponsiveContainer>
              <BarChart data={stats.flow} barGap={2} barCategoryGap={daily ? '15%' : '28%'}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="key" tickFormatter={bucketLabel} {...axisProps} minTickGap={16} />
                <YAxis tickFormatter={moneyCompact} {...axisProps} width={56} />
                <Tooltip cursor={{ fill: 'rgba(26,77,57,0.06)' }} content={<ChartTooltip labelFormatter={bucketLabel} />} />
                <Bar dataKey="income" name="Income" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Spending" fill={EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                {a.invested > 0 && <Bar dataKey="invested" name="Invested" fill={INVESTED} radius={[4, 4, 0, 0]} maxBarSize={28} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Net savings">
          <div className="h-[260px] -ml-2">
            <ResponsiveContainer>
              <BarChart data={stats.flow}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="key" tickFormatter={bucketLabel} {...axisProps} minTickGap={16} />
                <YAxis tickFormatter={moneyCompact} {...axisProps} width={56} />
                <ReferenceLine y={0} stroke={CHART.axis} />
                <Tooltip cursor={{ fill: 'rgba(26,77,57,0.06)' }} content={<ChartTooltip labelFormatter={bucketLabel} valueFormatter={v => money(v, { sign: true })} />} />
                <Bar dataKey="net" name="Net" radius={[4, 4, 4, 4]} maxBarSize={28}>
                  {stats.flow.map(r => <Cell key={r.key} fill={r.net >= 0 ? '#1f7a4d' : '#b3413a'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-5 xl:grid-cols-5 mb-5">
        <Card title="Spending by category" className="xl:col-span-2" action={focusCat && <button className="btn btn-ghost btn-sm" onClick={() => setFocusCat(null)}>Show all</button>}>
          {stats.categories.length === 0 ? (
            <p className="text-sm text-ink-soft py-6">No spending in this period.</p>
          ) : (
            <>
              <div className="relative h-[220px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={stats.donut} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" stroke={CHART.surface} strokeWidth={2} isAnimationActive={false}
                      onClick={d => setFocusCat(f => (f === d.name || d.name === 'Other' ? null : d.name))}>
                      {stats.donut.map(d => <Cell key={d.name} fill={colorOf(d.name)} opacity={focusCat && focusCat !== d.name ? 0.3 : 1} className="cursor-pointer" />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-muted font-semibold">{focusCat || 'Total'}</div>
                    <div className="num text-base md:text-lg font-semibold text-forest-900">{money(focusCat ? stats.categories.find(c => c.name === focusCat)?.value : a.expense)}</div>
                  </div>
                </div>
              </div>
              <ul className="mt-4 space-y-1">
                {stats.categories.map(c => {
                  const d = change(c.value, c.prev);
                  return (
                    <li key={c.name}>
                      <button
                        className={`w-full rounded-lg px-2 py-2 text-left transition ${focusCat === c.name ? 'bg-forest-100' : 'hover:bg-cream-100'}`}
                        onClick={() => setFocusCat(f => (f === c.name ? null : c.name))}
                      >
                        <div className="flex items-center gap-2.5 text-sm">
                          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: colorOf(c.name) }} />
                          <span className="font-medium text-ink flex-1 truncate">{c.name}</span>
                          {d != null && <span className={`text-xs num ${d > 0 ? 'text-loss' : 'text-gain'}`}>{d > 0 ? '▲' : '▼'} {pct(Math.abs(d), { digits: 0 })}</span>}
                          <span className="num font-semibold w-24 text-right">{money(c.value)}</span>
                        </div>
                        <div className="ml-5 mt-1.5 h-1.5 rounded-full bg-cream-200 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(2, c.share * 100)}%`, background: colorOf(c.name) }} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        <div className="xl:col-span-3 space-y-4 md:space-y-5">
          <Card title={focusCat ? `${focusCat} over time` : 'Category trends'}>
            {stats.trend.length < 2 ? (
              <p className="text-sm text-ink-soft py-6">Choose a longer range (3M or more) to see monthly category trends.</p>
            ) : (
              <>
                <div className="h-[250px] -ml-2">
                  <ResponsiveContainer>
                    <BarChart data={stats.trend} barCategoryGap="24%">
                      <CartesianGrid vertical={false} stroke={CHART.grid} />
                      <XAxis dataKey="key" tickFormatter={k => monthLabel(k)} {...axisProps} />
                      <YAxis tickFormatter={moneyCompact} {...axisProps} width={56} />
                      <Tooltip cursor={{ fill: 'rgba(26,77,57,0.06)' }} content={<ChartTooltip labelFormatter={k => monthLabel(k)} />} />
                      {focusedTrend.map((c, i) => (
                        <Bar key={c} dataKey={c} name={c} stackId="s" fill={colorOf(c)} stroke={CHART.surface} strokeWidth={1}
                          radius={i === focusedTrend.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={40} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3"><Legend items={focusedTrend.map(c => ({ label: c, color: colorOf(c) }))} /></div>
              </>
            )}
          </Card>

          <Card title={`Spending pace${focusCat ? ` · ${focusCat}` : ''}`} action={<Legend items={[{ label: pace.thisLabel, color: SERIES[0], line: true }, { label: pace.lastLabel, color: OTHER, line: true }]} />}>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mb-3">
              <span className="text-ink-soft">This month so far <b className="num text-ink">{money(pace.thisTotal)}</b></span>
              <span className="text-ink-soft">Same point last month <b className="num text-ink">{money(pace.lastSameDay)}</b></span>
              <span className="text-ink-soft">Last month total <b className="num text-ink">{money(pace.lastTotal)}</b></span>
            </div>
            <div className="h-[200px] -ml-2">
              <ResponsiveContainer>
                <LineChart data={pace.rows}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="day" {...axisProps} interval={4} />
                  <YAxis tickFormatter={moneyCompact} {...axisProps} width={56} />
                  <Tooltip content={<ChartTooltip labelFormatter={d => `Day ${d}`} />} />
                  <Line type="monotone" dataKey="Last month" stroke={OTHER} strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="This month" stroke={SERIES[0]} strokeWidth={2.5} dot={false} connectNulls={false} activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card title={`Average by weekday${focusCat ? ` · ${focusCat}` : ''}`}>
          <div className="h-[200px] -ml-2">
            <ResponsiveContainer>
              <BarChart data={stats.wd}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis tickFormatter={moneyCompact} {...axisProps} width={48} />
                <Tooltip cursor={{ fill: 'rgba(26,77,57,0.06)' }} content={<ChartTooltip valueFormatter={v => `${money(v)} / wk`} />} />
                <Bar dataKey="avg" name="Avg spend" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Where your money goes">
          {stats.topPayees.length === 0 ? <p className="text-sm text-ink-soft">No spending in this period.</p> : (
            <ol className="space-y-2.5">
              {stats.topPayees.map((p, i) => (
                <li key={p.title} className="flex items-center gap-3 text-sm">
                  <span className="h-6 w-6 rounded-md bg-cream-100 text-ink-soft text-xs font-semibold grid place-items-center">{i + 1}</span>
                  <span className="flex-1 min-w-0 truncate font-medium">{p.title}</span>
                  <span className="text-xs text-muted">{p.count}×</span>
                  <span className="num font-semibold w-24 text-right">{money(p.total)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Largest expenses">
          {stats.largest.length === 0 ? <p className="text-sm text-ink-soft">No spending in this period.</p> : (
            <ul className="space-y-2.5">
              {stats.largest.map(t => (
                <li key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(t.category) }} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{t.title}</span>
                    <span className="block text-xs text-muted">{formatDate(t.date)} · {t.category}</span>
                  </span>
                  <span className="num font-semibold">{money(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {stats.incomeSources.length > 0 && (
            <div className="mt-5 pt-4 border-t border-line">
              <div className="card-title mb-2.5">Income sources</div>
              <ul className="space-y-2">
                {stats.incomeSources.map(([name, v]) => (
                  <li key={name} className="flex justify-between text-sm">
                    <span className="text-ink-soft">{name}</span>
                    <span className="num font-semibold text-gain">{money(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Compare({ cur, prev, good }) {
  if (!prev) return <span className="text-muted">No prior data</span>;
  const d = (cur - prev) / prev;
  const better = good === 'up' ? d >= 0 : d <= 0;
  return (
    <span>
      <span className={`num font-semibold ${better ? 'text-gain' : 'text-loss'}`}>{d >= 0 ? '▲' : '▼'} {pct(Math.abs(d), { digits: 1 })}</span>
      <span className="text-muted"> vs prev.</span>
    </span>
  );
}
