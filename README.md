
Milestone Reminders: “You’re $500 away from your savings goal—keep going!”

## Personalized Money Tips & AI Insights
Smart Spending Alerts: Get a notification like “You spent 20% more on dining this week.”
Cash Flow Forecasting: AI suggests how much you can safely spend based on past transactions.
Automated Budgeting Suggestions: “You can save an extra $200 this month by adjusting your grocery budget.”


CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  transaction_date date NOT NULL,
  post_date date NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);



  <ul className="bg-gray-200 p-2 rounded-lg">
        {expenses.map((expense, index) => (
          <motion.li key={index} className="border-b py-1 flex justify-between items-center">
            <span>{expense.label} - ${expense.amount} <span className="text-xs text-gray-500">({expense.date})</span></span>
          </motion.li>
        ))}
      </ul>