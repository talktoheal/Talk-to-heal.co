const Razorpay = require('razorpay');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { amount, receipt } = body;

  // amount must be in paise, and Razorpay's own minimum is 100 paise (₹1)
  if (!amount || typeof amount !== 'number' || amount < 100) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Amount must be a number, at least 100 paise (₹1)' }),
    };
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('Missing Razorpay credentials in environment variables');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured for payments' }) };
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency: 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      }),
    };
  } catch (err) {
    console.error('Razorpay create order error:', err);
    // Razorpay auth failures usually surface as statusCode 401 on the error object
    const statusCode = err && err.statusCode === 401 ? 401 : 500;
    return {
      statusCode,
      body: JSON.stringify({ error: statusCode === 401 ? 'Payment auth failed' : 'Could not create order' }),
    };
  }
};
