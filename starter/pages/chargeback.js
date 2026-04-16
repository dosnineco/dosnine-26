import React, { useState } from 'react';
import { Copy, CheckCircle } from 'lucide-react';

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

export default function Home() {

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    bankAcNumber: "XXXXXXX",
    reportDate: new Date().toISOString().split('T')[0],
    fFour: "123456",
    reasonCode: "NO C/HOLDER AUTH",
    otp: "N",
    cardtype: "Debit",
    producttype: "Consumer"
  });

  const outputRows = output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'));

  const handleProcess = () => {
    const processedData = processTransactions(input, formData);
    setOutput(processedData);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-6 text-accent">
            Chargeback Generator
          </h1>

          <div className="bg-gray-100 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-accent">
              Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Report Date</label>
                <input
                  type="date"
                  name="reportDate"
                  value={formData.reportDate}
                  onChange={handleFormChange}
                  className="w-full bg-gray-50 px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Card Prefix</label>
                <input
                  name="fFour"
                  value={formData.fFour}
                  onChange={handleFormChange}
                  className="w-full bg-gray-50 px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Reason Code</label>
                <select
                  name="reasonCode"
                  value={formData.reasonCode}
                  onChange={handleFormChange}
                  className="w-full bg-gray-50 px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="NO C/HOLDER AUTH">NO C/HOLDER AUTH</option>
                  <option value="DUPLICATE PROCESSING">DUPLICATE PROCESSING</option>
                  <option value="GOODS/SERVICE NOT AS DESCRIBED/DAMAGED">GOODS/SERVICE NOT AS DESCRIBED/DAMAGED</option>
                  <option value="INCORRECT AMOUNT">INCORRECT AMOUNT</option>
                  <option value="GOODS/SERVICES NOT RECEIVED">GOODS/SERVICES NOT RECEIVED</option>
                  <option value="PAID BY OTHER MEANS">PAID BY OTHER MEANS</option>
                  <option value="CREDIT NOT PROCESSED">CREDIT NOT PROCESSED</option>
                  <option value="NO AUTHORIZATION">NO AUTHORIZATION</option>
                  <option value="LATE PRESENTMENT">LATE PRESENTMENT</option>
                  <option value="INCORRECT CURRENCY">INCORRECT CURRENCY</option>
                  <option value="CANCELLED RECURRING">CANCELLED RECURRING</option>
                  <option value="MISREPRESENTATION">MISREPRESENTATION</option>
                  <option value="CANCELLED MERCHANDISE/SERVICES">CANCELLED MERCHANDISE/SERVICES</option>
                  <option value="NON-RECEIPT OF CASH">NON-RECEIPT OF CASH</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">OTP</label>
                <select
                  name="otp"
                  value={formData.otp}
                  onChange={handleFormChange}
                  className="w-full bg-gray-50 px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Card Type</label>
                <select
                  name="cardtype"
                  value={formData.cardtype}
                  onChange={handleFormChange}
                  className="w-full bg-gray-50 px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option>Debit</option>
                  <option>Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Product Type</label>
                <select
                  name="producttype"
                  value={formData.producttype}
                  onChange={handleFormChange}
                  className="w-full bg-gray-50 px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option>Consumer</option>
                  <option>Business</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-accent">Input</h2>
            <textarea
              rows={10}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-gray-50 px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Paste transaction text..."
            />
            <button
              onClick={handleProcess}
              className="mt-4 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              Process Transactions
            </button>
          </div>

          <div className="bg-gray-100 rounded-xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold text-accent">Output</h2>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl font-semibold transition"
              >
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-accent text-white">
                    {outputHeaders.map((header) => (
                      <th key={header} className="px-3 py-2 text-left whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {outputRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={outputHeaders.length}
                        className="px-3 py-6 text-center text-accent"
                      >
                        Process transactions to preview output rows.
                      </td>
                    </tr>
                  )}
                  {outputRows.map((row, rowIndex) => (
                    <tr key={`${row[20] || 'row'}-${rowIndex}`} className="even:bg-gray-100">
                      {outputHeaders.map((_, colIndex) => (
                        <td key={`${rowIndex}-${colIndex}`} className="px-3 py-2 whitespace-nowrap">
                          {row[colIndex] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-sm text-accent">
              Copy still uses the original tab-delimited output format.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}