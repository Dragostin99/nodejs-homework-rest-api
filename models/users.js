const { User, userSchema } = require('./schemas/Users');
const { v4: uuidv4 } = require('uuid');
const Contact = require('./schemas/Schema');
require('dotenv').config();
require('./pass-config');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const SECRET = process.env.SECRET;
const gravatar = require('gravatar');
const multer = require('multer');
const jimp = require('jimp');
const path = require('path');
const uploadDir = path.join(process.cwd(), 'tmp');
const { authenticateEmail } = require('../models/email-sender');

const signupUser = async (req, res) => {
  try {
    const body = req.body;
    const { email, password } = body;
    const user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({ message: 'Email in use' });
    }
    const { error } = userSchema.validate(body);

    if (error) {
      console.error(error.message);
      return res.status(400).json({ message: `Bad Reques. ${error.message} ` });
    }
    const avatarURL = gravatar.url(email, {
      s: '200',
      r: 'pg',
      d: 'identicon',
    });
    const verificationToken = uuidv4();
    const createdUser = new User({
      email,
      password,
      avatarURL,
      verificationToken,
    });
    createdUser.setPass(password);
    await createdUser.save();
    authenticateEmail(email, verificationToken);

    return res.status(201).json({ message: createdUser });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: `Bad Reques` });
  }
};

const loginUser = async (body) => {
  const { email, password } = body;
  const user = await User.findOne({ email });
  const isSamePass = user.isSamePass(password);
  if (isSamePass) {
    const payload = {
      id: user.id,
      email: user.email,
      admin: false,
    };

    const token = jwt.sign(payload, SECRET, { expiresIn: '1w' });
    user.setToken(token);
    await user.save();
    return {
      statusCode: 200,
      message: {
        token,
        user: {
          email,
          subscription: user.subscription,
        },
      },
    };
  } else {
    return {
      statusCode: 401,
      message: 'Email or pass is wrong',
    };
  }
};

const auth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (!user || err) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Unauthorized',
        data: 'Unauthorized',
      });
    }
    req.user = user;
    next();
  })(req, res, next);
};

const logOutUser = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    const decodedToken = jwt.verify(token.replace('Bearer ', ''), SECRET);
    req.userId = decodedToken.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized' });
  }
};

const addUserContact = async (user, toAddContact) => {
  try {
    console.log(user, toAddContact);

    const newContact = await Contact.create({
      owner: user._id,
      ...toAddContact,
    });
    return { statusCode: 200, message: newContact };
  } catch (error) {
    console.log(error.message);
    return {
      statusCode: 400,
      message: { message: 'a required field is not ok' },
    };
  }
};

const getUserContacts = async (user) => {
  try {
    const userContacts = await Contact.find({ owner: user._id });
    return { statusCode: 200, message: userContacts };
  } catch (err) {
    return { statusCode: 401, message: err.message || 'bad request' };
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
  limits: {
    fileSize: 1048576,
  },
});

const upload = multer({
  storage: storage,
});

const updateAvatar = async (user, uploadedFile) => {
  try {
    if (!user) {
      return { statusCode: 401, message: 'Not authorized' };
    }

    const image = await jimp.read(uploadedFile.path);
    image.resize(250, 250);
    const fileExt = path.extname(uploadedFile.originalname);
    const userEmail = user.email.replace(/[^a-zA-Z0-9]/g, '') + fileExt;
    image.write('public/avatars/' + userEmail);
    user.avatarURL = '/avatars/' + userEmail;
    await user.save();
    return { statusCode: 200, message: user.avatarURL };
  } catch (err) {
    return { statusCode: 400, message: 'Bad request' };
  }
};

module.exports = {
  signupUser,
  loginUser,
  auth,
  logOutUser,
  addUserContact,
  getUserContacts,
  upload,
  updateAvatar,
};