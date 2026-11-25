const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const multer=require("multer");
require("fs").mkdirSync("uploads",{recursive:true});
module.exports.authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    // Count each auth route separately, so a normal signup/verify/login
    // sequence doesn't use up one shared allowance.
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.path}`,
    message: "Too many requests. Please try again after 15 minutes."
});
module.exports.storage=multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,"uploads/")
    },
    filename: function(req,file,cb){
        cb(null,Date.now()+"-"+file.originalname);
    }
})
module.exports.fileFilter=(req,file,cb)=>{
    const allowedTypes=[
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if(allowedTypes.includes(file.mimetype)){
        cb(null,true)
    }else{
        cb(new Error("Only pdf and DOCX are allowed"))
    }
}
module.exports.upload=multer({
    storage:module.exports.storage,
    fileFilter: module.exports.fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
})
module.exports.isLoggedIn=(req,res,next)=>{
    if(req.isAuthenticated()){
        return next();
    }
    return res.render("users/login",{
        "error":"You need to login first."
    })
}