import mongoose from "mongoose";
import { Comment } from "../models/comment.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { Video } from "../models/Video.model";

const getVideoComments = asyncHandler(async (req: Request, res: Response) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const videoComments = Comment.aggregate([
    {
      $match: { video: videoId },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
  ]);

  if (!videoComments) {
    return new ApiError(404, "No Comments found for this video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, videoComments, "Video comments fetched successfull")
    );
});

const addComment = asyncHandler(async (req: Request, res: Response) => {
  // TODO: add a comment to a video
  const videoId = req.params.videoId;
  //@ts-ignore
  const user: User = req.user;
  const comment = await Comment.create({
    owner: user._id,
    content: req.body,
    video: videoId,
  });
});

const updateComment = asyncHandler(async (req: Request, res: Response) => {
  // TODO: update a comment
  const commentId = req.query.commentId;
  const updatedContent = req.body.content;
  console.log(commentId);
  await Comment.findByIdAndUpdate(commentId, { content: updatedContent });
  res.status(201).json(new ApiResponse(201, "comment updated successfully"));
});

const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  // TODO: delete a comment
  const commentId = req.params.commentId;
  await Comment.deleteOne({ _id: commentId });
  res.status(200).json(new ApiResponse(200, "Comment deleted successfully!"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
