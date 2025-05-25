const { User, userSchema } = require('./schemas/Users');
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
const destinationDir = path.join(process.cwd(), 'public', 'avatars');

const signupUser = async (body) => {
  try {
    const { email, password } = body;
    const user = await User.findOne({ email });
    if (user) {
      return { statusCode: 409, message: 'Email in use' };
    }
    const avatarURL = gravatar.url(email, {
      s: '200',
      r: 'pg',
      d: 'identicon',
    });
    const createdUser = new User({ email, password, avatarURL });
    createdUser.setPass(password);
    await createdUser.save();
    return { statusCode: 201, message: createdUser };
  } catch (err) {
    console.log(err);
    return { statusCode: 400, message: `Bad Reques` };
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
console.log(destinationDir);

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