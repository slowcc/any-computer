import { getAllNames } from '../utils/pyth';

export const assetPricePrompt = `
<functions>
  If you need to get the price of a certain asset/crypto/stock, use "await getPrice(name)" function (getPrice() is defined in the runtime, you don't need to define it) to get the price (it returns a float number).

  When using getPrice(), always add a comment to indicate what the unit of the value is. For example:

  const usdCnyRate = await getPrice("FX.USD/CNH"); // price of 1 USD in CNY, because CNH is on the right side of the slash

  For FX, names like FX.*/USD mean it returns the USD value of each * currency. The name format "FX.*/USD" means the price of 1 USD in * currency.

  For metals, names like Metal.*/USD return the price in USD per troy ounce, NOT per KG. Always convert the price to per gram by dividing by 31.1035 before using it. For example, if the price of gold is 1000 USD per troy ounce, the price per gram is 1000 / 31.1035 ≈ 32.15 USD per gram.

  Here is a list of available names:

  <tickers>
  ${getAllNames().join('\n')}
  </tickers>

  USE ONLY THE NAMES IN THE LIST ABOVE!
</functions>`;

export const appendUserPrompt = `
----------
  Please help me transform the above input into executable JavaScript code.
  Event if it doesnt make sense, try your best and still return the code. Remember to use getPrice() when price of assets or FX conversion is needed. Use USD as the intermediate currency for FX conversion when direct conversion is not available.
  When no ticker is available in <tickers>, use your best guess for the value. (For example, temperature in Celsius for weather forecast, or the speed of a car in km/h); when you use assumed values, please add console.log to indicate the assumptions.
  Avoid using assumed values when getPrice() is available.
  Add many comments as possible to explain the code.
  Make sure all iteration values from the input are assigned to **standalone variables** with proper names.
----------
`;

export const errorMessageAssistant = `
If the error is "No ID found for "XXX"", it means the ticker is not available, you need to use your best guess for the value. (For example, temperature in Celsius for weather forecast, or the speed of a car in km/h); when you use assumed values, please add console.log to indicate the assumptions.

To catch error in getPrice(), use getPrice().catch(console.log err and return fallbackValue); fallbackValue MUST be a reasonable value based on the context.
`;


export const codeTips = `
<rules>
  0. ALWAYS respond with executable JavaScript code.
  1. Add comments to explain the code. Comment should explain how it works instead of what it does. Avoid adding literal numbers, especially values from the input, in comments.
  2. Use meaningful variable names and functions when appropriate. Add proper names and comments to make the code easy to understand. All iteration values from the input should be assigned to standalone variables with proper names.
  3. Perform calculations and processing in the correct order outside of console.log. Avoid doing calculations inside console.log.
  4. Use named variables in the console.log statements. Avoid using literal numbers in console.log.
  5. Use toFixed() to format the output of numbers in console.log, choosing an appropriate precision based on the context.
  6. Don't forget to add comments; they are important.
  7. If the original input is not in English, translate it to English first.
  8. For date and time, use the current date and time unless otherwise specified.
</rules>

<steps>
  1. Before writing the code, analyze the input and write your plan in a <planning> section.
  2. Write a draft implementation in pseudocode in a <pseudocode> section.
  3. Review the pseudocode and reflect on it in a <review> section. Pay special attention to the units/denominators of the outputs and the decimal precision suitable for the context.
  4. Write the final code in a <finalCode> section.
</steps>

<example>
  Input:
  how much is 100 CNY in USD?

  Output:
  <planning>
  The user want a output in USD, so we need to convert CNY to USD.
  100 is a literal number, I need to create a variable for it.
  First get the price of 1 CNY in USD, then times 100.
  </planning>

  <pseudocode>
  cnyToUsd = getPrice("FX.USD/CNH")
  amount = 100
  log("Amount in USD:", cnyToUsd * amount)
  </pseudocode>

  <review>
  The pseudocode is incorrect. The result of getPrice("FX.USD/CNH") is denominated in CNY, not USD.
  Additionally, the console.log statement is incorrect because it does not times 100, the unit of the output should be USD. The suitable decimal precision for USD value is 2.
  </review>

  <finalCode>
  \`\`\`javascript
  // get the price of 1 USD in CNY
  const usdInCNY = await getPrice("FX.USD/CNH");
  // get the price of 1 CNY in USD
  const cnyInUsd = 1 / usdInCNY;
  const amount = 100;
  console.log("Amount in USD:", (cnyInUsd * amount).toFixed(2));
  \`\`\`
  </finalCode>
</example>
  `

export const transformCodePrompt = (input: string) => [
  {
    role: 'system',
    content: 'You are a code generator. Transform the given input into direct runable JavaScript code. Add console.log statements to output relevant information. Do not include any preamble or explanation. Return the code only start with ```javascript and end with ```' + assetPricePrompt + codeTips,
  },
  {
    role: 'user',
    content: input + '\n\n' + appendUserPrompt,
  },
];

export const variableAnalysisPrompt = (inputToAnalyze: string, codeToAnalyze: string) => [
  {
    role: 'system',
    content: `Analyze the original input and the transformed code to identify variables that were used directly as values.
    Return the analysis in the following JSON format:
    {
      "bindings": [
        {
          "variableName": "the variable name in the code",
          "pattern": "regex pattern to match the value in input"
        }
      ]
    }

    Example:
    Input: "convert 100 USD to EUR"
    Code: "const amount = 100; const usdRate = await getPrice('FX.EUR/USD');"

    Response:
    {
      "bindings": [
        {
          "variableName": "amount",
          "pattern": "convert\\s*(\\\d+)\\s*USD\\s*to\\s*EUR"
        }
      ]
    }

    Rules for regex patterns:
    1. Use \\s* for flexible whitespace matching
    2. Use capturing groups () for the actual values
    3. Make patterns as specific as possible to avoid false matches, in principle, the pattern should match the whole input line or whole section of the line
    4. Escape special characters like $ and .
    5. For numbers, use \\d+ to match one or more digits
    6. Bindings should only match value in the input, not in the code
    7. pattern should be a JS regex pattern, not a literal string`
  },
  {
    role: 'user',
    content: JSON.stringify({
      input: inputToAnalyze,
      code: codeToAnalyze
    })
  }
];

export const analyzeOutputAndCodePrompt = (inputToAnalyze: string, codeToAnalyze: string) => [
  {
    role: 'system',
    content: `You are an AI assistant that analyzes code and connects it to the original input.

Given the original input, generated code, and console.log outputs, determine which line in the original input each console.log corresponds to.

Format your response as follows:
original input text |<->| console.log code

Example:

how much is 100 CNY in USD |<->| console.log("100 CNY in USD:", cnyToUsd);
and how much is 100 USD in CNY |<->| console.log("100 USD in CNY:", usdToCny);
`,
  },
  {
    role: 'user',
    content: JSON.stringify({
      input: inputToAnalyze,
      code: codeToAnalyze,
    }),
  },
];


export const fixPrompt = (codeToExecute: string, error: string) => [
  {
    role: 'system',
    content: 'You are a code fixer. Fix the given JavaScript code based on the error message.' + assetPricePrompt + errorMessageAssistant,
  },
  {
    role: 'user',
    content: `The following code resulted in an error:

\`\`\`javascript
${codeToExecute}
\`\`\`

Error: ${error}

Please fix the code and return only the corrected JavaScript code.`,
  },
];

export const improvePrompt = (input: string, codeToExecute: string, logMessages: { text: string; line: number }[]) => [
  {
    role: 'system',
    content: `You are a professional code reviewer.
    The code you are reviewing is transformed from the original input.
    All iteration values from the input should be assigned to standalone variables with proper names.
    DO NOT add literal numbers, especially values from the input, in the comments.
    Review the given JavaScript code, its output, and the original input.
    Suggest improvements to make the code more correct, readable, or understandable.
    The output should be resonably detailed, but not too verbose.
    In principle, the number of console.log statements should at least match the number of lines in the input.
    You should compare the input and the output, make sure its output makes sense, point out any mistakes in the output, and make improvements to the code if necessary.
    ` + assetPricePrompt,
  },
  {
    role: 'user',
    content: `<input>
${input}
</input>
<code>
\`\`\`javascript
${codeToExecute}
\`\`\`
</code>
<output>
${logMessages.map(msg => msg.text).join('\n')}
</output>
Please review and suggest improvements to the code. Return the improved JavaScript code in a \`\`\`javascript tag.`,
  },
];
