
// /pages/tools/invoice-payment-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface Invoice {
  id: number;
  name: string;
  amount: number;
  dueDate: string;
}

const defaultInvoices: Invoice[] = [
  { id: 1, name: 'Invoice 1', amount: 200, dueDate: '2023-10-01' },
  { id: 2, name: 'Invoice 2', amount: 450, dueDate: '2023-10-15' },
];

const InvoicePaymentTracker: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(defaultInvoices);
  const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({});
  const [chartData, setChartData] = useState<any[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewInvoice({ ...newInvoice, [name]: value });
  };

  const addInvoice = () => {
    if (newInvoice.name && newInvoice.amount && newInvoice.dueDate) {
      setInvoices([...invoices, { ...newInvoice, id: Date.now() } as Invoice]);
      setNewInvoice({});
    }
  };

  const calculateChartData = () => {
    const data = invoices.map(invoice => ({
      name: invoice.name,
      amount: invoice.amount,
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + invoices.map(i => `${i.name},${i.amount},${i.dueDate}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'invoices.csv');
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Invoice Payment Tracker</title>
        <meta name="description" content="Track your invoice payments effortlessly with our free tool." />
        <meta name="keywords" content="invoice, payment, tracker, finance, tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/invoice-payment-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Invoice Payment Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Invoice Payment Tracker! This tool helps you keep track of your invoices and their payment statuses. You can add new invoices, view them in a chart, and export the data as a CSV file.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Add New Invoice</h2>
        <div className="mb-4">
          <input
            type="text"
            name="name"
            placeholder="Invoice Name"
            value={newInvoice.name || ''}
            onChange={handleInputChange}
            className="border p-2 mb-2 w-full"
          />
          <input
            type="number"
            name="amount"
            placeholder="Amount"
            value={newInvoice.amount || ''}
            onChange={handleInputChange}
            className="border p-2 mb-2 w-full"
          />
          <input
            type="date"
            name="dueDate"
            value={newInvoice.dueDate || ''}
            onChange={handleInputChange}
            className="border p-2 mb-2 w-full"
          />
          <button onClick={addInvoice} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
            Add Invoice
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Invoice Chart</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button onClick={calculateChartData} className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Update Chart
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Export Data</h2>
        <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center">
          <Download className="mr-2" /> Export as CSV
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Invoices</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Regularly update your invoices to keep track of payments.</li>
          <li>Set reminders for due dates to avoid late fees.</li>
          <li>Use the export feature to back up your data.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>How do I add a new invoice? - Use the form above to enter invoice details and click "Add Invoice".</li>
          <li>Can I export my data? - Yes, click the "Export as CSV" button to download your data.</li>
          <li>How do I update the chart? - Click the "Update Chart" button after adding new invoices.</li>
        </ul>
      </section>
    </div>
  );
};

export default InvoicePaymentTracker;


