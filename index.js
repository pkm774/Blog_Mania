import express from "express";
import pg from "pg"; // Postgress
import env from "dotenv";
import bcrypt from "bcrypt"; // bcrypt password hashing
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local"; // local strategy
import GoogleStrategy from "passport-google-oauth2"; // google strategy
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer"; // sending email

const hostname = "0.0.0.0";
const port = 8080;
const saltRounds = 15;

const app = express();
app.use(express.static("public"));
// For data passes by client as json
app.use(express.json());
// For data passes by client as encoded url
app.use(express.urlencoded({ extended: true }));
// Initialize environment config
env.config();

// To save users login session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to database
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

// Populate random password
const randomPass = process.env.RANDOM_PASS;
const passResetLink = process.env.PASS_RESET_LINK;

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// check if URL includes protocol
function sanitizeUrl(url) {
  if (!/^https?:\/\//i.test(url)) {
    return "http://" + url;
  }
  return url;
}

// Login GET
app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("warning.ejs", { message: "You are already logged in!" });
  } else {
    res.render("login.ejs");
  }
});

// Session
var saveSession = false;
app.post("/savesession", (req, res) => {
  saveSession = req.body.toSave;
});

// Login POST
app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.log('Server: authenticate error: ' + err);
    }
    if (user) {
      req.logIn(user, (err) => {
        if (err) {
          console.log('Server: logIn error: ' + err);
        }
        if (saveSession === "true") {
          req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
          req.session.maxAge = req.session.cookie.maxAge;
          //console.log('Session will be saved for 30 days');
        } else {
          req.session.cookie.expires = false;
          req.session.maxAge = null;
          //console.log('Session will expire when the browser is closed');
        }
        return res.redirect("/home");
      });
    } else {
      const message = info.message;
      res.render("login.ejs", { message });
    }
  })(req, res, next);
});

// Get google profile
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Login to local website after google auth
app.get(
  "/auth/google/home",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    if (saveSession === "true") {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
      req.session.maxAge = req.session.cookie.maxAge;
      //console.log('Session will be saved for 30 days');
    } else {
      req.session.cookie.expires = false;
      req.session.maxAge = null;
      //console.log('Session will expire when the browser is closed');
    }
    res.redirect("/home");
  }
);

// Logout
app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Local signup GET
app.get("/signup", async (req, res) => {
  if (req.isAuthenticated()) {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/signup");
    });
  } else {
    res.render("signup.ejs");
  }
});

// Local signup POST
app.post("/signup", async (req, res) => {
  const firstname = req.body.fname;
  const lastname = req.body.lname;
  const email = req.body.email;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.render("signup.ejs", {
        message: "User already exist Try logging in",
      });
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password, fname, lname) VALUES ($1, $2, $3, $4) RETURNING *",
            [email, hash, firstname, lastname]
          );
          const user = result.rows[0];
          req.session.user = {
            name: `${user.fname} ${user.lname}`,
            email: user.email,
          };
          req.login(user, (err) => {
            // console.log("login success");
            res.redirect("/home");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// Route for requesting a password reset
// Show password reset request form
app.get("/forgot-password", (req, res) => {
  res.render("forgotpass.ejs");
});

// Handle password reset request
app.post("/forgot-password", async (req, res) => {
  const email = req.body.email;
  const token = uuidv4();
  // Current time + 1 hour
  const expires = new Date(Date.now() + 3600000);

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      await db.query(
        "INSERT INTO password_resets (email, token, expires) VALUES ($1, $2, $3)",
        [email, token, expires]
      );
      const resetUrl = `${passResetLink}${token}`;
      // Send the email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset link for Blogging Mania",
        text: `You requested a password reset. Click the following link to reset your password: ${resetUrl}`,
        html: `<p>You requested a password reset. Click the following link to reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`,
      });
      console.log(`Password reset link: ${resetUrl}`);
    }
    res.render("forgotpass.ejs", {
      message:
        "If an account with that email exists, a password reset link has been sent. Check your email inbox/spam folder",
    });
  } catch (err) {
    console.error("Error handling password reset request:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Route for displaying the password reset form.
// Show password reset form
app.get("/reset-password/:token", async (req, res) => {
  const token = req.params.token;
  try {
    const result = await db.query(
      "SELECT * FROM password_resets WHERE token = $1 AND expires > NOW()",
      [token]
    );
    if (result.rows.length > 0) {
      res.render("resetpass.ejs", { token });
    } else {
      res.status(400).send("Password reset token is invalid or has expired.");
    }
  } catch (err) {
    console.error("Error displaying password reset form:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Handle password reset
app.post("/reset-password/:token", async (req, res) => {
  const token = req.params.token;
  if (req.body.password1 !== req.body.password2) {
    console.log("Paasword1 and Password2 do not match!");
    res.status(400).send("Paasword1 and Password2 do not match!");
    return;
  }
  const newPassword = req.body.password2;

  try {
    const result = await db.query(
      "SELECT * FROM password_resets WHERE token = $1 AND expires > $2",
      [token, new Date()]
    );
    if (result.rows.length > 0) {
      const email = result.rows[0].email;
      const hash = await bcrypt.hash(newPassword, saltRounds);
      await db.query("UPDATE users SET password = $1 WHERE email = $2", [
        hash,
        email,
      ]);
      await db.query("DELETE FROM password_resets WHERE email = $1", [email]);
      res.redirect("/login");
    } else {
      res.status(400).send("Password reset token is invalid or has expired.");
    }
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Web home page
app.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT name, title, TO_CHAR(date, 'Month DD, YYYY') AS formatted_date, id, email FROM blogs ORDER BY id ASC;"
    );
    res.render("index.ejs", { allBlogs: result.rows });
  } catch (error) {
    console.error("Server: Error database:", error);
    res.status(500).send("Server: Internal server error");
  }
});

// Using query parameters to pass additional information as key-value pairs in the URL.
app.get("/homeview", async (req, res) => {
  // Extract the blog post ID from the query parameter
  const postId = Number(req.query.postId);
  try {
    const result = await db.query(
      "SELECT id, name, title, body, TO_CHAR(date, 'DD Mon YYYY') AS formatted_date FROM blogs WHERE id=$1;",
      [postId]
    );
    // Render the view.ejs template and pass the blog post data
    res.render("view.ejs", { blog: result.rows[0] });
  } catch (error) {
    console.error("Server: Error database:", error);
    // Handle invalid post ID (e.g., show an error page)
    res.status(404).send(`Server: Blog post row with id ${postId} not found`);
    return;
  }
});

// Check if user is logined or not
app.get("/home", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const result = await db.query(
        "SELECT title, TO_CHAR(date, 'DD Mon YYYY') AS formatted_date, id, email FROM blogs WHERE email=$1 ORDER BY id ASC;",
        [req.user.email]
      );
      res.render("home.ejs", { allBlogs: result.rows, user: req.user });
    } catch (error) {
      console.error("Server: Error database:", error);
      res.status(500).send("Server: Internal server error");
    }
  } else {
    // if not then login first
    res.redirect("/login");
  }
});

// Check if user is logined or not
app.get("/create", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("create.ejs", {
      name: req.user.fname + " " + req.user.lname,
      email: req.user.email,
    });
  } else {
    // if not then login first
    res.redirect("/login");
  }
});

// Save blog content
app.post("/save", async (req, res) => {
  if (req.isAuthenticated()) {
    const blog = req.body.blog.replace(
      /href="(www\.[^\s"]+)"/g,
      (match, p1) => {
        return `href="${sanitizeUrl(p1)}"`;
      }
    );
    const d = new Date();
    var blogDate = d.getFullYear() + " " + d.getMonth() + " " + d.getDate();

    try {
      await db.query(
        "INSERT INTO blogs (name, title, body, date, email) VALUES ($1, $2, $3, $4, $5);",
        [req.body.name, req.body.title, blog, blogDate, req.body.email]
      );
      // OK Header Sent
      res.sendStatus(201);
    } catch (err) {
      console.log(err);
      res.status(500).send("Server: Cannot create new row");
    }
  } else {
    // if not then login first
    res.redirect("/login");
  }
});

// Using query parameters to pass additional information as key-value pairs in the URL.
app.get("/view", async (req, res) => {
  if (req.isAuthenticated()) {
    // Extract the blog post ID from the query parameter
    const postId = Number(req.query.postId);
    try {
      const result = await db.query(
        "SELECT id, name, title, body, TO_CHAR(date, 'DD Mon YYYY') AS formatted_date FROM blogs WHERE id=$1;",
        [postId]
      );
      // Render the view.ejs template and pass the blog post data
      res.render("view.ejs", { blog: result.rows[0] });
    } catch (error) {
      console.error("Server: Error database:", error);
      // Handle invalid post ID (e.g., show an error page)
      res.status(404).send(`Server: Blog post row with id ${postId} not found`);
      return;
    }
  } else {
    // if not then login first
    res.redirect("/login");
  }
});

// edit blog content
app.get("/edit", async (req, res) => {
  if (req.isAuthenticated()) {
    // Extract the blog post ID from the query parameter
    const postId = Number(req.query.postId);
    try {
      const result = await db.query(
        "SELECT id, name, title, body FROM blogs WHERE id=$1;",
        [postId]
      );
      // Render the edit.ejs template and pass the blog post data
      res.render("edit.ejs", { passedData: result.rows[0] });
    } catch (error) {
      console.error("Server: Error database:", error);
      // Handle invalid post ID (e.g., show an error page)
      res.status(404).send(`Server: Blog post row with id ${postId} not found`);
      return;
    }
  } else {
    // if not then login first
    res.redirect("/login");
  }
});

// Edit and save blog content
// using PATCH endpoint to update blog
app.patch("/append", async (req, res) => {
  if (req.isAuthenticated()) {
    let id = 0;
    try {
      // Get id from the query
      const appendid = Number(req.query.blogId);
      if (!appendid) {
        return res.status(400).send("Invalid Blog Id");
      }
      id = appendid;

      try {
        await db.query("UPDATE blogs SET title=$1, body=$2 WHERE id=$3;", [
          req.body.title,
          req.body.blog,
          appendid,
        ]);
      } catch (error) {
        console.log(error);
      }
      // Send a 200 status code indicating success
      res.sendStatus(200);
    } catch (error) {
      console.error(`Server: Error updating row with id ${id}:`, error);
      res.status(500).send("Server: Internal server error");
    }
  } else {
    // if not then login first
    res.redirect("/login");
  }
});

// Delet blog
app.delete("/delete", async (req, res) => {
  if (req.isAuthenticated()) {
    let id = 0;
    try {
      const deletedid = Number(req.body.id);
      if (!deletedid) {
        return res.status(400).send("Invalid Blog Id");
      }
      id = deletedid;

      try {
        await db.query("DELETE FROM blogs WHERE id=$1;", [deletedid]);
        console.log(`Server: Row having id ${deletedid} deleted.`);
        // OK Header Sent
        res.sendStatus(201);
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      console.log(`Server: Error deleting row with id ${id}:`, error);
      res.status(404).json({ error: "Blog not found" });
    }
  } else {
    // if not then login first
    res.redirect("/login");
  }
});

// About page
app.get("/about", (req, res) => {
  res.render("about.ejs");
});

// Local passport
// Set Passport to use 'useremail' instead of 'username'
passport.use(
  "local",
  new Strategy(
    { usernameField: "useremail", passwordField: "password" },
    async function verify(useremail, password, cb) {
      //console.log("Attempting to authenticate user:", useremail);
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          useremail,
        ]);

        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;

          bcrypt.compare(password, storedHashedPassword, (err, matched) => {
            if (err) {
              //console.error("Error comparing passwords:", err);
              return cb(err);
            }

            if (matched) {
              // console.log("Password matched for user:", user.email);
              return cb(null, user);
            } else {
              // console.log("Password didnt matched for user:", user.email);
              return cb(null, false, { message: "You have entered incorrect email or password" });
            }
          });
        } else {
          // console.log("User not found:", useremail);
          return cb(null, false, { message: "You have entered incorrect email or password" });
        }
      } catch (err) {
        console.log(err);
        return cb(err);
      }
    }
  )
);

// Google auth
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password, fname, lname) VALUES ($1, $2, $3, $4)",
            [profile.email, randomPass, profile.given_name, profile.family_name]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

// storing the user's data
passport.serializeUser((user, cb) => {
  cb(null, user);
});

// Get the user data
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
