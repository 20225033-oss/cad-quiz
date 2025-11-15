import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  active: { type: Boolean, default: true }
});

export default mongoose.model("User", userSchema);
