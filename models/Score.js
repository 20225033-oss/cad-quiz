import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema({
  username: String,
  score: Number,
  total: Number,
  date: String
});

export default mongoose.model("Score", scoreSchema);
