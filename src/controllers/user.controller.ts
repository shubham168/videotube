import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/User.model";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { ApiResponse } from "../utils/ApiResponse";
import jwt from "jsonwebtoken";
import "dotenv/config";

const generateAccessAndRefreshToken = async (user: any) => {
  try {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh access token"
    );
  }
};

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

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  // req.body should have email or username and password
  // check if username or email is sent and get user from database
  // match the password field and check if it is valid
  // if correct then send access token and refresh token
  // send cookie

  const { email, username, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exists");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshToken(user);

  const options = {
    httpOnly: true,
    secure: true,
  };

  user.refreshToken = undefined;

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  await User.findByIdAndUpdate(
    //@ts-ignore
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    );
    //@ts-ignore
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } =
      await generateAccessAndRefreshToken(user);
    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json(new ApiResponse(200, user, "Token refreshed successfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(401, "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      new ApiError(400, "New password and Confirm password do not match ");
    }

    //@ts-ignore
    const user = await User.findById(req.user?.id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
      new ApiError(400, "Old password is wrong");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Password changed successfully"));
  }
);

const getCurrentUser = asyncHandler((req: Request, res: Response) => {
  return (
    res
      .status(200)
      //@ts-ignore
      .json(new ApiResponse(200, req.user, "current user fetched successfully"))
  );
});

const updateAccountDetails = asyncHandler((req: Request, res: Response) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = User.findByIdAndUpdate(
    //@ts-ignore
    req.user._id,
    { $set: { fullName, email } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req: Request, res: Response) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath!);

  if (!avatar?.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    //@ts-ignore
    req?.user._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar changed successfully"));
});

const updateUserCoverImage = asyncHandler(
  async (req: Request, res: Response) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
      new ApiError(400, "Cover Image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath!);

    if (!coverImage?.url) {
      throw new ApiError(400, "Error while uploading cover image");
    }

    const user = await User.findByIdAndUpdate(
      //@ts-ignore
      req?.user._id,
      {
        $set: { coverImage: coverImage.url },
      },
      { new: true }
    ).select("-password");

    res
      .status(200)
      .json(new ApiResponse(200, user, "Cover image changed successfully"));
  }
);
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserCoverImage,
  updateUserAvatar,
  updateAccountDetails,
};
