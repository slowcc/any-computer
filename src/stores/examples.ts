export interface Example {
  input: string;
  code: string;
  analyzedOutput: { line: number; text: string }[];
  variableBindings: { variableName: string; pattern: string }[];
}

export const examples: Example[] = [
  {
    input: "€36/day in $/month",
    code: `// Assuming 30 days in a month
const daysInMonth = 30;
console.log("Assuming 30 days in a month");

// Get the price of 1 EUR in USD
const usdInEur = await getPrice("FX.USD/EUR"); // price of 1 USD in EUR
console.log("Price of 1 EUR in USD:", usdInEur.toFixed(2));

// Calculate the daily amount in USD
const dailyAmount = 36;
const dailyAmountUsd = dailyAmount * usdInEur;
console.log("Daily amount in USD:", dailyAmountUsd.toFixed(2));

// Calculate the monthly amount in USD
const monthlyAmountUsd = dailyAmountUsd * daysInMonth;
console.log("Monthly amount in USD:", monthlyAmountUsd.toFixed(2));`,
    analyzedOutput: [
      {
        "line": 1,
        "text": "console.log(\"Assuming 30 days in a month\");"
      },
      {
        "line": 2,
        "text": "console.log(\"Price of 1 EUR in USD:\", usdInEur.toFixed(2));"
      },
      {
        "line": 3,
        "text": "console.log(\"Daily amount in USD:\", dailyAmountUsd.toFixed(2));"
      },
      {
        "line": 4,
        "text": "console.log(\"Monthly amount in USD:\", monthlyAmountUsd.toFixed(2));"
      }
    ],
    variableBindings: [
      { variableName: "dailyAmount", pattern: "€(\\d+)\\s*\\/\\s*day in\\s*\\$\\/month" },
    ]
  },
  {
    input: "lunch was 55$ + 25% tip\nsplit evenly 3 ways",
    code: `const lunchCost = 55; // lunch cost in USD
const tipPercentage = 0.25; // tip percentage
const numPeople = 3; // number of people splitting the bill

// Calculate the tip amount
const tipAmount = lunchCost * tipPercentage;

// Calculate the total cost
const totalCost = lunchCost + tipAmount;

// Calculate the cost per person
const costPerPerson = totalCost / numPeople;

console.log(\`Tip amount: $\${tipAmount.toFixed(2)}\`);
console.log(\`Total cost: $\${totalCost.toFixed(2)}\`);
console.log(\`Cost per person: $\${costPerPerson.toFixed(2)}\`);`,
    analyzedOutput: [
      {
        "line": 1,
        "text": "console.log(\`Tip amount: $\${tipAmount.toFixed(2)}\`);"
      },
      {
        "line": 2,
        "text": "console.log(\`Total cost: $\${totalCost.toFixed(2)}\`);"
      },
      {
        "line": 3,
        "text": "console.log(\`Cost per person: $\${costPerPerson.toFixed(2)}\`);"
      }
    ],
    variableBindings: [
      { variableName: "lunchCost", pattern: "lunch was\\s+(\\d+)\\$\\s*\\+\\s*\\d+(?:\\.\\d+)?%\\s*tip" },
      { variableName: "tipPercentage", pattern: "\\s*(\\d+(?:\\.\\d+)?)%\\s*tip" },
      { variableName: "numPeople", pattern: "split evenly (\\d+) ways" },
    ]
  },
  {
    "input": `earnings = $45k
if earnings > $30k then tax = 20% else tax = 5%
My tax paid: earnings × tax`,
    code: `const earningsInThousands = 45;
const earnings = earningsInThousands * 1000;
console.log("Earnings = $", earnings.toFixed(2));

const taxRate = earningsInThousands > 30 ? 0.2 : 0.05; // Use ternary operator for concise condition
console.log(earningsInThousands > 30 ? "Earnings > $30k, tax = 20%" : "Earnings <= $30k, tax = 5%");
console.log("My tax paid: $", (earnings * taxRate).toFixed(2)); // Add $ to the output`,
    analyzedOutput: [
      {
        "line": 1,
        "text": "console.log(\"Earnings = $\", earnings.toFixed(2));"
      },
      {
        "line": 2,
        "text": "console.log(earnings > 30000 ? \"Earnings > $30k, tax = 20%\" : \"Earnings <= $30k, tax = 5%\");"
      },
      {
        "line": 3,
        "text": "console.log(\"My tax paid: $\", (earnings * taxRate).toFixed(2));"
      }
    ],
    variableBindings: [
      { variableName: "earningsInThousands", pattern: "earnings = \\$(\\d+)k" },
    ]
  }
];
