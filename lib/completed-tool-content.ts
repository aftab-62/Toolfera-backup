import type {Tool} from './tool-definitions';
export const completedContent:Record<string,Partial<Tool>>={
  "marks-calculator": {
    "intro": "Check your marks percentage and the score needed from remaining assessments to reach a target. Enter obtained marks, completed totals and the marks still available.",
    "steps": [
      "Enter your obtained marks and the completed assessment total.",
      "Enter the remaining marks and your target overall percentage.",
      "Read your current percentage and the marks still needed."
    ],
    "help": "Current percentage is obtained marks divided by completed total, multiplied by 100. Target marks use the completed and remaining totals together. A target can be unreachable even when your current score is good; the result says so explicitly. Decimals are accepted. The estimate assumes all marks use the same weighting, and does not apply grade boundaries or rounding rules.",
    "faq": [
      {
        "question": "Can I find what I need in a final exam?",
        "answer": "Yes. Enter marks obtained so far, the completed total and the marks available in the final. Set your target overall percentage."
      },
      {
        "question": "Does this predict my letter grade?",
        "answer": "No. Letter-grade thresholds and assessment weights vary. Use the rules from your institution."
      }
    ],
    "related": [
      "percentage-calculator",
      "gpa-calculator",
      "attendance-calculator"
    ]
  },
  "attendance-calculator": {
    "intro": "Calculate attendance from classes attended and held. See how many consecutive future classes you need to attend to reach your chosen target, or how many you can miss while keeping it.",
    "steps": [
      "Enter whole numbers of classes attended and held.",
      "Choose the attendance percentage you need.",
      "Review the current percentage and future-class estimate."
    ],
    "help": "Attendance equals attended divided by held, multiplied by 100. Future-class estimates add each new class to both counts and round the required number upward. Allowed absences add classes only to the held count and round downward. Once you have missed a class, exactly 100% attendance cannot be restored by a finite number of additional classes. The estimate excludes cancelled classes, excused absences and institution-specific policies.",
    "faq": [
      {
        "question": "Does it assume I attend all future classes?",
        "answer": "Yes. The catch-up estimate assumes every additional class is attended."
      },
      {
        "question": "Why can I not recover 100% attendance?",
        "answer": "A previously missed class remains in the total. Your percentage can approach 100% but cannot equal it with a finite number of new classes."
      }
    ],
    "related": [
      "marks-calculator",
      "percentage-calculator",
      "gpa-calculator"
    ]
  },
  "university-merit-calculator": {
    "intro": "Calculate a custom weighted admission aggregate using your own component scores and percentages. Replace the example weights with your institution’s published formula.",
    "steps": [
      "Enter the obtained and total marks for each component.",
      "Set component weights so they add up to 100%; add or remove rows if needed.",
      "Read the weighted aggregate and check it against the official formula."
    ],
    "help": "Each component contributes obtained marks divided by total marks, multiplied by its weight. The contributions add into a final percentage. Up to ten components are supported. The example School, College and Admission Test rows are illustrative, not the rules of a specific university. This tool does not apply eligibility requirements, quotas, bonus marks, conversion policies or changing admission thresholds.",
    "faq": [
      {
        "question": "Are the default weights official?",
        "answer": "No. They are examples. Enter the current formula from the university you are applying to."
      },
      {
        "question": "Does the result guarantee admission?",
        "answer": "No. It calculates an aggregate only. Eligibility and selection depend on the institution’s rules."
      }
    ],
    "related": [
      "marks-calculator",
      "percentage-calculator",
      "cgpa-calculator"
    ]
  },
  "loan-emi-calculator": {
    "intro": "Estimate a fixed monthly loan payment from an amount, annual interest rate and term. See the total repayment and interest using your own inputs.",
    "steps": [
      "Enter the loan amount and annual nominal rate.",
      "Enter a whole number of repayment months and select a display currency.",
      "Review the monthly payment, total repayment and interest."
    ],
    "help": "The monthly rate is the annual rate divided by twelve. Payments follow the standard equal-payment amortization formula; a zero-interest loan divides the principal evenly over the term. Terms from one to 1,200 months are accepted. This estimate assumes a fixed rate and monthly payments at the end of each period. Fees, insurance, taxes, early repayments and lender-specific rounding are excluded. Currency selection changes the display, not an exchange rate.",
    "faq": [
      {
        "question": "Can I calculate an interest-free loan?",
        "answer": "Yes. Set the annual rate to zero and the amount is divided across the chosen months."
      },
      {
        "question": "Does it include lender fees?",
        "answer": "No. Entered principal and interest are used; fees and other charges must be assessed separately."
      }
    ],
    "related": [
      "savings-calculator",
      "salary-calculator",
      "percentage-calculator"
    ]
  },
  "savings-calculator": {
    "intro": "Project savings with an initial balance, monthly contributions and a constant annual return. Compare your contributions with the projected growth.",
    "steps": [
      "Enter the starting balance and monthly contribution.",
      "Choose a nominal annual return and a whole number of years.",
      "Review the projected balance, deposits and growth."
    ],
    "help": "Returns compound monthly at the annual nominal rate divided by twelve. Monthly contributions are added at the end of each month. A zero return simply adds all contributions to the initial balance. The projection accepts one to 100 years and rejects totals beyond safe numerical limits. Constant returns are an assumption, not a forecast; market variation, fees, taxes and inflation are excluded.",
    "faq": [
      {
        "question": "When are monthly contributions added?",
        "answer": "At the end of each month, after that month’s growth."
      },
      {
        "question": "Is the projection a promised return?",
        "answer": "No. It is a mathematical estimate using a constant rate supplied by you."
      }
    ],
    "related": [
      "loan-emi-calculator",
      "profit-calculator",
      "salary-calculator"
    ]
  },
  "profit-calculator": {
    "intro": "Calculate profit or loss from revenue and total cost. Compare profit margin on revenue with markup on cost.",
    "steps": [
      "Enter revenue and total cost in the same currency.",
      "Choose a currency label if helpful.",
      "Read the profit or loss, margin and markup."
    ],
    "help": "Profit is revenue minus cost. Margin divides profit by revenue; markup divides it by cost. A zero denominator is shown as not defined instead of an infinite percentage. Losses are supported. Include all relevant costs in your input; the tool does not infer expenses, taxes or accounting rules. Results display two decimal places and are numerical aids.",
    "faq": [
      {
        "question": "Are margin and markup the same?",
        "answer": "No. Margin is measured against revenue, while markup is measured against cost."
      },
      {
        "question": "Can I calculate a loss?",
        "answer": "Yes. Revenue below cost produces a negative profit and negative percentages when defined."
      }
    ],
    "related": [
      "discount-calculator",
      "percentage-calculator",
      "invoice-generator"
    ]
  },
  "salary-calculator": {
    "intro": "Convert hourly, daily, weekly, monthly or annual gross pay into comparable amounts. Set the working hours and paid weeks that match your schedule.",
    "steps": [
      "Enter an amount and choose its pay period.",
      "Set working hours per week and paid weeks per year.",
      "Read the annual, monthly, weekly and hourly equivalents."
    ],
    "help": "Hourly pay is multiplied by working hours and paid weeks to produce annual pay. Daily pay assumes five working days per week. Weekly pay uses the entered paid weeks; monthly pay uses twelve months. Annual amounts are divided by the relevant hours, weeks or months for equivalent figures. No tax, benefit, deduction, holiday-pay or overtime policy is applied. Currency changes the label only.",
    "faq": [
      {
        "question": "Is this take-home pay?",
        "answer": "No. It converts gross amounts before deductions."
      },
      {
        "question": "Can I account for unpaid weeks?",
        "answer": "Yes. Reduce paid weeks per year to match your schedule."
      }
    ],
    "related": [
      "loan-emi-calculator",
      "savings-calculator",
      "profit-calculator"
    ]
  },
  "remove-duplicate-lines": {
    "intro": "Keep one copy of each unique text line while preserving the first occurrence and original order. Choose whether to trim spaces, ignore case or remove blank lines.",
    "steps": [
      "Paste up to 200,000 characters, with one item per line.",
      "Choose whitespace, case and empty-line options.",
      "Remove duplicates, review the output and copy or download text."
    ],
    "help": "Line endings are normalized to newlines. With trimming enabled, leading and trailing whitespace is removed before comparison. Case-insensitive comparison uses Unicode lowercase conversion; it is not a language-aware spelling comparison. One copy of an empty line remains unless empty-line removal is enabled. No sorting or database is used. Your input remains available beside the separate result.",
    "faq": [
      {
        "question": "Will it sort my list?",
        "answer": "No. It preserves the first occurrence of each line in the order you entered."
      },
      {
        "question": "Are uppercase and lowercase entries duplicates?",
        "answer": "Only if you enable Ignore uppercase / lowercase."
      }
    ],
    "related": [
      "text-cleaner",
      "case-converter",
      "word-counter"
    ]
  },
  "text-cleaner": {
    "intro": "Tidy pasted text by trimming line edges, collapsing repeated spaces and tabs, or removing empty lines. Review the cleaned copy before using it.",
    "steps": [
      "Paste text up to 200,000 characters.",
      "Choose which spacing changes to apply.",
      "Clean the text, review the result and copy or download it."
    ],
    "help": "The cleaner normalizes CRLF and CR line endings to newlines. Trimming removes whitespace at each line edge. Collapsing replaces runs of spaces, tabs and non-breaking spaces with a single space while preserving paragraph newlines. Empty-line removal is optional and off by default. These mechanical edits can change indentation, so avoid applying them to source code or preformatted content without review. Text is not uploaded or saved.",
    "faq": [
      {
        "question": "Does it remove paragraph breaks?",
        "answer": "Not by default. Empty-line removal is optional; ordinary line breaks remain."
      },
      {
        "question": "Does it correct grammar or spelling?",
        "answer": "No. It changes whitespace only."
      }
    ],
    "related": [
      "remove-duplicate-lines",
      "word-counter",
      "case-converter"
    ]
  },
  "random-number-generator": {
    "intro": "Generate integers within an inclusive range using your browser’s cryptographic random API. Allow repeats or request a batch of unique numbers.",
    "steps": [
      "Enter the inclusive minimum and maximum.",
      "Choose a count from one to 1,000 and optionally prevent repeats.",
      "Generate, then copy or download one number per line."
    ],
    "help": "Bounds can range from minus one billion to one billion. Rejection sampling avoids modulo bias. Unique batches use bounded sampling without replacement followed by a random shuffle; they cannot request more values than the range contains. Values stay in page memory and are not logged or stored. A random output is not an official draw record or a replacement for independently audited selection procedures.",
    "faq": [
      {
        "question": "Can the minimum or maximum appear?",
        "answer": "Yes. Both bounds are included."
      },
      {
        "question": "Can a batch contain repeats?",
        "answer": "Yes by default. Enable Unique numbers to prevent repeats within that batch."
      }
    ],
    "related": [
      "password-generator",
      "uuid-generator",
      "qr-code-generator"
    ]
  },
  "invoice-generator": {
    "intro": "Create a simple downloadable PDF invoice with your details, line items, discount, tax and payment notes. Everything is prepared on your device.",
    "steps": [
      "Enter sender, recipient, invoice number and date.",
      "Add descriptions, quantities and prices; set a currency, discount and your own tax rate.",
      "Check totals, create the PDF, review it and download."
    ],
    "help": "Up to 30 line items are supported. Each quantity times unit price rounds to two decimal places, then line totals are summed. The discount is subtracted before the supplied tax percentage is applied and rounded. The PDF uses the existing local document engine with selectable text and tables. Font substitutions can affect uncommon scripts; review any warning and the downloaded file. You supply legally appropriate invoice details and rates. No payment collection, invoice database, automatic tax calculation or currency conversion is provided.",
    "faq": [
      {
        "question": "Is tax calculated automatically for my country?",
        "answer": "No. You enter the percentage. The generator does not select official tax rules or determine invoice compliance."
      },
      {
        "question": "Are invoices saved or sent to the recipient?",
        "answer": "No. They remain in this page until you download them. Tool Fera does not email invoices or store them."
      },
      {
        "question": "When is the discount applied?",
        "answer": "The discount reduces the subtotal before tax is applied."
      }
    ],
    "related": [
      "profit-calculator",
      "percentage-calculator",
      "word-to-pdf"
    ]
  }
};
