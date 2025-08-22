const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // e.g., "private:<aUserId>:<bUserId>" or "course:<courseId>"
    roomId: { type: String, index: true, required: true },

    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // For DM messages in private rooms we store the other participant here.
    // For course/room messages this can be null.
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    text: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
