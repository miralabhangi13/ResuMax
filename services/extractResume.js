const pdfParse=require("pdf-parse");
const mammoth=require("mammoth");
const fs=require("fs");
const path=require("path");
module.exports=async(filePath)=>{
    const extension=path.extname(filePath).toLowerCase();
    if(extension==".pdf"){
        const buffer=fs.readFileSync(filePath);
        const data=await pdfParse(buffer);
        return data.text;
    }
    if(extension==".docx"){
        const result=await mammoth.extractRawText({
            path:filePath
        })
        return result.value;
    }
}