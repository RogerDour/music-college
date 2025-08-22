// server/models/PasswordResetToken.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const PasswordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    // ⚠️ remove the inline index here; TTL is defined below
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// TTL index: automatically remove docs when expiresAt passes
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PasswordResetToken", PasswordResetTokenSchema);
