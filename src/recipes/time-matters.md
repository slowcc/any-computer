## Cumulative Income

My daily income is $100.

What's my cumulative income since June 6?

```js
import { differenceInDays, parse } from 'date-fns';

// Define the date you want to compare to (June 6 of the current year)
const june6 = new Date(new Date().getFullYear(), 5, 6); // Month is 0-indexed (5 = June)

// Get the current date
const currentDate = new Date();

// Calculate the difference in days
const daysSinceJune6 = differenceInDays(currentDate, june6);

console.log(`Days since June 6: ${daysSinceJune6}`);

const dailyIncome = 100;

const cumulativeIncome = 100 * daysSinceJune6;

console.log(`Cumulative Income: ${cumulativeIncome}`);
```