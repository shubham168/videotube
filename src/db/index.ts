import mongoose from "mongoose";
import { DB_NAME } from "../constants";

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      `${process.env.DB_URI}/${DB_NAME}`
    );
    console.log("CONNECTED TO DB ==>  ", connection.connection.host);
  } catch (error) {
    console.error("SOMETHING WENT WRONG WHILE CONNECTING TO DB ", error);
    process.exit(1);
  }
};

export default connectDB;
