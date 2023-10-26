const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var fetchuser = require("../middleware/fetchuser");
const jwt_secret = "this is not a secret";
const {
  sendConfirmationEmail,
  sendResetPasswordEmail,
} = require("../sendmail");
const otpGenerator = require("otp-generator");
const axios = require("axios");

router.post(
  "/signup",
  //validators
  [
    body("password", "should be atleast 8 characters").isLength({ min: 8 }),
    body("name", "enter a valid name").isLength({ min: 3 }),
    body("email", "enter a valid email").isEmail(),
  ],
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      //checking if email already exists
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        return res.status(400).json({ error: "user already exists " });
      }
      //password hashing and salting
      const salt = await bcrypt.genSalt(10);
      let secPass = await bcrypt.hash(req.body.password, salt);
      ///sending verification email
      await sendConfirmationEmail({ toUser: req.body.email });

      //creating new user
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: secPass,
      });

      //

      //authtoken
      const data = {
        user: {
          id: user.id,
        },
      };
      const authToken = jwt.sign(data, jwt_secret);
      success = true;
      let userId = user.id;
      res.json({ userId, success, authToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "internal server error" });
    }
  }
);

router.get("/try", async (req, res) => {
  res.json({ success: true });
});
router.post(
  "/login",
  [
    body("password", "should be atleast 8 characters").isLength({ min: 8 }),
    body("email", "enter a valid email").isEmail(),
  ],
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(400).json({ error: "invalid credentials" });
      }

      const passcompare = await bcrypt.compare(password, user.password);
      if (!passcompare) {
        return res.status(400).json({ error: "invalid password" });
      }

      if (user.verified !== true) {
        return res
          .status(400)
          .json({ error: "check your email and verify first" });
      }
      const data = {
        user: {
          id: user.id,
        },
      };
      const authToken = jwt.sign(data, jwt_secret);
      success = true;
      res.json({ success, authToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "internal server error" });
    }
  }
);

////forgot password
router.post(
  "/forgotpass",
  [body("email", "enter a valid email").isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email } = req.body;
    try {
      const user = await User.findOne({ email: email });
      if (!user) {
        return res.status(400).json({ error: "invalid credentials" });
      }

      const data = {
        email: user.email,
      };
      const hash = otpGenerator.generate(6, {
        upperCaseAlphabets: true,
        specialChars: true,
      });
      await sendResetPasswordEmail({ toUser: user.email, hash });
      await User.findOneAndUpdate(
        { email: req.body.email },
        { hash: hash },
        { new: true }
      );

      res.json({ data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "internal server error" });
    }
  }
);
//reset password
router.post("/reset-password", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    try {
      //verifying otp
      if (req.body.otp === user.hash) {
        //  //password hashing and salting
        const salt = await bcrypt.genSalt(10);
        let secPass = await bcrypt.hash(req.body.password, salt);

        //updating the password
        await User.findOneAndUpdate(
          { email: req.body.email },
          { password: secPass },
          { new: true }
        );

        res.json({ success: "true" });
      } else {
        res.json({ error: "otp doesnt match" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "internal server error" });
    }
  }
});

////email verification
router.get("/activate", async (req, res) => {
  try {
    let user = await User.findOneAndUpdate(
      { email: req.query.email },
      { verified: true },
      { new: true }
    );

    res.json({ success: "true" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "internal server error" });
  }
});

router.post("/getuser", fetchuser, async (req, res) => {
  try {
    let userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "internal server error" });
  }
});

router.post("/update", async (req, res) => {
  try {
    await User.findOneAndUpdate(
      { email: req.body.email },
      { name: req.body.name },
      { new: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "internal server error" });
  }
});

router.post("/captcha", async (req, res) => {
  const { token } = req.body;
  let axres = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.SECRET_KEY}&response=${token}`
  );
  if (axres.status === 200) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});
module.exports = router;
