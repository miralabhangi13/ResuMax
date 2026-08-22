const mongoose = require("mongoose");
const { Schema } = mongoose;
const passportLocalMongoose = require('passport-local-mongoose').default;
const userSchema = new Schema({
    username: {
        type: String,
    },
    email: {
        type: String,
        unique: true
    },
    googleId: {
        type: String,
        default: null
    },
    profilePicture: {
        type: String,
        default: null
    },
    verified: {
        type: Boolean,
        default: false
    },
    verifyOtp: {
        type: Number,
        default: null
    },
    verifyOtpExpiry: {
        type: Date,
        default: null
    },
    resetOtp: {
        type: Number,
        default: null
    },
    resetVerified: {
        type: Boolean,
        default: false
    },
    otpExpiry: {
        type: Date,
        default: null
    },
    verifyOtpResendAfter: {
        type: Date,
        default: null
    },
    resetOtpResendAfter: {
        type: Date,
        default: null
    },
    verifyOtpAttempts: {
        type: Number,
        default: 0
    },
    resetOtpAttempts: {
        type: Number,
        default: 0
    },
    resetVerifiedExpiry: {
        type: Date,
        default: null
    },
    resumeCount:{
        type:Number,
        default:null
    },
    highestATSScore:{
        type:Number,
        default:null
    },
    aiSuggestionCount:{
        type:Number,
        default:null,
    },
    downloadCount:{
        type:Number,
        default:null
    }
});

userSchema.plugin(passportLocalMongoose, {
    usernameField: "email"
});
module.exports = mongoose.model('User', userSchema);
