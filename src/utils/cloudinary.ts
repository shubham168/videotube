import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadOnCloudinary = async (localFilePath: string) => {
  try {
    if (!localFilePath) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    console.log("File has been uploaded on cloudinary");
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    // remove the locally saved file
    console.error(error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (url: string) => {
  try {
    const publicId = getPublicIdFromUrl(url);
    if (!publicId) return null;
    // destroy the file on cloudinary
    const response = await cloudinary.uploader.destroy(publicId);
    // file has been destroyed successfully
    console.log("File has been uploaded on cloudinary");

    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getPublicIdFromUrl = (url: string) => {
  let publicId = url.split("/");
  return publicId[publicId.length - 1].split(".")[0];
};
export { uploadOnCloudinary, deleteFromCloudinary };
