const cloudinary = require("../config/cloudinary");
const extractResume = require("../services/extractResume");
const Resume = require("../model/resume");
const axios = require("axios");
const fs = require("fs");
const { error } = require("console");
module.exports.uploadResume = async (req, res) => {
    try {
        const resumeCount = await Resume.countDocuments({
            owner: req.user._id
        });

        if (resumeCount >= 2) {
            return res.render("dashbord/upload-resume", {
                error: "You can upload a maximum of 2 resumes."
            });
        }

        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }

        const resumeText = await extractResume(req.file.path);

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "ResuMax/resumes",
            resource_type: "raw"
        });

        const resume = new Resume({
            owner: req.user._id,
            resumeUrl: result.secure_url,
            publicId: result.public_id,
            extractedText: resumeText
        });

        await resume.save();

        res.redirect(`/resume/analyze/${resume._id}`);

    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).send("Upload failed");

    } finally {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
};
module.exports.fullAnalysis = async (req, res) => {
    const resume = await Resume.findById(req.params.id);

    const role = req.body.selectedRole;
    const jobDescription = req.body.jobDescription;

    const response = await axios.post(
        `${process.env.PYTHON_API_URL}/analyze`,
        {
            resumeText: resume.extractedText,
            role: role,
            jobDescription: jobDescription
        }
    );

    resume.analysis = response.data;

    // Convert AI feedback into dashboard suggestions
    const aiSuggestions = (response.data.feedback || []).map(
        (feedback, index) => ({
            title: `Suggestion ${index + 1}`,
            description: feedback
        })
    );

    await resume.save();

    res.render("dashbord/result", {
        analysis: response.data,
        resumeId: resume.id,
        aiSuggestions: aiSuggestions
    });
};
module.exports.chatWithResume = async (req, res) => {

    try {

        const resume = await Resume.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!resume) {
            return res.status(404).json({
                error: "Resume not found"
            });
        }

        const message = req.body.message;

        console.log("Sending message to Python:", message);

        const response = await axios.post(
            `${process.env.PYTHON_API_URL}/chat`,
            {
                resumeText: resume.extractedText,
                analysis: resume.analysis,
                message: message
            }
        );

        console.log("Python response:", response.data);

        res.json({
            reply: response.data.reply
        });

    } catch (error) {

        console.error(
            "CHAT ERROR:",
            error.response?.data || error.message
        );

        res.status(500).json({
            error: "Chat failed"
        });
    }
};