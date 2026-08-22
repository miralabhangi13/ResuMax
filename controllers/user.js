const User = require("../model/user");
const crypto = require("crypto");
const { sendEmail, send_V_Email } = require("../utils/resend");
module.exports.newUSer = async (req, res) => {
    try {
        const { email, username, password } = req.body;

        const existingEmail = await User.findOne({ email });

        if (existingEmail) {
            return res.render("users/signup", {
                error: "An account with this email already exists. Please login."
            });
        }

        const user = new User({
            email,
            username,
            verified: false
        });

        const registeredUser = await User.register(user, password);

        const otp = crypto.randomInt(100000, 1000000);

        registeredUser.verifyOtp = otp;
        registeredUser.verifyOtpExpiry = Date.now() + 60 * 1000;
        registeredUser.verifyOtpResendAfter = Date.now() + 60 * 1000;
        registeredUser.verifyOtpAttempts = 0;
        registeredUser.resumeCount=0;
        registeredUser.highestATSScore=0;
        registeredUser.aiSuggestionCount=0;
        registeredUser.downloadCount=0;
        await registeredUser.save();

        await send_V_Email(email, otp);

        res.render("users/verify-account", {
            email
        });

    } catch (err) {
        console.log(err);

        res.render("users/signup", {
            error: "Something went wrong. Please try again."
        });
    }
};
module.exports.forgot = async (req, res) => {
    let email = req.body.email;
    let user = await User.findOne({ email });
    if (!user) {
        return res.render("users/forgot", {
            error: "Email not exists please signup"
        })
    }
    const otp = crypto.randomInt(100000, 1000000);
    user.resetOtp = otp;
    user.otpExpiry = Date.now() + 1 * 60 * 1000;
    user.resetOtpResendAfter = Date.now() + 60 * 1000;
    user.resetOtpAttempts = 0;
    user.resetVerified = false;
    user.resetVerifiedExpiry = null;
    await user.save();
    try {
        await sendEmail(email, otp);
        res.render("users/enter-otp", {
            email: email
        });
    } catch (err) {
        console.log(err);
        return res.render("users/forgot", {
            error: "Unable to send OTP. Please try again."
        });
    }
}
module.exports.login = async (req, res) => {
    res.render("dashbord/dashbord",{
        user:req.user,
        resumeCount:req.user.resumeCount,
        highestATSScore:req.user.highestATSScore,
        aiSuggestionCount:req.user.aiSuggestionCount,
        downloadCount:req.user.downloadCount
    });
}
module.exports.update_password = async (req, res) => {
    const email = req.body.email;
    const newPassword = req.body.newPassword;
    const user = await User.findOne({ email });
    if (!user) {
        return res.render("users/reset-password", {
            error: "Invalid request"
        });
    }
    if (
        !user.resetVerified ||
        !user.resetVerifiedExpiry ||
        Date.now() > user.resetVerifiedExpiry
    ) {
        user.resetVerified = false;
        user.resetVerifiedExpiry = null;

        await user.save();

        return res.render("users/forgot", {
            error: "Password reset session expired. Please request a new OTP."
        });
    }
    await user.setPassword(newPassword);
    user.resetVerified = false;
    user.resetVerifiedExpiry = null;
    user.resetOtpResendAfter = null;

    await user.save();
    res.render("users/login",{
       error: "Password updated successfully. Please login."
    })
}
module.exports.googleLogin = (req, res) => {
    res.render("dashbord/dashbord",{
        user:req.user,
        resumeCount:req.user.resumeCount,
        highestATSScore:req.user.highestATSScore,
        aiSuggestionCount:req.user.aiSuggestionCount,
        downloadCount:req.user.downloadCount
    })
};