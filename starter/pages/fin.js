import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import {
  Copy,
  CheckCircle,
  Settings2,
  FileInput,
  FileOutput,
  Trash2,
  Wand2,
  Layers,
  ArrowDownUp,
} from 'lucide-react';

const NARRATION_OPTIONS = [
  'C/BACK VISA DEBIT',
  'W/OFF VISA DEBIT',
  'REFUND OF VISA DEBIT',
  'FAILED VISA DEBIT',
  'FRAUD W/OFF VISA DEBIT',
];

const OUTPUT_HEADERS = ['Type', 'Amount', 'Narration'];

export default function FinacleGenerator() {
  const [inputText, setInputText] = useState('');
  const [output, setOutput] = useState([]);
  const [copied, setCopied] = useState(false);
  const [parseError, setParseError] = useState('');

  const [formData, setFormData] = useState({
    initials: '',
    narration: 'C/BACK VISA DEBIT',
  });

  const parseTransactions = (text, data) => {
    const pattern =
      /(\d{2}-\d{2}-\d{4})\s+\d{2}-\d{2}-\d{4}\s+(.*?)\s+JMD\s([\d,.]+)/g;

    const transactions = [...text.matchAll(pattern)];

    if (transactions.length === 0) {
      setOutput([]);
      setParseError(
        'No matching transactions found. Check the format of your input.'
      );
      return;
    }

    const initials = String(data.initials || '').trim().toUpperCase();
    const narration = data.narration;
    const prefix = initials ? `${initials} - ` : '';

    const rows = [];
    let toggle = 'C';

    transactions.forEach((transaction) => {
      const [, date, description, amount] = transaction;
      const merchantName = description.trim();

      rows.push([
        toggle,
        amount,
        `${prefix}${narration} ${date} ${merchantName}`,
      ]);
      toggle = toggle === 'C' ? 'D' : 'C';

      rows.push([
        toggle,
        amount,
        ` ${prefix}${narration} ${date} ${merchantName}`,
      ]);
      toggle = toggle === 'C' ? 'D' : 'C';
    });

    setOutput(rows);
    setParseError('');
  };

  const handleParse = () => {
    parseTransactions(inputText, formData);
  };

  const handleClear = () => {
    setInputText('');
    setOutput([]);
    setParseError('');
  };

  const handleCopy = async () => {
    try {
      const tsv = output.map((row) => row.join('\t')).join('\n');
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      setCopied(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'initials' ? value.toUpperCase() : value,
    }));
  };

  const canParse = inputText.trim().length > 0;

  const lineCount = useMemo(
    () => (inputText ? inputText.split('\n').length : 0),
    [inputText]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Finacle Generator — Dosnine</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ============ HEADER ============ */}
        <header className="mb-10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ArrowDownUp size={18} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                Internal tool
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Finacle Generator
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Convert raw transaction listings into Finacle-ready{' '}
            <strong className="font-semibold text-slate-700">C</strong> and{' '}
            <strong className="font-semibold text-slate-700">D</strong> entries.
            Each transaction is automatically split into a debit and credit
            line.
          </p>
        </header>

        <div className="space-y-6">
          {/* ============================================================
              STEP 1 — CONFIGURATION
              ============================================================ */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Configuration
                </h2>
              </div>
              <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:flex">
                <Settings2 size={12} />
                Narration parameters
              </span>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <Field
                label="Initials"
                hint="Prepended to the narration (e.g. TKT)"
              >
                <input
                  type="text"
                  name="initials"
                  placeholder="TKT"
                  value={formData.initials}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider text-slate-900 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </Field>

              <Field label="Narration" hint="Applied to every generated row">
                <select
                  name="narration"
                  value={formData.narration}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  {NARRATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* ============================================================
              STEP 2 — INPUT
              ============================================================ */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  2
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Paste transaction data
                </h2>
              </div>
              <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:flex">
                <FileInput size={12} />
                DD-MM-YYYY · JMD format
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <textarea
                rows={12}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (parseError) setParseError('');
                }}
                className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-relaxed text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                placeholder="Paste raw transaction listing here…"
              />

              {parseError ? (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {parseError}
                </p>
              ) : null}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  {inputText.trim().length === 0
                    ? 'Waiting for input'
                    : `${lineCount} line${lineCount === 1 ? '' : 's'} pasted`}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={!inputText && output.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleParse}
                    disabled={!canParse}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Wand2 size={14} />
                    Parse transactions
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================
              STEP 3 — OUTPUT
              ============================================================ */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  3
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Parsed output
                </h2>
                {output.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    <Layers size={11} />
                    {output.length} row{output.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {output.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent/90"
                >
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy TSV'}
                </button>
              )}
            </div>

            {output.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FileOutput size={22} />
                </span>
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  No parsed output yet
                </p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Configure the initials and narration, paste your transaction
                  data above, then click{' '}
                  <strong className="font-semibold text-slate-700">
                    Parse transactions
                  </strong>
                  .
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                    <tr>
                      {OUTPUT_HEADERS.map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {output.map((row, rowIndex) => (
                      <tr key={rowIndex} className="transition hover:bg-slate-50">
                        {OUTPUT_HEADERS.map((_, colIndex) => {
                          const value = row[colIndex] || '';

                          if (colIndex === 0) {
                            return (
                              <td
                                key={`${rowIndex}-${colIndex}`}
                                className="whitespace-nowrap px-3 py-2"
                              >
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold ${
                                    value === 'C'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {value}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={`${rowIndex}-${colIndex}`}
                              className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-700"
                            >
                              {value || (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {output.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-500 sm:px-6">
                <span>
                  Each transaction generates two rows — a{' '}
                  <strong className="font-semibold text-emerald-700">C</strong>{' '}
                  (credit) and a{' '}
                  <strong className="font-semibold text-blue-700">D</strong>{' '}
                  (debit).
                </span>
                <span className="hidden sm:inline">
                  {output.length} row{output.length === 1 ? '' : 's'} ·{' '}
                  {OUTPUT_HEADERS.length} columns
                </span>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}