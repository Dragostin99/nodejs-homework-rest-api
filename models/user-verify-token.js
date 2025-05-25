const { User } = require('./schemas/Users');
const { authenticateEmail } = require('./email-sender');

const verificationToken = async (req, res) => {
  try {
    const verificationToken = req.params.verificationToken;
    const user = await User.findOne({ verificationToken });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }
    user.verificationToken = '';
    user.verify = true;
    await user.save();
    res.status(200).json({
      message: 'Verification successful',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const resendEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'missing required field email' });
  }
  const user = await User.findOne({ email });
  const verificationToken = user.verificationToken;
  const verify = user.verify;
  if (verify) {
    return res
      .status(400)
      .json({ message: 'Verification has already been passed' });
  }
  authenticateEmail(email, verificationToken);
  res.status(200).json({
    message: 'Verification email sent',
  });
};

module.exports = { verificationToken, resendEmail };