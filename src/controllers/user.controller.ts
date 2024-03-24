import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/User.model";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { ApiResponse } from "../utils/ApiResponse";

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  /**
   * 1. get a userSchema payload
   * 2. set same info in userSchema and validate
   * 3. check user is already exists : use
   * name, email
   * 4. check for images, check if avatar is present
   * 5. upload to cloudinary, avatar
   * 6. create user object - create entry into database
   * 7. remove passowrd and refresh token field from response
   * check for user creation
   * return res
   */
  const { fullName, username, email, password } = req.body;

  if (
    [fullName, username, email, password].some(
      (field: string) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All required fields are not present");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "user with email or username already exists");
  }

  // @ts-ignore
  const avatarLocalPath = req.files?.avatar[0]!.path;
  // @ts-ignore
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    //@ts-ignore
    Array.isArray(req.files?.coverImage) &&
    //@ts-ignore
    req.files.coverImage.length > 0
  ) {
    // @ts-ignore
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  const user = await User.create({
    fullName: fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || null,
    email: email,
    password: password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while regstering user");
  }

  res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

export { registerUser };
