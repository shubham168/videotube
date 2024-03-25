import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { User } from "../models/User.model";

export const verifyJWT = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    try {
        const token =
          req.cookies?.accessToken ||
          req.header("Authorization")?.replace("Bearer ", "");
    
        if (!token) {
          new ApiError(401, "Unauthorized request");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    
        // @ts-ignore
        const user = await User.findById(decodedToken?._id).select(
          "-password -refreshToken"
        );
    
        if (!user) {
          new ApiError(401, "Invalid Access Token");
        }
        //@ts-ignore
        req.user = user;
        next();
    } catch (error) {
        console.error(error)
        throw new ApiError(401,  "Invalid Access Token")
    }
  }
);
