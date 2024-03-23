import { app } from "./app";
import "dotenv/config";
import connectDB from "./db";





const port = process.env.port || 8000;
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(` Server is running at port ${port}`);
    });
    app.on("error", (error) => {
      console.log("ERROR ", error);
    });
  })
  .catch((error) => {
    console.log("mongodb connection failed !!");
  });
