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
  Landmark,
  AlertTriangle,
} from 'lucide-react';

/* ============================================================
 * CONSTANTS
 * ============================================================ */

const outputHeaders = [
  "Bank Ac",
  "Report Date",
  "Processed Date",
  "Txn Date",
  "Chargeback Date",
  "Ac Mumb",
  "Card Number",
  "Merchant Name",
  "Reason Code",
  "Amount",
  "Chargeback Amt",
  "Currency",
  "Txn Mode",
  "Data Source",
  "OTP",
  "Chargeback Status",
  "Card Type",
  "Product Type",
  "Remarks",
  "Auth Code",
  "ARN"
];

const REASON_CODES = [
  "NO C/HOLDER AUTH",
  "DUPLICATE PROCESSING",
  "GOODS/SERVICE NOT AS DESCRIBED/DAMAGED",
  "INCORRECT AMOUNT",
  "GOODS/SERVICES NOT RECEIVED",
  "PAID BY OTHER MEANS",
  "CREDIT NOT PROCESSED",
  "NO AUTHORIZATION",
  "LATE PRESENTMENT",
  "INCORRECT CURRENCY",
  "CANCELLED RECURRING",
  "MISREPRESENTATION",
  "CANCELLED MERCHANDISE/SERVICES",
  "NON-RECEIPT OF CASH",
];

/* VROL identifiers — Financial ID is "<financial code>-<institution id>" */
const VROL_FINANCIAL_CODE_FALLBACK = '10.4';
const VROL_INSTITUTION_ID = '6276';

/* Column indexes inside a generated output row */
const COL = {
  amount: 9,
  currency: 11,
  status: 15,
  authCode: 19,
  arn: 20,
};

/* ============================================================
 * STEP 2 — TRANSACTION PROCESSING (unchanged)
 * ============================================================ */

const processTransactions = (inputText, formData) => {
  const [year, month, day] = formData.reportDate.split('-');
  const formattedDate = `${day}/${month}/${year}`;

  const lines = inputText.trim().split("\n");
  const todaysDate = new Date().toLocaleDateString("en-GB");
  const processedDate = todaysDate;

  const txnMode = "ECOM";
  const dataSource = "SSMS";

  let output = "";

  for (let i = 0; i < lines.length; i += 2) {
    if (!lines[i + 1]) break;

    const txnDetails = lines[i].match(/\S+/g) || [];
    const txnMetadata = lines[i + 1].match(/\S+/g) || [];

    if (txnDetails[2]?.toUpperCase() === "SALE" && txnDetails[3] === "-") {
      txnDetails.splice(3, 1);
    }

    if (txnDetails[0]?.toUpperCase() === "D") {
      continue;
    }

    const txnDateOriginal = txnDetails[0];
    const txnDate = new Date(
      txnDateOriginal.replace(/(\d{2})\/(\d{2})\/(\d{2})/, "20$3-$1-$2")
    ).toLocaleDateString("en-GB");

    const amount = txnDetails[4] || "";
    const currency = txnDetails[5] || "";

    const merchantName = txnDetails.slice(7).join(" ") || "";

    const cardNumber =
      formData.fFour + "******" + (txnMetadata[txnMetadata.length - 1] || "");

    const authCode = txnMetadata[txnMetadata.length - 5] || "";
    const arn = txnMetadata[txnMetadata.length - 2] || "";
    const typea = txnMetadata[txnMetadata.length - 8] || "";

    const acMumb = "XXXXXXXXX";
    const cbackamt = "";

    let cbackStatus = "";
    let remarks = "";

    const amountNum = parseFloat(amount.replace(/,/g, ""));

    if (amountNum < 300 && currency !== "USD") {
      cbackStatus = "N";
      remarks = "Too small to chargeback";
    } else if (amountNum < 1.9 && currency === "USD") {
      cbackStatus = "N";
    } else if (["7", "2", "4"].includes(typea)) {
      cbackStatus = "Y";
      remarks = "Chargeback";
    } else if (["5", "6"].includes(typea)) {
      cbackStatus = "N";
      remarks = "3D";
    }

    const finalCbackDate = cbackStatus === "Y" ? todaysDate : "";

    output += `${formData.bankAcNumber}\t${formattedDate}\t${processedDate}\t${txnDate}\t${finalCbackDate}\t${acMumb}\t${cardNumber}\t${merchantName}\t${formData.reasonCode}\t${amount}\t${cbackamt}\t${currency}\t${txnMode}\t${dataSource}\t${formData.otp}\t${cbackStatus}\t${formData.cardtype}\t${formData.producttype}\t${remarks}\t${authCode}\t${arn}\n`;
  }

  return output;
};

/* ============================================================
 * STEP 4 — VROL RESPONSE PARSER
 *
 * Expected shape of the pasted Visa / VROL text (one block per case):
 *
 *   2693548875
 *   Fraud Dispute - Pending Advice / 100.00% Acq Liability
 *   10.4
 *   2
 *   1,795.60 JMD
 *   4263-67xx-xxxx-6800
 *   804562/
 *   408297
 *   TT
 *   10/02/26
 *   GOOGLE *Free Fire 9th
 *   2 - VISA
 * ============================================================ */

const CASE_NUMBER_RE = /^\d{8,12}$/;
const DISPUTE_LINE_RE = /dispute|chargeback|fraud|pending advice/i;
const ARN_SLASH_RE = /^(\d{4,8})\s*\/$/;          // "804562/"
const ARN_PLAIN_RE = /^(\d{6})$/;                 // "804562"  (fallback only)
const AMOUNT_LINE_RE = /^([\d,]+\.\d{2})\s+([A-Z]{3})$/;
const FINANCIAL_CODE_RE = /^\d{1,2}\.\d{1,2}$/;   // "10.4"
const CARD_LINE_RE = /^\d{4}-\d{2}xx-xxxx-\d{4}$/i;

const firstMatch = (lines, re) => {
  for (const line of lines) {
    const m = line.match(re);
    if (m) return m;
  }
  return null;
};

const parseVrolResponse = (text) => {
  if (!text || !text.trim()) return [];

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  /* --- 1. Split the paste into one block per case number --- */
  const blocks = [];
  let current = null;

  lines.forEach((line, i) => {
    const next = lines[i + 1] || '';
    const startsBlock =
      CASE_NUMBER_RE.test(line) && DISPUTE_LINE_RE.test(next);

    if (startsBlock) {
      current = { caseNumber: line, disputeType: next, body: [] };
      blocks.push(current);
      return;
    }
    if (current) current.body.push(line);
  });

  /* --- 2. Pull the fields we care about out of every block --- */
  const seen = new Set();

  return blocks
    .map(({ caseNumber, disputeType, body }) => {
      const arnMatch =
        firstMatch(body, ARN_SLASH_RE) || firstMatch(body, ARN_PLAIN_RE);
      const amountMatch = firstMatch(body, AMOUNT_LINE_RE);
      const cardMatch = firstMatch(body, CARD_LINE_RE);

      const financialCode =
        body.find((l) => FINANCIAL_CODE_RE.test(l)) ||
        VROL_FINANCIAL_CODE_FALLBACK;

      return {
        caseNumber,
        disputeType,
        arn: arnMatch ? arnMatch[1] : '',
        amount: amountMatch ? amountMatch[1] : '',
        currency: amountMatch ? amountMatch[2] : '',
        card: cardMatch ? cardMatch[0] : '',
        financialCode,
        financialId: `${financialCode}-${VROL_INSTITUTION_ID}`,
      };
    })
    .filter((rec) => {
      if (!rec.caseNumber || seen.has(rec.caseNumber)) return false;
      seen.add(rec.caseNumber);
      return true;
    });
};

/* ============================================================
 * MAIN COMPONENT
 * ============================================================ */

export default function ChargebackGenerator() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [vrolInput, setVrolInput] = useState("");

  const [copiedTsV, setCopiedTsV] = useState(false);
  const [copiedTable, setCopiedTable] = useState(false);
  const [copiedVrol, setCopiedVrol] = useState(false);

  const [formData, setFormData] = useState({
    bankAcNumber: "XXXXXXX",
    reportDate: new Date().toISOString().split('T')[0],
    fFour: "123456",
    reasonCode: "NO C/HOLDER AUTH",
    otp: "N",
    cardtype: "Debit",
    producttype: "Consumer"
  });

  const outputRows = useMemo(
    () =>
      output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => line.split('\t')),
    [output]
  );

  const visaRecords = useMemo(() => parseVrolResponse(vrolInput), [vrolInput]);

  /* ---------- ARN → VROL case number matching ---------- */
  const { vrolRows, matchedCount, unmatchedVisa } = useMemo(() => {
    // Only rows that were actually flagged for chargeback go to Visa
    const submitted = outputRows.filter((row) => row[COL.status] === 'Y');
    const submittedArns = new Set(
      submitted.map((row) => row[COL.arn]).filter(Boolean)
    );

    const byArn = new Map();
    const unmatched = [];

    visaRecords.forEach((rec) => {
      if (rec.arn && submittedArns.has(rec.arn)) {
        if (!byArn.has(rec.arn)) byArn.set(rec.arn, rec);
      } else {
        unmatched.push(rec);
      }
    });

    let matched = 0;

    const rows = submitted.map((row) => {
      const arn = row[COL.arn] || '';
      const hit = byArn.get(arn);
      if (hit) matched += 1;

      return {
        arn,
        amount: row[COL.amount] || '',
        currency: row[COL.currency] || '',
        authCode: row[COL.authCode] || '',
        matched: Boolean(hit),
        financialId: hit ? hit.financialId : '',
        caseNumber: hit ? hit.caseNumber : '',
        disputeType: hit ? hit.disputeType : '',
      };
    });

    return { vrolRows: rows, matchedCount: matched, unmatchedVisa: unmatched };
  }, [outputRows, visaRecords]);

  const submittedCount = vrolRows.length;

  /* ---------- Handlers ---------- */
  const handleProcess = () => {
    const processedData = processTransactions(input, formData);
    setOutput(processedData);
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
  };

  const handleClearVrol = () => setVrolInput("");

  const handleCopyTsv = async () => {
    await navigator.clipboard.writeText(output);
    setCopiedTsV(true);
    setTimeout(() => setCopiedTsV(false), 2000);
  };

  const handleCopyTable = async () => {
    // Tab-delimited, works when pasted into Excel / Google Sheets
    const text = outputRows.map((row) => row.join('\t')).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedTable(true);
    setTimeout(() => setCopiedTable(false), 2000);
  };

  const handleCopyVrol = async () => {
    const lines = ['ARN\tVROL Financial ID\tVROL Case Number\tAmount\tCurrency'];
    vrolRows
      .filter((r) => r.matched)
      .forEach((r) =>
        lines.push(
          `${r.arn}\t${r.financialId}\t${r.caseNumber}\t${r.amount}\t${r.currency}`
        )
      );
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopiedVrol(true);
    setTimeout(() => setCopiedVrol(false), 2000);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const canProcess = input.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Chargeback Generator — Dosnine</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ============ HEADER ============ */}
        <header className="mb-10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Wand2 size={18} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                Internal tool
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Chargeback Generator
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Paste transaction data below, configure the report parameters, and
            generate a formatted chargeback file ready to submit. After the
            disputes are raised in Visa, paste the VROL response to map every
            ARN to its case number.
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
                Report parameters
              </span>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              <Field label="Report date" hint="Appears on every row">
                <input
                  type="date"
                  name="reportDate"
                  value={formData.reportDate}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </Field>

              <Field label="Card prefix" hint="First 6 digits (BIN)">
                <input
                  name="fFour"
                  value={formData.fFour}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </Field>

              <Field label="Bank account number" hint="Masked value on output">
                <input
                  name="bankAcNumber"
                  value={formData.bankAcNumber}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </Field>

              <Field label="Card type">
                <select
                  name="cardtype"
                  value={formData.cardtype}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  <option>Debit</option>
                  <option>Credit</option>
                </select>
              </Field>

              <Field label="Product type">
                <select
                  name="producttype"
                  value={formData.producttype}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  <option>Consumer</option>
                  <option>Business</option>
                </select>
              </Field>

              <Field label="OTP used">
                <select
                  name="otp"
                  value={formData.otp}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  <option value="Y">Y — OTP was used</option>
                  <option value="N">N — No OTP</option>
                </select>
              </Field>

              <div className="sm:col-span-2 lg:col-span-3">
                <Field
                  label="Reason code"
                  hint="Applied to every generated row"
                >
                  <select
                    name="reasonCode"
                    value={formData.reasonCode}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  >
                    {REASON_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
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
                Two lines per transaction
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <textarea
                rows={12}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                placeholder="Paste transaction text here — each transaction takes two lines…"
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  {input.trim().length === 0
                    ? 'Waiting for input'
                    : `${input.split('\n').length} line${
                        input.split('\n').length === 1 ? '' : 's'
                      } pasted`}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={!input && !output}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleProcess}
                    disabled={!canProcess}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Wand2 size={14} />
                    Process transactions
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
                  Generated output
                </h2>
                {outputRows.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    <Layers size={11} />
                    {outputRows.length} row
                    {outputRows.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {outputRows.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyTable}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {copiedTable ? (
                      <CheckCircle size={14} className="text-emerald-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                    {copiedTable ? 'Copied' : 'Copy as table'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyTsv}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent/90"
                  >
                    {copiedTsV ? (
                      <CheckCircle size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                    {copiedTsV ? 'Copied' : 'Copy TSV (submit)'}
                  </button>
                </div>
              )}
            </div>

            {outputRows.length === 0 ? (
              /* ---------- EMPTY STATE ---------- */
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FileOutput size={22} />
                </span>
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  No output yet
                </p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Configure the report, paste transactions above, then click{' '}
                  <strong className="font-semibold text-slate-700">
                    Process transactions
                  </strong>{' '}
                  to generate your file.
                </p>
              </div>
            ) : (
              /* ---------- TABLE ---------- */
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                    <tr>
                      {outputHeaders.map((header) => (
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
                    {outputRows.map((row, rowIndex) => (
                      <tr
                        key={`${row[COL.arn] || 'row'}-${rowIndex}`}
                        className="transition hover:bg-slate-50"
                      >
                        {outputHeaders.map((_, colIndex) => (
                          <td
                            key={`${rowIndex}-${colIndex}`}
                            className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-700"
                          >
                            {row[colIndex] || (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {outputRows.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-500 sm:px-6">
                <span>
                  Use{' '}
                  <strong className="font-semibold text-slate-700">
                    Copy TSV (submit)
                  </strong>{' '}
                  to copy the tab-delimited file exactly as it will be submitted.
                </span>
                <span className="hidden sm:inline">
                  {outputRows.length} row{outputRows.length === 1 ? '' : 's'} ·{' '}
                  {outputHeaders.length} columns
                </span>
              </div>
            )}
          </section>

          {/* ============================================================
              STEP 4 — VROL CASE NUMBERS
              ============================================================ */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  4
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  VROL case numbers
                </h2>
                {submittedCount > 0 && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      matchedCount === submittedCount
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <Landmark size={11} />
                    {matchedCount}/{submittedCount} matched
                  </span>
                )}
              </div>
              <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:flex">
                <FileInput size={12} />
                Paste Visa response
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <textarea
                rows={10}
                value={vrolInput}
                onChange={(e) => setVrolInput(e.target.value)}
                className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                placeholder={
                  'Paste the Visa / VROL dispute response here…\n\n' +
                  '2693548875\n' +
                  'Fraud Dispute - Pending Advice / 100.00% Acq Liability\n' +
                  '10.4\n2\n1,795.60 JMD\n4263-67xx-xxxx-6800\n804562/\n408297\nTT\n10/02/26\n' +
                  'GOOGLE *Free Fire 9th\n2 - VISA'
                }
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  {visaRecords.length === 0
                    ? 'Waiting for a VROL response'
                    : `${visaRecords.length} case${
                        visaRecords.length === 1 ? '' : 's'
                      } detected · only rows flagged `}
                  {visaRecords.length > 0 && (
                    <strong className="font-semibold text-slate-700">
                      Chargeback Status = Y
                    </strong>
                  )}
                  {visaRecords.length > 0 ? ' are matched' : ''}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearVrol}
                    disabled={!vrolInput}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyVrol}
                    disabled={matchedCount === 0}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copiedVrol ? (
                      <CheckCircle size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                    {copiedVrol ? 'Copied' : 'Copy ARN → Case map'}
                  </button>
                </div>
              </div>
            </div>

            {/* ---------- MATCHED MAPPING TABLE ---------- */}
            {vrolRows.length > 0 && (
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="min-w-full border-collapse text-xs">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      {[
                        'ARN',
                        'Amount',
                        'Currency',
                        'Auth Code',
                        'VROL Financial ID',
                        'VROL Case Number',
                      ].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vrolRows.map((r, i) => (
                      <tr
                        key={`${r.arn}-${i}`}
                        className={
                          r.matched ? 'hover:bg-slate-50' : 'bg-amber-50/40'
                        }
                      >
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] font-semibold text-slate-800">
                          {r.arn || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-700">
                          {r.amount || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-700">
                          {r.currency || (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-700">
                          {r.authCode || (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-700">
                          {r.financialId || (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">
                          {r.caseNumber ? (
                            <span className="font-semibold text-slate-900">
                              {r.caseNumber}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                              <AlertTriangle size={11} />
                              Not found
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ---------- UNMATCHED VROL RECORDS ---------- */}
            {unmatchedVisa.length > 0 && (
              <div className="border-t border-slate-100 bg-amber-50/50 px-5 py-4 sm:px-6">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  <AlertTriangle size={12} />
                  {unmatchedVisa.length} VROL case
                  {unmatchedVisa.length === 1 ? '' : 's'} with no matching
                  chargeback row
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {unmatchedVisa.map((rec) => (
                    <span
                      key={rec.caseNumber}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1 font-mono text-[11px] text-amber-800"
                    >
                      {rec.caseNumber}
                      <span className="text-amber-400">·</span>
                      ARN {rec.arn || '—'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {vrolRows.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-500 sm:px-6">
                <span>
                  Matched on{' '}
                  <strong className="font-semibold text-slate-700">ARN</strong>{' '}
                  against rows with{' '}
                  <strong className="font-semibold text-slate-700">
                    Chargeback Status = Y
                  </strong>
                  .
                </span>
                <span className="hidden sm:inline">
                  Financial ID {VROL_FINANCIAL_CODE_FALLBACK}-
                  {VROL_INSTITUTION_ID}
                </span>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
 * Small helper component for consistent form fields
 * ============================================================ */
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