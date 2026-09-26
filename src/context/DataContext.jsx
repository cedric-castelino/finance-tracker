import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { computePortfolio, fxKey, quoteSymbol } from '../lib/portfolio';
import { outstandingOwed } from '../lib/networth';

const DataContext = createContext(null);
const EMPTY = { transactions: [], trades: [], snapshots: [], debts: [], settings: null };

export function DataProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const settingsRef = useRef(null);
  settingsRef.current = data.settings;

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api('/data');
      setData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (col, item) => {
    const saved = await api(`/${col}`, { method: 'POST', body: item });
    setData(d => ({ ...d, [col]: [...d[col], saved] }));
    return saved;
  }, []);

  const addMany = useCallback(async (col, items) => {
    const saved = await api(`/${col}/bulk`, { method: 'POST', body: items });
    setData(d => ({ ...d, [col]: [...d[col], ...saved] }));
    return saved;
  }, []);

  const update = useCallback(async (col, id, patch) => {
    const saved = await api(`/${col}/${id}`, { method: 'PUT', body: patch });
    setData(d => ({ ...d, [col]: d[col].map(x => (x.id === id ? saved : x)) }));
    return saved;
  }, []);

  const remove = useCallback(async (col, id) => {
    let removed;
    setData(d => {
      removed = d[col].find(x => x.id === id);
      return { ...d, [col]: d[col].filter(x => x.id !== id) };
    });
    try {
      await api(`/${col}/${id}`, { method: 'DELETE' });
    } catch (err) {
      if (removed) setData(d => ({ ...d, [col]: [...d[col], removed] }));
      throw err;
    }
    return removed;
  }, []);

  // Re-create a deleted item (used by "Undo").
  const restore = useCallback(async (col, item) => {
    const { id: _id, createdAt: _c, ...rest } = item;
    return add(col, rest);
  }, [add]);

  const saveSettings = useCallback(async patch => {
    setData(d => ({ ...d, settings: { ...d.settings, ...patch } }));
    const saved = await api('/settings', { method: 'PUT', body: patch });
    setData(d => ({ ...d, settings: saved }));
    return saved;
  }, []);

  const portfolio = useMemo(
    () => computePortfolio(data.trades, data.settings?.prices, data.settings?.preferences),
    [data.trades, data.settings?.prices, data.settings?.preferences]
  );

  const refreshPrices = useCallback(async () => {
    const open = portfolio.open;
    if (!open.length) return { updated: 0, failed: [] };
    const symbols = open.map(p => quoteSymbol(p.ticker, p.market));
    const quotes = await api(`/market/quotes?symbols=${encodeURIComponent(symbols.join(','))}`);
    const now = new Date().toISOString();
    const prices = { ...(settingsRef.current?.prices || {}) };
    const failed = [];
    const currencies = new Set();
    open.forEach((p, i) => {
      const q = quotes[symbols[i]];
      if (q && q.price > 0) {
        prices[p.ticker] = { price: q.price, prevClose: q.prevClose || 0, currency: q.currency || 'AUD', updatedAt: now, manual: false };
        if (q.currency && q.currency !== 'AUD') currencies.add(q.currency);
      } else {
        failed.push(p.ticker);
      }
    });
    if (currencies.size) {
      const fxSymbols = [...currencies].map(fxKey);
      const fx = await api(`/market/quotes?symbols=${encodeURIComponent(fxSymbols.join(','))}`).catch(() => ({}));
      fxSymbols.forEach(s => {
        if (fx[s]?.price > 0) prices[s] = { price: fx[s].price, prevClose: fx[s].prevClose || 0, currency: 'AUD', updatedAt: now, manual: false };
      });
    }
    await saveSettings({ prices });
    return { updated: open.length - failed.length, failed };
  }, [portfolio.open, saveSettings]);

  const value = useMemo(() => ({
    ...data,
    loading,
    error,
    reload: load,
    add,
    addMany,
    update,
    remove,
    restore,
    saveSettings,
    portfolio,
    refreshPrices,
    owedTotal: outstandingOwed(data.debts),
  }), [data, loading, error, load, add, addMany, update, remove, restore, saveSettings, portfolio, refreshPrices]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
