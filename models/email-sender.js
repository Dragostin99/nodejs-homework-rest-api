require('dotenv').config();
const domain = 'sandboxd190b0b3805b4cf09866252ec13d9c5b.mailgun.org';
const API_KEY = process.env.MAILGUN_API_KEY;
const emailTest = process.env.EMAIL_TEST 

const mailgun = require('mailgun-js')({ apiKey: API_KEY, domain: domain });


const authenticateEmail = (address, token) => {
  const data = {
    from: `Testing API <${emailTest}>`,
    to: address,
    subject: 'Hello',
    text: `Please click the following link to authenticate your email: http://localhost:5000/auth/verify/${token}`,
    html: `<html><body><h2>Please click <a href="http://localhost:5000/auth/verify/${token}" style="background-color: #0074d9; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Authenticate button</a></h2></body></html>`,
  };
  mailgun.messages().send(data, function (error, body) {
    console.log(body);
    if (error) {
      console.log(error);
    }
  });
};

module.exports = { authenticateEmail };