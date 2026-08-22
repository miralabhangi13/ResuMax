if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const engine = require("ejs-mate");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const passport = require("passport");
const  GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require("passport-local");
const flash = require("connect-flash");

const User = require("./model/user");
const userRoutes = require("./routes/user");

const MD_URL = process.env.MD_URL;
const port = 1313;

app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const store = MongoStore.create({
    mongoUrl: MD_URL,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 24 * 3600
});

store.on("error", (err) => {
    console.log("Mongo Session Store Error", err);
});

const sessionOptions = {
    store: store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
};
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Session secure:", sessionOptions.cookie.secure);
app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
console.log("Google Client ID:", GOOGLE_CLIENT_ID);
console.log("Google Callback URL:", process.env.GOOGLE_CALLBACK_URL);
passport.use(new LocalStrategy({
    usernameField: "email"
}, User.authenticate()
));
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
   async function(accessToken, refreshToken, profile, done) {
    const email=profile.emails[0].value;
    let user;
    try{
        user= await User.findOne({email});
    }catch(err){
        return done(err);
    }
    if(!user){
        user=new User({
            username:profile.displayName,
            email:email,
            googleId:profile.id,
            profilePicture:profile.photos[0].value,
            verified:true
        });
        try{
            await user.save();
        }catch(err){
            return done(err);
        }
         return done(null,user);
    }
            return done(null,user);
  }
));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
    res.redirect("/home");
});


app.use((req, res, next) => {
    res.locals.error = req.flash("error");
    next();
})
app.use("/", userRoutes);
async function main() {
    await mongoose.connect(MD_URL);
    console.log("Connected to DB");

    app.listen(port, () => {
        console.log(`Server started on ${port}`);
    });
}

main().catch((err) => {
    console.log(err);
});