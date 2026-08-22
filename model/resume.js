const mongoose = require("mongoose");
const { Schema } = mongoose;
const resumeSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    resumeUrl: {
        type: String,
        required: true
    },

    publicId: {
        type: String,
        required: true
    },

    extractedText: {
        type: String,
        required: true
    },

    uploadedAt: {
        type: Date,
        default: Date.now
    },
    analysis: {
        type: Object,
        default: null
    }
});

module.exports = mongoose.model("Resume", resumeSchema);