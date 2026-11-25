const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const userController = require("../controllers/user");
const { authLimit } = require("../middleware");
const resumeController = require("../controllers/resume")
const User = require("../model/user")
const Resume = require("../model/resume")
const { upload } = require("../middleware");
const { generateATSReportPDF } = require("../utils/pdfGenerator");
const { isLoggedIn } = require("../middleware");
const passport = require("passport");
const crypto = require("crypto")
const cloudinary = require("../config/cloudinary");
const { send_V_Email, sendEmail } = require("../utils/resend");
router.get("/home", (req, res) => {
    res.render("users/home")
})
router.get("/login", (req, res) => {
    if (req.isAuthenticated()) return res.redirect("/dashbord");
    res.render("users/login")
})
router.get("/signup", (req, res) => {
    if (req.isAuthenticated()) return res.redirect("/dashbord");
    res.render("users/signup")
})
router.post("/signup", authLimit, wrapAsync(userController.newUSer));
router.post("/login", authLimit, async (req, res, next) => {
    req.body.email = userController.cleanEmail(req.body.email);
    const user = await User.findOne({ email: req.body.email }).select("+hash +salt");
    if (!user) return next();
    if (user && user.googleId) {
        if (!user.hash || !user.salt) {
            console.log("google route reached");
            console.log({
                error: "This account was created with Google. Please continue with Google Or Forgot Password"
            })
            return res.render("users/login", {
                error: "This account was created with Google. Please continue with Google Or Forgot Password"
            });
        }
    }
    if (user && user.hash && !user.verified) {
        return res.render("users/login", {
            email: user.email,
            error: "Your email is not verified. Please verify your account.",
            showVerifyButton: true
        });
    }

    next();
},
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true
    }),
    userController.login);
router.get("/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
)
router.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    userController.googleLogin
)
router.get("/forgot-password", (req, res) => {
    res.render("users/forgot");
})
router.post("/forgot-password", authLimit, wrapAsync(userController.forgot))
router.post("/verify-otp", authLimit, wrapAsync(async (req, res) => {
    const email = userController.cleanEmail(req.body.email);
    const otp = Number(req.body.otp);
    const user = await User.findOne({ email });
    if (!user) {
        return res.render("users/forgot", {
            email,
            error: "Invalid request. Please enter your email again."
        })
    }
    if (user.resetOtpAttempts >= 5) {
        user.resetOtp = null;
        user.otpExpiry = null;
        user.resetOtpAttempts = 0;
        user.resetOtpResendAfter = null;
        user.resetVerified = false;
        user.resetVerifiedExpiry = null;
        await user.save();

        return res.render("users/forgot", {
            error: "Too many incorrect attempts. Please request a new OTP."
        });
    }
    if (user.resetOtp !== otp) {
        user.resetOtpAttempts++;
        await user.save();
        return res.render("users/enter-otp", {
            email,
            error: "Wrong otp try again."
        })
    }
    if (Date.now() > user.otpExpiry) {
        user.resetOtp = null;
        user.otpExpiry = null;
        user.resetOtpAttempts = 0;
        user.resetOtpResendAfter = null;
        user.resetVerifiedExpiry = null;
        user.resetVerified = false;

        await user.save();

        return res.render("users/enter-otp", {
            email,
            error: "OTP expired please enter new opt."
        })
    }
    user.resetVerified = true
    user.resetVerifiedExpiry = Date.now() + userController.RESET_WINDOW_MS;
    user.resetOtp = null;
    user.otpExpiry = null;
    user.resetOtpAttempts = 0;
    user.resetOtpResendAfter = null;
    // The code proves they own this email, so an unverified account becomes verified too.
    user.verified = true;
    await user.save();
    // Only this browser may set the new password.
    req.session.passwordReset = {
        email,
        expires: Date.now() + userController.RESET_WINDOW_MS
    };
    res.render("users/reset-password", {
        email,
    });
}))
router.post("/verify-account", authLimit, wrapAsync(async (req, res, next) => {
    const email = userController.cleanEmail(req.body.email);
    const otp = Number(req.body.otp);
    const user = await User.findOne({ email });
    if (!user) {
        return res.render("users/verify-account", {
            error: "Invalid request"
        })
    }
    if (user.verified) {
        return res.render("users/login", {
            error: "Alredy verified please login"
        })
    }
    if (user.verifyOtpAttempts >= 5) {
        user.verifyOtp = null;
        user.verifyOtpExpiry = null;
        user.verifyOtpAttempts = 0;
        user.verifyOtpResendAfter = null;
        await user.save();

        return res.render("users/verify-account", {
            email,
            error: "Too many incorrect attempts. Please request a new verification code."
        });
    }
    if (user.verifyOtp !== otp) {
        user.verifyOtpAttempts++;
        await user.save();

        return res.render("users/verify-account", {
            email,
            error: "Invalid otp try again"
        });
    }
    if (Date.now() > user.verifyOtpExpiry) {
        user.verifyOtp = null;
        user.verifyOtpExpiry = null;
        user.verifyOtpAttempts = 0;
        user.verifyOtpResendAfter = null;

        await user.save();

        return res.render("users/verify-account", {
            email,
            error: "Otp expired  Please click Resend Verification Code."
        })
    }
    user.verifyOtp = null;
    user.verifyOtpExpiry = null;
    user.verified = true;
    user.verifyOtpResendAfter = null;
    user.verifyOtpAttempts = 0;
    await user.save();
    req.login(user, (err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/dashbord");
    });
}))
router.post("/resend-verification-otp", authLimit, async (req, res) => {
    try {
        const email = userController.cleanEmail(req.body.email);

        const user = await User.findOne({ email });
        if (!user) {
            return res.render("users/verify-account", {
                email,
                error: "Invalid request."
            });
        }
        if (user.verified) {
            return res.render("users/login", {
                error: "Alredy verifed please login"
            })
        }
        if (user.verifyOtpResendAfter && Date.now() < user.verifyOtpResendAfter) {
            return res.render("users/verify-account", {
                email,
                error: "Please wait before submit new request"
            })
        }
        const otp = crypto.randomInt(100000, 1000000);

        user.verifyOtp = otp;
        user.verifyOtpExpiry = Date.now() + 60 * 1000;
        user.verifyOtpResendAfter = Date.now() + 60 * 1000;
        user.verifyOtpAttempts = 0;
        await user.save();

        await send_V_Email(user.email, otp);

        res.render("users/verify-account", {
            email,
            success: "A new verification OTP has been sent."
        });

    } catch (err) {
        console.log(err);

        res.render("users/verify-account", {
            email: req.body.email,
            error: "Unable to send OTP. Please try again."
        });
    }
});
router.post("/resend-otp", authLimit, async (req, res) => {
    try {
        const email = userController.cleanEmail(req.body.email);

        const user = await User.findOne({ email });

        if (!user) {
            return res.render("users/enter-otp", {
                email,
                error: "Invalid request."
            });
        }
        if (user.resetOtpResendAfter && Date.now() < user.resetOtpResendAfter) {
            return res.render("users/enter-otp", {
                email,
                error: "Please wait before submit new request"
            })
        }
        const otp = crypto.randomInt(100000, 1000000);

        user.resetOtp = otp;
        user.otpExpiry = Date.now() + 60 * 1000;
        user.resetOtpResendAfter = Date.now() + 60 * 1000;
        user.resetOtpAttempts = 0;
        await user.save();

        await sendEmail(user.email, otp);

        res.render("users/enter-otp", {
            email,
            success: "A new OTP has been sent."
        });

    } catch (err) {
        console.log(err);

        res.render("users/enter-otp", {
            email: req.body.email,
            error: "Unable to send OTP. Please try again."
        });
    }
});
router.post("/logout", isLoggedIn, (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        req.session.destroy((err) => {
            if (err) {
                return next(err);
            }

            res.clearCookie("connect.sid");
            res.redirect("/home");
        });
    });
});
router.get("/resume/upload", isLoggedIn, (req, res) => {
    res.render("dashbord/upload-resume");
})
router.get("/resume/analyze/:id", isLoggedIn, (req, res) => {
    res.render("dashbord/role", {
        resumeId: req.params.id
    });
});
router.post("/resume/upload",
    isLoggedIn,
    upload.single("resumeFile"),
    resumeController.uploadResume
)
router.get("/dashbord", isLoggedIn, async (req, res) => {

    const resumeCount = await Resume.countDocuments({
        owner: req.user._id
    });

    const resumes = await Resume.find({
        owner: req.user._id,
        "analysis.finalScore": { $exists: true }
    }).select("analysis");

    let highestATSScore = 0;

    for (const resume of resumes) {
        const score = resume.analysis?.finalScore || 0;

        if (score > highestATSScore) {
            highestATSScore = score;
        }
    }

    // Get recent resumes
    const recentResumes = await Resume.find({
        owner: req.user._id
    })
        .sort({ uploadedAt: -1 })
        .limit(5);

    // Get AI suggestions from recent resumes
    const aiSuggestions = [];

    for (const resume of recentResumes) {

        const feedback = resume.analysis?.feedback || [];

        for (const suggestion of feedback) {
            aiSuggestions.push({
                title: "AI Suggestion",
                description: suggestion,
                date: resume.uploadedAt
            });
        }
    }

    // Show only the latest 6 suggestions
    aiSuggestions.splice(6);

    let aiSuggestionCount = 0;

    for (const resume of recentResumes) {
        const feedback = resume.analysis?.feedback || [];
        aiSuggestionCount += feedback.length;
    }

    res.render("dashbord/dashbord", {
        user: req.user,
        resumeCount: resumeCount,
        highestATSScore: highestATSScore,
        aiSuggestionCount: aiSuggestionCount,
        downloadCount: req.user.downloadCount,
        recentResumes: recentResumes,
        aiSuggestions: aiSuggestions
    });
});
router.get("/resume/report/:id", isLoggedIn, async (req, res) => {
    const resume = await Resume.findOne({
        _id: req.params.id,
        owner: req.user._id
    });
    if (!resume) {
        return res.status(404).send("Resume not found");
    }
    if (!resume.analysis) {
        return res.status(404).send("No analysis available for this resume");
    }
    req.user.downloadCount = (req.user.downloadCount || 0) + 1;
    await req.user.save();
    generateATSReportPDF(resume.analysis, res);
})
router.get("/resumes", isLoggedIn, async (req, res) => {
    const resumes = await Resume.find({
        owner: req.user._id
    }).sort({
        uploadeAt: -1
    });
    res.render("dashbord/resumes", {
        user: req.user,
        resumes
    });
});
router.get("/resume/chat/:id", isLoggedIn, async (req, res) => {
    const selectedResume = await Resume.findOne({
        _id: req.params.id,
        owner: req.user._id
    });
    if (!selectedResume) {
        return res.status(404).send("Resume not found");
    }
    const resumes = await Resume.find({
        owner: req.user._id
    }).sort({ uploadedAt: -1 }).select("_id uploadedAt");
    res.render("dashbord/chat", {
        user: req.user,
        selectedResume: selectedResume,
        resumes: resumes
    });
});
router.get("/profile/edit", isLoggedIn, async (req, res) => {
    res.render("users/profile-edit", {
        user: req.user
    });
});
router.post("/profile/edit", isLoggedIn, async (req, res) => {
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
        return res.render("users/profile-edit", {
            user: req.user,
            error: "Username must be at least 3 characters."
        });
    }

    req.user.username = username.trim();

    await req.user.save();

    res.redirect("/dashbord");
});
async function renderSettings(req, res, extra = {}) {

    const resumeCount = await Resume.countDocuments({
        owner: req.user._id
    });

    const maxResumes = 2;

    const maxAiQuestions = 5;

    const aiQuestionsUsed = req.user.aiQuestionCount || 0;

    const accountCreatedDate = req.user.createdAt || req.user._id.getTimestamp();

    res.render("users/settings", {
        user: req.user,
        resumeCount: resumeCount,
        maxResumes: maxResumes,
        aiQuestionsUsed: aiQuestionsUsed,
        maxAiQuestions: maxAiQuestions,
        accountCreatedDate: accountCreatedDate,
        ...extra
    });
}
router.get("/settings", isLoggedIn, wrapAsync(async (req, res) => {
    await renderSettings(req, res);
}));
router.post("/settings/password", isLoggedIn, wrapAsync(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.user._id).select("+hash +salt");
    if (!user || !user.hash) {
        return renderSettings(req, res, {
            error: "This account has no password yet. Use Forgot Password to set one."
        });
    }
    if (!userController.isStrongPassword(newPassword)) {
        return renderSettings(req, res, { error: userController.PASSWORD_RULES });
    }
    if (newPassword !== confirmPassword) {
        return renderSettings(req, res, { error: "New passwords do not match." });
    }

    const { user: valid } = await user.authenticate(oldPassword || "");
    if (!valid) {
        return renderSettings(req, res, { error: "Current password is incorrect." });
    }

    await user.setPassword(newPassword);
    await user.save();

    return renderSettings(req, res, { success: "Password updated successfully." });
}));
router.get("/change-password", isLoggedIn, (req, res) => {
    res.redirect("/settings");
});
router.post(
    "/settings/delete-account",
    isLoggedIn,
    wrapAsync(async (req, res) => {

        const userId = req.user._id;

        // Get all resumes belonging to the user
        const resumes = await Resume.find({
            owner: userId
        });

        // Delete resumes from Cloudinary
        for (const resume of resumes) {

            if (resume.publicId) {

                try {

                    await cloudinary.uploader.destroy(
                        resume.publicId,
                        {
                            resource_type: "raw"
                        }
                    );

                    console.log(
                        "Deleted from Cloudinary:",
                        resume.publicId
                    );

                } catch (err) {

                    console.error(
                        "Cloudinary delete error:",
                        err
                    );

                }
            }
        }

        // Delete resumes from MongoDB
        await Resume.deleteMany({
            owner: userId
        });

        // Delete user
        await User.findByIdAndDelete(userId);

        // Logout
        req.logout((err) => {

            if (err) {
                return res.redirect("/home");
            }

            req.session.destroy(() => {

                res.clearCookie("connect.sid");

                res.redirect("/home");

            });

        });

    })
);
router.post("/resume/chat/:id", isLoggedIn, wrapAsync(resumeController.chatWithResume));
router.post("/update-password", authLimit, wrapAsync(userController.update_password));
router.post("/resume/analyze/:id", isLoggedIn, wrapAsync(resumeController.fullAnalysis));
router.post("/resume/delete/:id", isLoggedIn, wrapAsync(async (req, res) => {
    const resume = await Resume.findOne({
        _id: req.params.id,
        owner: req.user._id
    });
    if (!resume) {
        return res.status(404).send("Resume not found");
    }
    if (resume.publicId) {
        try {
            await cloudinary.uploader.destroy(resume.publicId, {
                resource_type: "raw"
            });
        } catch (err) {
            console.error("Cloudinary delete error:", err);
        }
    }
    await Resume.deleteOne({ _id: resume._id });
    res.redirect("/resumes");
}));
module.exports = router;