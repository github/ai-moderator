# Spam Detection Test Prompts

This directory contains example content that can be used to test the AI Spam Guard action.

## Legitimate Content Examples

### Technical Issue
```
Title: Bug in array sorting function
Body: I'm experiencing an issue with the quicksort implementation in utils.js. When I pass an array with duplicate values, the function returns incorrect results. Here's the code I'm using:

```javascript
const arr = [3, 1, 4, 1, 5, 9, 2, 6];
const sorted = quickSort(arr);
console.log(sorted); // Expected: [1, 1, 2, 3, 4, 5, 6, 9], Actual: [1, 2, 3, 4, 5, 6, 9]
```

The duplicate '1' is being removed. Any ideas what might be causing this?
```

### Feature Request
```
Title: Add dark mode support
Body: Would it be possible to add dark mode support to the application? Many users (including myself) prefer dark themes, especially when working in low-light environments. 

This could be implemented as:
- A toggle in the settings menu
- Automatic detection based on system preferences
- Separate CSS themes

I'd be happy to contribute to this feature if you're open to pull requests.
```

## Spam Content Examples

### Promotional Spam
```
Title: AMAZING OPPORTUNITY - Make Money Online!
Body: 🚀 AMAZING OPPORTUNITY! 🚀

Make $500-$2000 per day from home! No experience needed!

✅ Work from anywhere
✅ Flexible hours  
✅ Guaranteed income
✅ Free training provided

Click here now: https://suspicious-link.com/make-money
Don't miss out on this LIMITED TIME offer!

Contact me: spammer@email.com
WhatsApp: +1234567890

HURRY! Only 50 spots available!
```

### Cryptocurrency Spam
```
Title: Crypto trading signals - 90% success rate!
Body: 📈 CRYPTO TRADING SIGNALS 📈

90% SUCCESS RATE GUARANTEED!

- Bitcoin signals
- Ethereum predictions  
- Altcoin gems
- Daily profits

Join our VIP group: https://crypto-scam.com/signals
Telegram: @cryptoscammer

Limited time: 50% discount
Use code: PROFIT50

Don't miss the next bull run! 🚀🚀🚀
```

### Generic Low-Quality Spam
```
Title: hello
Body: hi there anyone know how to hack facebook account please help urgent need to access my ex girlfriend account thanks in advance please help me hack her account
```

### Template/Copy-Paste Spam
```
Title: [URGENT] Need help with [PROJECT NAME]
Body: Hello [DEVELOPER NAME],

I hope this message finds you well. I am reaching out regarding [PROJECT DESCRIPTION]. 

We are looking for experienced developers to work on [PROJECT TYPE] using [TECHNOLOGY STACK]. 

The project requirements are:
- [REQUIREMENT 1]
- [REQUIREMENT 2]  
- [REQUIREMENT 3]

Budget: [BUDGET RANGE]
Timeline: [TIMELINE]

Please contact me at [EMAIL] or visit [WEBSITE] for more details.

Best regards,
[NAME]
```

## Testing Instructions

1. Create test issues or comments with the above content
2. Run the AI Spam Guard action
3. Verify that:
   - Legitimate content has low confidence scores
   - Spam content is detected with high confidence
   - Appropriate risk factors are identified
   - Actions are taken based on configuration
