import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

//mongoose-model
import User from "../models/userModel.mjs";
import saveLogInfo from "../middleware/logger/saveLogInfo.mjs";
import Token from "../models/tokenModel.mjs";

export const createUser = async (req, res) => {
  const { username, fullname, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const defaultPicture =
    "https://raw.githubusercontent.com/nz-m/public-files/main/dp.jpg";

  const newUser = new User({
    username,
    fullname,
    email,
    password: hashedPassword,
    profilepictureurl: defaultPicture,
  });

  try {
    await newUser.save();
    if (newUser.isNew) {
      throw new Error("Failed to create account");
    }
    res.status(200).json({ message: "Account created successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const signin = async (req, res) => {
  await saveLogInfo(req, "User is attempting to sign in", "Sign in");
  try {
    const { email, password } = req.body;
    const existingUser = User.findOne({ email: email });
    if (!existingUser) {
      await saveLogInfo(req, "Email address does not exit", "Sign in");
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordCorrect) {
      await saveLogInfo(req, "User enterred incorrect password", "sign in");
      return res.status(400).json({ message: "Incorrect password" });
    }
    const payload = {
      userId: existingUser._id,
      email: existingUser.email,
    };
    const accessToken = jwt.sign(payload, process.env.SECRET, {
      expiresIn: "3h",
    });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, {
      expiresIn: "3d",
    });
    //storing both token in Token collection in database
    const newToken = new Token({
      user: existingUser._id,
      accessToken,
      refreshToken,
    });
    newToken.save();
    res.status(200).json({
      accessToken,
      refreshToken,
      accessTokenUpdatedAt: new Date().toLocaleString(),
      user: {
        _id: existingUser._id,
        username: existingUser.username,
        fullname: existingUser.fullname,
        email: existingUser.email,
        profilepictureurl: existingUser.profilepictureurl,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
