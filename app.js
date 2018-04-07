const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const User = require('./models/user');
const mid = require('./middleware');
const port = process.env.PORT || 5000;

app.set('view engine','pug');
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
// use sessions for tracking logins
app.use(session({
	secret: 'treehouse loves you',
	resave: true,
	saveUninitialized: false
}));
// make user ID available in templates
app.use(function (req, res, next) {
	res.locals.currentUser = req.session.userId;
	next();
});
// mongodb connection
//mongoose.connect("mongodb://127.0.0.1:27017/bookworm");
mongoose.connect("mongodb://heroku_d2t99s78:jasper2018@ds059215.mlab.com:59215/heroku_d2t99s78");

var db = mongoose.connection;
// mongo error
db.on('error', console.error.bind('connection', 'connection error'));

app.get('/', (req, res, next) => {
	res.render('index');
});

app.get('/about-us', (req, res, next) => {
	res.render('about-us',{title: "About Us"});
});

app.get('/contact-us', (req, res, next) => {
	res.render('contact-us',{title: "Contact Us"});
});

app.get('/login', mid.loggedOut, (req, res, next) => {
	res.render('login',{title: "Login"});
});

app.get('/profile', mid.requiresLogin, (req, res, next) => {
	User.findById(req.session.userId).exec(function (error, user) {
		if (error) {
			return next(error);
		} else {
			return res.render('profile',{
				title: "Profile",
				name: user.name,
				favoriteBook: user.favoriteBook
			});
		}
	});
});

app.get('/register', mid.loggedOut, (req, res, next) => {
	res.render('register',{title: "Register"});
});

//Logout
app.get('/logout', function(req, res, next) {
	if(req.session) {
		//delete session object
		req.session.destroy(function(err) {
			if(err) {
				return next(err);
			} else {
				return res.redirect('/');
			}
		});
	}
});

app.post('/register', (req, res, next) => {
	var name = req.body.name;
	var email = req.body.email;
	var favoriteBook = req.body.favoriteBook;
	var password = req.body.password;
	var confirmPassword = req.body.confirmPassword;

	if(email && name && favoriteBook && password && confirmPassword){
		if(password != confirmPassword){
			var err = new Error('Passwords do not match.');
			err.status = 400;
			return next(err);
		}

		//create objectwith form input
		var userData = {
			name: name,
			email: email,
			favoriteBook: favoriteBook,
			password: password
		};

		// use schema's `create` method to insert document in Mongo
		User.create(userData, (error, user) => {
			if (error) {
				return next(error);
			} else {
				req.session.userId = user._id;
				return res.redirect('profile');
			}
		});
	}
	else
	{
		var err = new Error('All fields required!');
		err.status = 400;
		return next(err);
	}
});

app.post('/login', (req, res, next) => {
	if(req.body.email && req.body.password) {
		var email = req.body.email;
		var password = req.body.password;
		User.authenticate(email, password, function(error, user) {
			if (error || !user) {
				var err = new Error('Wrong email or password');
				err.status = 401;
				//return res.redirect('/login', err);
				return next(err);
			} else {
				req.session.userId = user._id;
				return res.redirect('/profile');
			}
		});
	} else {
		var err = new Error('Email and password are required!');
		err.status = 401;
		return next(err);
	}
});

app.use((req, res, next) => {
	const err = new Error('Not Found');
	err.status = 404;
	next(err);
});

app.use((err, req, res, next) => {
	res.locals.error = err;
	res.status(err.status);
	res.render('error');
});

app.listen(port, () => {
	console.log("The server is up and running in port "+port+"!!!");
});
