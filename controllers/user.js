const User = require("../model/user");
const crypto = require("crypto");
const { sendEmail, send_V_Email } = require("../utils/resend");

const OTP_TTL_MS = 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_WINDOW_MS = 15 * 60 * 1000;

const PASSWORD_RULES = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character.";

function isStrongPassword(password) {
    return typeof password === "string" &&
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password);
}

function cleanEmail(email) {
    return typeof email === "string" ? email.trim() : "";
}

function newOtp() {
    return crypto.randomInt(100000, 1000000);
}

module.exports.isStrongPassword = isStrongPassword;
module.exports.PASSWORD_RULES = PASSWORD_RULES;
module.exports.cleanEmail = cleanEmail;
module.exports.RESET_WINDOW_MS = RESET_WINDOW_MS;

// ==========================
// SIGNUP
// ==========================
module.exports.newUSer = async (req, res) => {
    const email = cleanEmail(req.body.email);
    const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
    const password = req.body.password;

    const renderSignup = (error) => res.render("users/signup", { error, email, username });

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return renderSignup("Please enter a valid email address.");
    }
    if (username.length < 3) {
        return renderSignup("Username must be at least 3 characters.");
    }
    if (!isStrongPassword(password)) {
        return renderSignup(PASSWORD_RULES);
    }

    try {
        let user = await User.findOne({ email });

        if (user && (user.verified || user.googleId)) {
            return renderSignup("An account with this email already exists. Please login.");
        }

        if (user) {
            // Unverified account from an earlier signup: let the owner of the
            // email start over. It only becomes usable after the OTP is verified.
            user.username = username;
            await user.setPassword(password);
        } else {
            user = await User.register(new User({ email, username, verified: false }), password);
            user.resumeCount = 0;
            user.highestATSScore = 0;
            user.aiSuggestionCount = 0;
            user.downloadCount = 0;
        }

        const otp = newOtp();
        user.verifyOtp = otp;
        user.verifyOtpExpiry = Date.now() + OTP_TTL_MS;
        user.verifyOtpResendAfter = Date.now() + RESEND_COOLDOWN_MS;
        user.verifyOtpAttempts = 0;
        await user.save();

        try {
            await send_V_Email(email, otp);
        } catch (err) {
            console.log("Verification email error:", err);
            user.verifyOtpResendAfter = null;
            await user.save();
            return res.render("users/verify-account", {
                email,
                error: "We couldn't send the verification code. Please click resend."
            });
        }

        return res.render("users/verify-account", { email });

    } catch (err) {
        console.log(err);
        return renderSignup("Something went wrong. Please try again.");
    }
};

// ==========================
// FORGOT PASSWORD (send reset OTP)
// ==========================
module.exports.forgot = async (req, res) => {
    const email = cleanEmail(req.body.email);
    const user = await User.findOne({ email });

    if (!user) {
        return res.render("users/forgot", {
            email,
            error: "No account found with this email. Please sign up."
        });
    }

    // A code was sent less than a minute ago: reuse it instead of sending another.
    if (user.resetOtpResendAfter && Date.now() < user.resetOtpResendAfter && user.resetOtp) {
        return res.render("users/enter-otp", {
            email,
            error: "A code was already sent. Please check your email or wait a minute to resend."
        });
    }

    const otp = newOtp();
    user.resetOtp = otp;
    user.otpExpiry = Date.now() + OTP_TTL_MS;
    user.resetOtpResendAfter = Date.now() + RESEND_COOLDOWN_MS;
    user.resetOtpAttempts = 0;
    user.resetVerified = false;
    user.resetVerifiedExpiry = null;
    await user.save();

    try {
        await sendEmail(email, otp);
        return res.render("users/enter-otp", { email });
    } catch (err) {
        console.log(err);
        user.resetOtpResendAfter = null;
        await user.save();
        return res.render("users/forgot", {
            email,
            error: "Unable to send OTP. Please try again."
        });
    }
};

// ==========================
// LOGIN SUCCESS
// ==========================
module.exports.login = (req, res) => {
    res.redirect("/dashbord");
};

// ==========================
// SET NEW PASSWORD (after reset OTP)
// ==========================
module.exports.update_password = async (req, res) => {
    const reset = req.session.passwordReset;
    const { newPassword, confirmPassword } = req.body;

    if (!reset || !reset.email || Date.now() > reset.expires) {
        delete req.session.passwordReset;
        return res.render("users/forgot", {
            error: "Password reset session expired. Please request a new OTP."
        });
    }

    const email = reset.email;
    const user = await User.findOne({ email });

    if (
        !user ||
        !user.resetVerified ||
        !user.resetVerifiedExpiry ||
        Date.now() > user.resetVerifiedExpiry
    ) {
        delete req.session.passwordReset;
        if (user) {
            user.resetVerified = false;
            user.resetVerifiedExpiry = null;
            await user.save();
        }
        return res.render("users/forgot", {
            email,
            error: "Password reset session expired. Please request a new OTP."
        });
    }

    if (!isStrongPassword(newPassword)) {
        return res.render("users/reset-password", { email, error: PASSWORD_RULES });
    }
    if (newPassword !== confirmPassword) {
        return res.render("users/reset-password", { email, error: "Passwords do not match." });
    }

    await user.setPassword(newPassword);
    user.resetVerified = false;
    user.resetVerifiedExpiry = null;
    user.resetOtpResendAfter = null;
    await user.save();

    delete req.session.passwordReset;

    res.render("users/login", {
        email,
        success: "Password updated successfully. Please login."
    });
};

module.exports.googleLogin = (req, res) => {
    res.render("dashbord/dashbord",{
        user:req.user,
        resumeCount:req.user.resumeCount,
        highestATSScore:req.user.highestATSScore,
        aiSuggestionCount:req.user.aiSuggestionCount,
        downloadCount:req.user.downloadCount
    })
};
