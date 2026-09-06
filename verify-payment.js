const crypto = require('crypto');

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

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    console.error('Missing RAZORPAY_KEY_SECRET in environment variables');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured for payments' }) };
  }

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isValid = generatedSignature === razorpay_signature;

  if (!isValid) {
    // Do NOT mark as paid on a mismatch
    return { statusCode: 400, body: JSON.stringify({ verified: false, error: 'Signature mismatch' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ verified: true }) };
};
