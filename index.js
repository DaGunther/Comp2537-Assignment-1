require("./utils.js");

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const saltRounds = 12;


const port = process.env.PORT || 8000;

const app = express();

const Joi = require("joi");

app.use(express.static("public"));

const expireTime = 1 * 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var { database } = include("databaseConnection");

const userCollection = database.db(mongodb_database).collection("users");

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
})

app.use(session({ 
  secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}
));

app.get("/", (req, res) => {
  if (req.session.user) {
    var username = req.query.user;
    console.log(username);
    var html =
    `<h1>Welcome ${username}</h1>` +
    '<form action="/members" method="get">' +
    '<button action="/members" method="get">Members Page</button></form>' +
    "<br>" +
    '<form action="/logout" method="get">' +
    '<button action="/logout" method="get">Sign out</button></form>';
    res.send(html);
  } else {
    var html =
      `<h1>Welcome</h1>` +
      '<form action="/signup" method="get">' +
      '<button action="/signup" method="get">Sign up</button></form>' +
      "<br>" +
      '<form action="/login" method="get">' +
      '<button action="/login" method="get">Log in</button></form>';
      res.send(html);
    }
  });
  
  app.get("/signup", (req, res) => {
  
    var html = `
    create user
    <form action='/signupSubmit' method='post'>
    <input name='username' type='text' placeholder='name'>
    <br>
    <input name='email' type='text' placeholder='email'>
    <br>
    <input name='password' type='text' placeholder='password'>
    <br>
    <button type='submit'>Submit</button>
    
    </form>
    `;
    res.send(html);
  });
  
  app.post("/signupSubmit", async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    
    const schema = Joi.object({
      username: Joi.string().alphanum().max(20).required(),
      password: Joi.string().max(20).required(),
    });
    
    const validationResult = schema.validate({ username, password });
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/createUser");
    return;
  }
  
  var hashedPassword = await bcrypt.hash(password, saltRounds);
  
  await userCollection.insertOne({
    username: username,
    password: hashedPassword,
  });
  console.log("User has been inserted");
  
  var html = `Welcome to Slam Dunk<br><a href="/members">Members Zones</a><a href="/logout">Logout?</a>`;
  req.session.authenticated = true;
  req.session.username = username;
  res.send(html);
});

app.get("/members", (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/");
    return;
  }
  
  let gifs = ["slamdunk.gif", "slamdunk2.gif", "slamdunk3.gif"];
  let randGif = gifs[Math.floor(Math.random() * gifs.length)];
  res.send(`Welcome<br><img src=/${randGif}>
  <br><a href='/logout'>Sign out</a>`);
});

app.get("/login", (req, res) => {
  var html = `
  <h1>Log in!</h1>
  <form action='/loginSubmit' method='post'>
  <input name='username' type='text' placeholder='username'>
  <input name='password' type='password' placeholder='password'>
  <button>Submit</button>
  </form>
  `;
  res.send(html);
});

app.post("/loginSubmit", async (req, res) => {
  
  var username = req.body.username;
  var password = req.body.password;
  
  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/login");
    return;
  }
  
  const result = await userCollection.find({username: username}).project({ username: 1, password: 1, _id: 1 }).toArray();
  
  console.log(result);
  if (result.length != 1) {
    console.log("User is not found...");
    res.redirect("/login");
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    console.log("right password");
    req.session.authenticated = true;
    req.session.username = username;
    req.session.cookie.maxAge = expireTime;
    
    res.redirect("/loggedIn");
    return;
  } else {
    console.log("wrong password");
    res.redirect("/login-wrong-password");
    return;
  }
});

app.get("/loggedin", (req, res) => {
  var html = `
  Welcome to Slam Dunk<br><a href="/members">Members Zones</a>
  <a href="/logout">Logout?</a>`;
  res.send(html);
});

app.get("/login-wrong-password", (req, res) => {
  var html = `Invalid email/password combination. 
  <br>
  <a href='/login'>Try Again</a>`;
  res.send(html);
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.send(`Logged out.
  <br><a href='/'>Home</a>`);
});

app.get("*", (req, res) => {
  res.status(404);
  res.send(`Page not found. <br><img src='/saddunk.gif'>
  <br><a href='/'>Home</a>`);
});

app.listen(port, () => {
  console.log("Node application listening on port " + port);
});
