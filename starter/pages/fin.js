import React, { useState,useEffect} from 'react';
import { Copy, CheckCircle, Menu, X } from 'lucide-react';

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    initials: "",
    narration: "C/BACK VISA DEBIT"
  });

  const parseTransactions = (text,formData) => {
    // Regular expression to match date, merchant, and amount in JMD
    const pattern = /(\d{2}-\d{2}-\d{4})\s+\d{2}-\d{2}-\d{4}\s+(.*?)\s+JMD\s([\d,.]+)/g;
    
    // Match all transactions
    const transactions = [...text.matchAll(pattern)];

    const outputRows = [];
    let toggle = "C"; // Start toggle with "C"

    transactions.forEach((transaction) => {
      const [ , date, description, amount ] = transaction; // Destructure transaction elements
      const merchantName = description.trim();

      // Add output rows individually with toggling 'C' and 'D' 
      outputRows.push([toggle, amount, `${formData.initials.toUpperCase()} - ${formData.narration} ${date} ${merchantName}`]);
      toggle = toggle === "C" ? "D" : "C"; // Toggle for the next line
      outputRows.push([toggle, amount, ` ${formData.initials.toUpperCase()} - ${formData.narration} ${date} ${merchantName}`]);
      toggle = toggle === "C" ? "D" : "C"; // Toggle again for the next transaction
    });

    setOutput(outputRows);
  };

  // useEffect(() => {
  //   const fetchClickCount = async () => {
  //     try {
  //       const response = await fetch("/api/transaction_parser_tool");
  //       const data = await response.json();
  //       setClickCount(data.clickCount);
  //     } catch (error) {
  //       console.error("Error fetching click count:", error);
  //     }
  //   };

  //   fetchClickCount();
  // }, []);
  // const [clickCount, setClickCount] = useState(0);

  const handleParse = async () => {
    parseTransactions(inputText,formData);
        // Log button click and update the count
    //     try {
    //       const response = await fetch("/api/transaction_parser_tool", {method: "POST",});
    //       const data = await response.json();
    //       setClickCount(data.clickCount);
    //     } catch (error) {
    //       console.error("Error logging button click:", error);
    //     }
    // setCopySuccess(""); // Reset copy status on new parse
    

  };

  const handleCopy = async () => {
    try {
      // Prepare each row with tab separation
      const tabSeparatedRows = output.map(row => row.join("\t")).join("\n");
      await navigator.clipboard.writeText(tabSeparatedRows); // Copy to clipboard
      setCopySuccess("Copied to clipboard!");
    } catch (error) {
      setCopySuccess("Failed to copy!");
      console.error("Copy failed:", error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center"> Finacle Generator </h1>


      {/* <button
                className="flex bg-yellow-200  rounded-lg		items-center gap-2 px-4 py-2 text-sm text-black-600 "
              >Total Times Used: {clickCount}</button> */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                Initials
                </label>
                <input
                  type="text"
                  name="initials"
                  placeholder="eg. TKT"
                  value={formData.initials.toUpperCase()}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
              Narration
              </label>
              <select
                name="narration"
                value={formData.narration}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="C/BACK VISA DEBIT">C/BACK VISA DEBIT</option>
                <option value="W/OFF VISA DEBIT">W/OFF VISA DEBIT</option>
                <option value=" REFUND OF VISA DEBIT ">REFUND OF VISA DEBIT</option>
                <option value="FAILED VISA DEBIT">FAILED VISA DEBIT</option>
                <option value="FRAUD W/OFF VISA DEBIT">FRAUD W/OFF VISA DEBIT</option>

              </select>
              </div>
            </div>
          </div>
      <textarea
        rows="10"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter transactions here..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />
      <button onClick={handleParse} className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Parse Transactions
      </button>
      <button
          onClick={handleCopy}
        className="flex items-center gap-2 px-4 py-2 text-sm "
      >
          {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
      </button>
      <div style={{ marginTop: "10px", color: "green" }}>{copySuccess}</div>
     
     
     
     
      <div  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
        <h2>Parsed Output</h2>
        {Array.isArray(output) && output.length > 0 ? (
          output.map((row, index) => (
            <div key={index}>{row.join("\t")}</div>
          ))
        ) : (
          <div>No parsed output available</div>
        )}
      </div>
      
    </div>
  );
}
