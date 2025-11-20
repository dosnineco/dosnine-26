const RefundPolicy = () => (
  <div className="w-full max-w-screen-md  mx-auto px-4 py-8">
    <h1 className="text-xl font-bold mb-4">Refund Policy</h1>
    <p className="mb-4 text-base">
      At Expense Goose, we strive to ensure customer satisfaction with our services. If you are not entirely satisfied with your purchase, we’re here to help.
    </p>
    <h2 className=" font-semibold mb-2">Refund Eligibility</h2>
    <p className="mb-4 text-base">
      Refunds are available under the following conditions:
    </p>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>You request a refund within 7 days of your initial purchase.</li>
      <li>You have not used the service extensively or downloaded significant resources.</li>
      <li>The issue is related to a technical problem that we are unable to resolve.</li>
    </ul>
    <h2 className=" font-semibold mb-2">How to Request a Refund</h2>
    <p className="mb-4 text-base">
      To request a refund, please contact our support team at <a href="mailto:support@expensegoose.com" className="text-blue-500 hover:underline">support@expensegoose.com</a> with the following details:
    </p>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Your full name and email address used for the purchase.</li>
      <li>Your order ID or receipt number.</li>
      <li>A brief explanation of the reason for the refund request.</li>
    </ul>
    <h2 className=" font-semibold mb-2">Processing Time</h2>
    <p className="mb-4 text-base">
      Refunds are typically processed within 5-10 business days. The amount will be credited back to your original payment method.
    </p>
    <h2 className=" font-semibold mb-2">Non-Refundable Items</h2>
    <p className="mb-4 text-base">
      Please note that the following items are non-refundable:
    </p>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Renewals of subscriptions after the trial period.</li>
      <li>Services that have been fully utilized or delivered.</li>
    </ul>
    <p className="mb-4 text-base">
      If you have any questions about our refund policy, feel free to contact us at <a href="mailto:support@expensegoose.com" className="text-blue-500 hover:underline">support@expensegoose.com</a>.
    </p>
  </div>
);

export default RefundPolicy;