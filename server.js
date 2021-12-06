if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}

const express = require("express");
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const passport = require("passport");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const passportLocal = require("passport-local");
const cookieParser = require("cookie-parser");
const LocalStrategy = passportLocal.Strategy;

const router = express.Router();
app.use(express.json());

app.use(express.static(path.join(__dirname, "../client/build")));

app.use(
	cors({
		origin: "http://localhost:3001", // <-- location of the react app were connecting to
		credentials: true,
	})
);

app.use(express.urlencoded({ extended: false }));
app.use(
	session({
		secret: "secret",
		resave: false,
		saveUninitialized: false,
	})
);
// app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

// --------------------------------------- PASSPORT

passport.use(
	new LocalStrategy((username, password, done) => {
		pool.query(
			`SELECT * FROM users WHERE username = $1`,
			[username],
			(err, user) => {
				if (err) throw err;
				if (!user) return done(null, false);
				bcrypt.compare(password, user.rows[0].password, (err, result) => {
					if (err) throw err;
					if (result === true) {
						return done(null, user);
					} else {
						return done(null, false);
					}
				});
			}
		);
	})
);

passport.serializeUser((user, done) => {
	console.log("seri");
	done(null, user.rows[0].id);
});

// In deserializeUser that key is matched with the in memory array / database or any data resource.
// The fetched object is attached to the request object as req.user

passport.deserializeUser((id, done) => {
	console.log("deseri");

	pool.query(`SELECT * FROM users WHERE id = $1`, [id], (err, results) => {
		if (err) {
			return done(err);
		}
		console.log(results.rows[0]);
		return done(null, results.rows[0]);
	});
});

function checkAuthenticated(req, res, next) {
	console.log("checking auth");
	if (req.isAuthenticated()) {
		return res.redirect("/");
	}

	next();
}

function checkNotAuthenticated(req, res, next) {
	console.log("checking notauth");
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect("/login");
}

// const authenticateUser = (username, password, done) => {
// 	console.log(username, password);
// 	pool.query(
// 		`SELECT * FROM users WHERE username = $1`,
// 		[username],
// 		(err, results) => {
// 			if (err) {
// 				throw err;
// 			}
// 			console.log(results.rows[0]);

// 			if (results.rows.length > 0) {
// 				const user = results.rows[0];

// 				bcrypt.compare(password, user.password, (err, isMatch) => {
// 					if (err) {
// 						console.log(err);
// 					}
// 					if (isMatch) {
// 						console.log("isMatch");
// 						return done(null, user);
// 					} else {
// 						//password is incorrect
// 						return done(null, false, { message: "Password is incorrect" });
// 					}
// 				});
// 			} else {
// 				// No user
// 				return done(null, false, {
// 					message: "No user with that email address",
// 				});
// 			}
// 		}
// 	);
// };

// app.get("/login", (req, res) => {
// 	res.send("http://localhost:3000/login");
// });

app.post("/login", passport.authenticate("local"), (req, res) => {
	console.log("authenticated");
	res.send({ user: req.user.rows[0] });
});

app.get("/logout", (req, res) => {
	req.logout();
	res.send("success");
});

app.get("/currentUser", (req, res) => {
	res.send(req.user);
});

// app.get("/login", checkAuthenticated, (req, res) => {
// 	res.send("login");
// });

app.get("/dashboard", checkNotAuthenticated, (req, res) => {
	res.redirect("/login");
});

// app.get("/welcome", checkAuthenticated, (req, res) => {
// 	res.send("welcome authenticated");
// });

app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

app.listen(4001);
